'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/providers/ToastProvider'

const PLAYER_EMOJIS = ['🦊', '🐼', '🦁', '🐸', '🦋', '🐙', '🦄', '🐯', '🐻', '🐺', '🦝', '🐮']

export default function GamePage() {
    const { id } = useParams<{ id: string }>()
    const [game, setGame] = useState<any>(null)
    const [players, setPlayers] = useState<any[]>([])
    const [user, setUser] = useState<any>(null)
    const [myPlayer, setMyPlayer] = useState<any>(null)
    const [wordRevealed, setWordRevealed] = useState(false)
    const [selectedVote, setSelectedVote] = useState<string | null>(null)
    const [misterWhiteGuess, setMisterWhiteGuess] = useState('')
    const [showMisterWhiteGuess, setShowMisterWhiteGuess] = useState(false)
    const [myClue, setMyClue] = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false)
    const router = useRouter()
    const { showToast } = useToast()
    const supabase = createClient()

    useEffect(() => {
        supabase.auth.getUser().then(({ data }) => setUser(data.user))
    }, [])

    useEffect(() => {
        if (!id || !user) return

        const fetchData = async () => {
            const { data: g } = await supabase.from('games').select('*').eq('id', id).single()
            setGame(g)
            const { data: p } = await supabase.from('game_players').select('*').eq('game_id', id)
            setPlayers(p || [])
            setMyPlayer((p || []).find((pl: any) => pl.user_id === user.id))
        }

        fetchData()

        const gameSub = supabase
            .channel(`game-${id}`)
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'games', filter: `id=eq.${id}` }, (payload: any) => {
                setGame(payload.new)
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'game_players', filter: `game_id=eq.${id}` }, () => {
                supabase.from('game_players').select('*').eq('game_id', id).then(({ data }) => {
                    setPlayers(data || [])
                    setMyPlayer((data || []).find((pl: any) => pl.user_id === user?.id))
                })
            })
            .subscribe()

        return () => { supabase.removeChannel(gameSub) }
    }, [id, user])

    if (!game || !myPlayer) {
        return (
            <div className="min-h-[70vh] flex items-center justify-center">
                <div className="cartoon-spinner" />
            </div>
        )
    }

    const totalPlayers = game.turn_order?.length || 1
    const currentTurnIndex = game.current_turn_index || 0
    const currentRound = Math.floor(currentTurnIndex / totalPlayers) // 0-indexé
    const currentTurnUserId = game.turn_order?.[currentTurnIndex % totalPlayers]
    const isMyTurn = currentTurnUserId === user?.id
    const isVoting = game?.status === 'voting'
    const activePlayers = players.filter(p => !p.is_eliminated)

    // ✅ La source de vérité : est-ce que j'ai déjà soumis pour CE round ?
    const myClues: string[] = myPlayer.clues || []
    const hasSpokenThisRound = myClues.length > currentRound

    // ✅ Est-ce que j'ai déjà voté pour CE round de vote ?
    const hasVotedThisRound = !!myPlayer.vote_target

    const submitClue = async () => {
        if (!myClue.trim() || !isMyTurn || hasSpokenThisRound || isSubmitting) return
        setIsSubmitting(true)

        // Ajouter le clue à l'array en base
        await supabase
            .from('game_players')
            .update({ clues: [...myClues, myClue.trim()] })
            .eq('game_id', id)
            .eq('user_id', user.id)

        const newIndex = currentTurnIndex + 1
        const newRound = Math.floor(newIndex / totalPlayers)
        const completedAllRounds = newRound >= game.rounds_before_vote

        if (newIndex % totalPlayers === 0 && completedAllRounds) {
            // Tout le monde a parlé tous ses tours → VOTE
            await supabase.from('games').update({
                status: 'voting',
                current_turn_index: newIndex,
                vote_round: (game.vote_round || 0) + 1,
            }).eq('id', id)
        } else {
            await supabase.from('games').update({
                current_turn_index: newIndex,
                current_round: newRound + 1,
            }).eq('id', id)
        }

        setMyClue('')
        setIsSubmitting(false)
    }

    const submitVote = async () => {
        if (!selectedVote || hasVotedThisRound || isSubmitting) return
        setIsSubmitting(true)

        await supabase
            .from('game_players')
            .update({ vote_target: selectedVote })
            .eq('game_id', id)
            .eq('user_id', user.id)

        // Recharger tous les joueurs pour voir si tout le monde a voté
        const { data: allPlayers } = await supabase
            .from('game_players')
            .select('*')
            .eq('game_id', id)

        const activePl = (allPlayers || []).filter((p: any) => !p.is_eliminated)
        const votedCount = activePl.filter((p: any) => p.vote_target).length

        if (votedCount >= activePl.length) {
            await resolveVotes(allPlayers || [])
        } else {
            showToast('Vote soumis ! En attente des autres...', 'success', '🗳️')
        }

        setIsSubmitting(false)
    }

    const resolveVotes = async (allPlayers: any[]) => {
        const activePl = allPlayers.filter((p: any) => !p.is_eliminated)
        const voteCounts: Record<string, number> = {}
        activePl.forEach((p: any) => {
            if (p.vote_target) voteCounts[p.vote_target] = (voteCounts[p.vote_target] || 0) + 1
        })

        const sorted = Object.entries(voteCounts).sort((a, b) => b[1] - a[1])

        // Reset votes
        await supabase.from('game_players').update({ vote_target: null }).eq('game_id', id)

        if (sorted.length > 1 && sorted[0][1] === sorted[1][1]) {
            showToast('Égalité ! Nouveau vote ! 🔁', 'info', '⚖️')
            await supabase.from('games').update({ vote_round: (game.vote_round || 0) + 1 }).eq('id', id)
            return
        }

        const mostVotedId = sorted[0]?.[0]
        if (!mostVotedId) return

        const eliminatedPlayer = allPlayers.find((p: any) => p.user_id === mostVotedId)
        if (eliminatedPlayer?.role === 'mister_white') {
            setShowMisterWhiteGuess(true)
            return
        }

        await eliminatePlayer(mostVotedId, allPlayers)
    }

    const eliminatePlayer = async (userId: string, allPlayers?: any[]) => {
        const currentPlayers = allPlayers || players

        await supabase.from('game_players').update({ is_eliminated: true }).eq('game_id', id).eq('user_id', userId)
        // Reset clues et votes pour le prochain round
        await supabase.from('game_players').update({ clues: [], vote_target: null }).eq('game_id', id)

        const eliminated = currentPlayers.find((p: any) => p.user_id === userId)
        showToast(`${eliminated?.username} éliminé(e) ! ${eliminated?.role !== 'civilian' ? '🎉' : '😢'}`, 'info', '💀')

        const remaining = currentPlayers.filter((p: any) => !p.is_eliminated && p.user_id !== userId)
        const undercovers = remaining.filter((p: any) => p.role === 'undercover' || p.role === 'mister_white')
        const civilians = remaining.filter((p: any) => p.role === 'civilian')

        if (undercovers.length === 0) {
            await supabase.from('games').update({ status: 'finished' }).eq('id', id)
            showToast('Les civils ont gagné ! 🎉', 'success', '😇')
        } else if (undercovers.length >= civilians.length) {
            await supabase.from('games').update({ status: 'finished' }).eq('id', id)
            showToast('Les infiltrés ont gagné ! 🦹', 'success', '🦹')
        } else {
            await supabase.from('games').update({
                status: 'playing',
                current_turn_index: 0,
                current_round: 1,
            }).eq('id', id)
        }
    }

    // Watcher : si tout le monde a voté et que je suis le "resolver" (dernier par user_id)
    useEffect(() => {
        if (!isVoting || !players.length || !user) return
        const activePl = players.filter(p => !p.is_eliminated)
        const allVoted = activePl.every(p => p.vote_target)
        if (!allVoted) return

        // Éviter double résolution : seulement le joueur avec le plus grand user_id
        const resolver = [...activePl].sort((a, b) => b.user_id.localeCompare(a.user_id))[0]
        if (resolver?.user_id === user.id) {
            resolveVotes(players)
        }
    }, [players])

    const submitMisterWhiteGuess = async () => {
        const civilianWord = game?.civilian_word?.toLowerCase().trim()
        const guess = misterWhiteGuess.toLowerCase().trim()

        if (guess === civilianWord) {
            showToast('Mister White a deviné ! Il gagne ! 👻', 'info', '👻')
            await supabase.from('games').update({ status: 'finished' }).eq('id', id)
        } else {
            showToast("Mister White s'est trompé ! Éliminé !", 'info', '💀')
            const mw = players.find(p => p.role === 'mister_white' && !p.is_eliminated)
            if (mw) await eliminatePlayer(mw.user_id)
        }
        setShowMisterWhiteGuess(false)
    }

    if (game.status === 'finished') {
        return (
            <div className="min-h-[70vh] flex items-center justify-center px-6">
                <div className="text-center card-cartoon max-w-md mx-auto">
                    <div className="text-7xl mb-4 animate-bounce3d">🏆</div>
                    <h2 className="font-cartoon text-5xl mb-3" style={{ color: 'var(--text)' }}>Partie terminée !</h2>
                    <div className="flex flex-col gap-3 mt-6">
                        {players.map((p, i) => (
                            <div key={p.id} className="flex items-center justify-between p-3 rounded-xl"
                                 style={{ background: 'var(--bg-secondary)', border: '2px solid var(--border)', opacity: p.is_eliminated ? 0.5 : 1 }}>
                                <div className="flex items-center gap-2">
                                    <span className="text-xl">{PLAYER_EMOJIS[i % PLAYER_EMOJIS.length]}</span>
                                    <span className="font-bold font-body" style={{ color: 'var(--text)' }}>{p.username}</span>
                                </div>
                                <span className="px-3 py-1 rounded-full font-body text-xs font-bold"
                                      style={{ background: p.role === 'civilian' ? 'var(--accent-blue)' : p.role === 'undercover' ? 'var(--accent-pink)' : 'var(--accent-purple)', color: 'white', border: '2px solid var(--border)' }}>
                                    {p.role === 'civilian' ? '😇 Citoyen' : p.role === 'undercover' ? '🦹 Undercover' : '👻 M. White'}
                                </span>
                            </div>
                        ))}
                    </div>
                    <button onClick={() => router.push('/')} className="btn-cartoon btn-primary w-full mt-6 text-lg">
                        🏠 Retour à l&apos;accueil
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className="max-w-2xl mx-auto px-6 py-8">
            {/* Word card */}
            <div className="p-6 rounded-3xl mb-6 text-center cursor-pointer hover-lift"
                 style={{ background: 'var(--accent-blue)', border: '3px solid var(--border)', boxShadow: 'var(--shadow-xl)' }}
                 onClick={() => setWordRevealed(!wordRevealed)}>
                <p className="font-body text-sm font-bold text-white mb-1 opacity-80">
                    🔒 Ton mot secret — Touche pour {wordRevealed ? 'cacher' : 'révéler'}
                </p>
                {wordRevealed
                    ? <div className="font-cartoon text-5xl sm:text-6xl text-white" style={{ textShadow: '3px 3px 0px rgba(0,0,0,0.3)' }}>{myPlayer.word || '❓'}</div>
                    : <div className="font-cartoon text-5xl text-white opacity-50">••••••</div>}
            </div>

            {/* Turn indicator */}
            <div className="p-4 rounded-2xl mb-6 text-center"
                 style={{ background: isMyTurn && !isVoting ? 'var(--primary)' : 'var(--surface)', border: '3px solid var(--border)', boxShadow: 'var(--shadow)', animation: isMyTurn && !isVoting ? 'pulseGlow 2s ease infinite' : 'none' }}>
                {isVoting
                    ? <p className="font-cartoon text-2xl" style={{ color: 'var(--text)' }}>🗳️ Phase de vote !</p>
                    : <>
                        <p className="font-body text-xs font-bold mb-1" style={{ color: 'var(--text-secondary)' }}>
                            Manche {currentRound + 1}/{game.rounds_before_vote} • {isMyTurn ? "C'est ton tour !" : 'Tour de...'}
                        </p>
                        <p className="font-cartoon text-3xl" style={{ color: isMyTurn ? 'var(--border)' : 'var(--text)' }}>
                            {isMyTurn ? '🎤 À TOI !' : players.find(p => p.user_id === currentTurnUserId)?.username || '...'}
                        </p>
                    </>}
            </div>

            {/* Clue input */}
            {!isVoting && isMyTurn && !myPlayer.is_eliminated && !hasSpokenThisRound && (
                <div className="p-5 rounded-2xl mb-6"
                     style={{ background: 'var(--surface)', border: '3px solid var(--primary)', boxShadow: 'var(--shadow)' }}>
                    <h3 className="font-cartoon text-xl mb-1">✍️ Manche {currentRound + 1} — donne ton mot</h3>
                    <p className="font-body text-xs mb-3" style={{ color: 'var(--text-secondary)' }}>
                        {myClues.length > 0 && `Tes mots précédents : ${myClues.join(', ')}`}
                    </p>
                    <input
                        type="text"
                        value={myClue}
                        onChange={(e) => setMyClue(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && submitClue()}
                        className="input-cartoon mb-3 w-full"
                        placeholder="Ton indice..."
                        disabled={isSubmitting}
                        autoFocus
                    />
                    <button onClick={submitClue} className="btn-cartoon btn-primary w-full" disabled={!myClue.trim() || isSubmitting}>
                        {isSubmitting ? '⏳ Envoi...' : '📤 Envoyer'}
                    </button>
                </div>
            )}

            {/* En attente si j'ai déjà parlé ce round */}
            {!isVoting && !isMyTurn && !myPlayer.is_eliminated && (
                <div className="p-4 rounded-2xl mb-6 text-center"
                     style={{ background: 'var(--surface)', border: '2px dashed var(--border)' }}>
                    <p className="font-body text-sm" style={{ color: 'var(--text-secondary)' }}>
                        ⏳ En attente de <strong>{players.find(p => p.user_id === currentTurnUserId)?.username}</strong>...
                    </p>
                </div>
            )}

            {/* Players grid */}
            <div className="p-5 rounded-2xl mb-6"
                 style={{ background: 'var(--surface)', border: '3px solid var(--border)', boxShadow: 'var(--shadow)' }}>
                <h3 className="font-cartoon text-xl mb-4" style={{ color: 'var(--text)' }}>
                    👥 Joueurs ({activePlayers.length})
                </h3>
                <div className="grid grid-cols-2 gap-3">
                    {players.map((player, i) => {
                        const isCurrentTurn = player.user_id === currentTurnUserId && !isVoting
                        const isMe = player.user_id === user?.id
                        const playerClues: string[] = player.clues || []
                        return (
                            <div key={player.id} className="flex flex-col gap-1 p-3 rounded-xl transition-all"
                                 style={{
                                     background: player.is_eliminated ? 'var(--bg-secondary)' : isCurrentTurn ? 'var(--primary)' : 'var(--bg-secondary)',
                                     border: `2px solid ${isCurrentTurn ? 'var(--border)' : player.is_eliminated ? 'transparent' : 'var(--border)'}`,
                                     opacity: player.is_eliminated ? 0.4 : 1,
                                     transform: isCurrentTurn ? 'scale(1.02)' : 'scale(1)',
                                 }}>
                                <div className="flex items-center gap-2">
                                    <span className="text-2xl">{player.is_eliminated ? '💀' : PLAYER_EMOJIS[i % PLAYER_EMOJIS.length]}</span>
                                    <p className="font-bold font-body text-sm truncate" style={{ color: 'var(--text)' }}>
                                        {player.username} {isMe ? '(moi)' : ''}
                                    </p>
                                </div>
                                {/* Affichage de tous les clues empilés */}
                                {playerClues.length > 0 && !isVoting && (
                                    <div className="flex flex-col gap-0.5 ml-8">
                                        {playerClues.map((clue, ci) => (
                                            <p key={ci} className="font-body text-xs" style={{ color: 'var(--primary)' }}>
                                                💬 <span className="font-medium">{clue}</span>
                                            </p>
                                        ))}
                                    </div>
                                )}
                                <p className="font-body text-xs ml-8" style={{ color: 'var(--text-secondary)' }}>
                                    {player.is_eliminated
                                        ? `💀 ${player.role === 'civilian' ? '😇 Citoyen' : player.role === 'undercover' ? '🦹 Undercover' : '👻 M. White'}`
                                        : isVoting
                                            ? player.vote_target ? '✅ A voté' : '⏳ Vote...'
                                            : isCurrentTurn ? '🎯 Son tour !' : playerClues.length > currentRound ? '✅ A parlé' : '⏳ Patiente'}
                                </p>
                            </div>
                        )
                    })}
                </div>
            </div>

            {/* Voting section */}
            {isVoting && !myPlayer.is_eliminated && (
                <div className="p-5 rounded-2xl mb-6"
                     style={{ background: 'var(--surface)', border: '3px solid var(--accent-red)', boxShadow: '6px 6px 0px var(--accent-red)' }}>
                    <h3 className="font-cartoon text-2xl mb-4" style={{ color: 'var(--text)' }}>🗳️ Qui éliminer ?</h3>
                    {hasVotedThisRound ? (
                        <p className="font-body text-center py-4" style={{ color: 'var(--text-secondary)' }}>
                            ✅ Vote soumis ! En attente des autres...
                        </p>
                    ) : (
                        <>
                            <div className="grid grid-cols-2 gap-3 mb-4">
                                {activePlayers.filter(p => p.user_id !== user?.id).map((player, i) => (
                                    <button key={player.id} onClick={() => setSelectedVote(player.user_id)}
                                            className="flex items-center gap-3 p-3 rounded-xl transition-all text-left"
                                            style={{
                                                background: selectedVote === player.user_id ? '#FF4757' : 'var(--bg-secondary)',
                                                border: '2px solid var(--border)',
                                                color: selectedVote === player.user_id ? 'white' : 'var(--text)',
                                                transform: selectedVote === player.user_id ? 'scale(1.02)' : 'scale(1)',
                                            }}>
                                        <span className="text-2xl">{PLAYER_EMOJIS[i % PLAYER_EMOJIS.length]}</span>
                                        <span className="font-bold font-body">{player.username}</span>
                                    </button>
                                ))}
                            </div>
                            <button onClick={submitVote} disabled={!selectedVote || isSubmitting}
                                    className="btn-cartoon w-full text-lg py-3 disabled:opacity-50"
                                    style={{ background: '#FF4757', color: 'white', border: '3px solid var(--border)' }}>
                                {isSubmitting ? '⏳...' : "🗳️ Voter pour l'élimination"}
                            </button>
                        </>
                    )}
                </div>
            )}

            {/* Mister White modal */}
            {showMisterWhiteGuess && (
                <div className="fixed inset-0 flex items-center justify-center z-50 p-6" style={{ background: 'rgba(0,0,0,0.7)' }}>
                    <div className="w-full max-w-sm p-8 rounded-3xl text-center"
                         style={{ background: 'var(--surface)', border: '3px solid var(--accent-purple)', boxShadow: '8px 8px 0px var(--accent-purple)' }}>
                        <div className="text-6xl mb-4 animate-bounce3d">👻</div>
                        <h3 className="font-cartoon text-3xl mb-2" style={{ color: 'var(--text)' }}>Mister White !</h3>
                        <p className="font-body mb-4" style={{ color: 'var(--text-secondary)' }}>
                            Tu as été éliminé ! Devine le mot des civils pour gagner quand même !
                        </p>
                        <input type="text" value={misterWhiteGuess} onChange={e => setMisterWhiteGuess(e.target.value)}
                               placeholder="Ton mot..." className="input-cartoon mb-4" />
                        <button onClick={submitMisterWhiteGuess} className="btn-cartoon btn-primary w-full text-lg">
                            🎯 Je parie sur ce mot !
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}