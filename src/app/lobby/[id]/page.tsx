'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/providers/ToastProvider'
import { generateTurnOrder, getRandomWordPair, getMaxUndercovers, getMaxMisterWhites } from '@/lib/game/utils'

export default function LobbyPage() {
    const { id } = useParams<{ id: string }>()
    const [game, setGame] = useState<any>(null)
    const [players, setPlayers] = useState<any[]>([])
    const [user, setUser] = useState<any>(null)
    const [loading, setLoading] = useState(false)
    const [copied, setCopied] = useState(false)
    const router = useRouter()
    const { showToast } = useToast()
    const supabase = createClient()

    useEffect(() => {
        supabase.auth.getUser().then(({ data }) => setUser(data.user))
    }, [])

    useEffect(() => {
        if (!id || !user) return // on attend que l'user soit défini

        const fetchData = async () => {
            const { data: g } = await supabase.from('games').select('*').eq('id', id).single()
            setGame(g)
            // on redirige seulement si le jeu est en "playing"
            if (g?.status === 'playing') {
                router.replace(`/game/${id}`)
            }

            const { data: p } = await supabase.from('game_players').select('*').eq('game_id', id)
            setPlayers(p || [])
        }

        fetchData()

        // Realtime subscription
        const gameSub = supabase
            .channel(`lobby-${id}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'games', filter: `id=eq.${id}` }, (payload: any) => {
                setGame(payload.new)
                if (payload.new.status === 'playing') {
                    router.replace(`/game/${id}`) // replace pour éviter de empiler l'historique
                }
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'game_players', filter: `game_id=eq.${id}` }, () => {
                supabase.from('game_players').select('*').eq('game_id', id).then(({ data }) => setPlayers(data || []))
            })
            .subscribe()

        return () => { supabase.removeChannel(gameSub) }
    }, [id, user])

    const isHost = user && game && game.host_id === user.id

    const copyCode = () => {
        navigator.clipboard.writeText(game.code)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
        showToast('Code copié !', 'success', '📋')
    }

    const startGame = async () => {
        if (players.length < 3) {
            showToast('Il faut au moins 3 joueurs !', 'error', '😅')
            return
        }
        setLoading(true)
        try {
            // Assign roles
            const shuffled = [...players].sort(() => Math.random() - 0.5)
            const wordPair = getRandomWordPair()
            const assignments = shuffled.map((p, i) => {
                let role: string
                let word: string
                if (i < game.mister_white_count) {
                    role = 'mister_white'
                    word = ''
                } else if (i < game.mister_white_count + game.undercover_count) {
                    role = 'undercover'
                    word = wordPair.undercover
                } else {
                    role = 'civilian'
                    word = wordPair.civilian
                }
                return { ...p, role, word }
            })

            // Update each player
            for (const player of assignments) {
                await supabase
                    .from('game_players')
                    .update({ role: player.role, word: player.word })
                    .eq('id', player.id)
            }

            // Generate turn order
            const turnOrder = generateTurnOrder(assignments)

            // Update game status
            await supabase.from('games').update({
                status: 'playing',
                civilian_word: wordPair.civilian,
                undercover_word: wordPair.undercover,
                turn_order: turnOrder,
                current_round: 1,
                current_turn_index: 0,
            }).eq('id', id)

            showToast('La partie commence ! 🎭', 'success', '🚀')
        } catch (err: any) {
            showToast(err.message, 'error', '💀')
        } finally {
            setLoading(false)
        }
    }

    if (!game) {
        return (
            <div className="min-h-[70vh] flex items-center justify-center">
                <div className="cartoon-spinner" />
            </div>
        )
    }

    const PLAYER_EMOJIS = ['🦊', '🐼', '🦁', '🐸', '🦋', '🐙', '🦄', '🐯', '🐻', '🐺', '🦝', '🐮']

    return (
        <div className="max-w-2xl mx-auto px-6 py-12">
            {/* Header */}
            <div className="text-center mb-8">
                <h1 className="font-cartoon text-5xl mb-2" style={{ color: 'var(--text)' }}>
                    Salle d&apos;attente 🎭
                </h1>
                <p className="font-body" style={{ color: 'var(--text-secondary)' }}>
                    Attends que tout le monde rejoigne...
                </p>
            </div>

            {/* Game code - big display */}
            <div
                className="p-6 rounded-3xl mb-6 text-center cursor-pointer hover-lift"
                onClick={copyCode}
                style={{
                    background: 'var(--primary)',
                    border: '3px solid var(--border)',
                    boxShadow: 'var(--shadow-xl)',
                }}
            >
                <p className="font-body text-sm font-bold mb-2" style={{ color: 'var(--border)' }}>
                    📤 Code de la partie — Clique pour copier
                </p>
                <div className="font-cartoon text-7xl tracking-[0.3em]" style={{ color: 'var(--border)' }}>
                    {game.code}
                </div>
                {copied && (
                    <div className="mt-2 font-body text-sm font-bold animate-pop" style={{ color: 'var(--border)' }}>
                        ✅ Copié !
                    </div>
                )}
            </div>

            {/* Game settings */}
            <div
                className="p-5 rounded-2xl mb-6"
                style={{
                    background: 'var(--surface)',
                    border: '3px solid var(--border)',
                    boxShadow: 'var(--shadow)',
                }}
            >
                <h3 className="font-cartoon text-xl mb-3" style={{ color: 'var(--text)' }}>
                    ⚙️ Paramètres
                </h3>
                <div className="grid grid-cols-2 gap-3">
                    {[
                        { emoji: '👥', label: 'Max joueurs', value: game.max_players },
                        { emoji: '🔄', label: 'Tours/vote', value: game.rounds_before_vote },
                        { emoji: '🦹', label: 'Undercovers', value: game.undercover_count },
                        { emoji: '👻', label: 'Mister White', value: game.mister_white_count },
                    ].map(({ emoji, label, value }) => (
                        <div
                            key={label}
                            className="flex items-center gap-2 p-3 rounded-xl"
                            style={{ background: 'var(--bg-secondary)', border: '2px solid var(--border)' }}
                        >
                            <span className="text-xl">{emoji}</span>
                            <div>
                                <p className="font-body text-xs" style={{ color: 'var(--text-secondary)' }}>{label}</p>
                                <p className="font-cartoon text-lg" style={{ color: 'var(--text)' }}>{value}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Players */}
            <div
                className="p-5 rounded-2xl mb-6"
                style={{
                    background: 'var(--surface)',
                    border: '3px solid var(--border)',
                    boxShadow: 'var(--shadow)',
                }}
            >
                <div className="flex items-center justify-between mb-4">
                    <h3 className="font-cartoon text-xl" style={{ color: 'var(--text)' }}>
                        👥 Joueurs ({players.length}/{game.max_players})
                    </h3>
                    {/* Progress */}
                    <span
                        className="px-3 py-1 rounded-full font-body text-xs font-bold"
                        style={{
                            background: players.length >= 3 ? 'var(--accent-green)' : 'var(--accent-orange)',
                            color: 'white',
                            border: '2px solid var(--border)',
                        }}
                    >
            {players.length >= 3 ? '✅ Prêt' : `Besoin de ${3 - players.length} joueur(s)`}
          </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    {players.map((player, i) => (
                        <div
                            key={player.id}
                            className="flex items-center gap-3 p-3 rounded-xl animate-pop"
                            style={{
                                background: 'var(--bg-secondary)',
                                border: `2px solid ${player.user_id === game.host_id ? 'var(--accent-pink)' : 'var(--border)'}`,
                                animationDelay: `${i * 0.1}s`,
                            }}
                        >
                            <span className="text-2xl">{PLAYER_EMOJIS[i % PLAYER_EMOJIS.length]}</span>
                            <div className="min-w-0">
                                <p className="font-bold font-body text-sm truncate" style={{ color: 'var(--text)' }}>
                                    {player.username}
                                </p>
                                {player.user_id === game.host_id && (
                                    <span className="font-body text-xs" style={{ color: 'var(--accent-pink)' }}>👑 Hôte</span>
                                )}
                            </div>
                        </div>
                    ))}

                    {/* Empty slots */}
                    {Array.from({ length: game.max_players - players.length }).map((_, i) => (
                        <div
                            key={`empty-${i}`}
                            className="flex items-center gap-3 p-3 rounded-xl opacity-40"
                            style={{
                                background: 'var(--bg-secondary)',
                                border: '2px dashed var(--border)',
                            }}
                        >
                            <span className="text-2xl">👤</span>
                            <span className="font-body text-sm" style={{ color: 'var(--text-secondary)' }}>
                En attente...
              </span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Start button (host only) */}
            {isHost ? (
                <button
                    onClick={startGame}
                    disabled={loading || players.length < 3}
                    className="btn-cartoon btn-pink text-xl py-4 w-full disabled:opacity-50"
                >
                    {loading ? '⏳ Démarrage...' : '🚀 Lancer la partie !'}
                </button>
            ) : (
                <div
                    className="text-center p-4 rounded-2xl"
                    style={{
                        background: 'var(--bg-secondary)',
                        border: '2px dashed var(--border)',
                    }}
                >
                    <p className="font-cartoon text-lg animate-pulse" style={{ color: 'var(--text-secondary)' }}>
                        ⏳ En attente que l&apos;hôte lance la partie...
                    </p>
                </div>
            )}
        </div>
    )
}
