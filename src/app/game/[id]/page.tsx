'use client'

import { useState, useEffect, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/providers/ToastProvider'

const PLAYER_EMOJIS = ['🦊','🐼','🦁','🐸','🦋','🐙','🦄','🐯','🐻','🐺','🦝','🐮']

export default function GamePage() {
    const { id } = useParams<{ id: string }>()
    const router = useRouter()
    const supabase = createClient()
    const { showToast } = useToast()

    const [game, setGame] = useState<any>(null)
    const [players, setPlayers] = useState<any[]>([])
    const [user, setUser] = useState<any>(null)
    const [myPlayer, setMyPlayer] = useState<any>(null)

    const [wordRevealed, setWordRevealed] = useState(false)
    const [myClue, setMyClue] = useState('')
    const [hasSpoken, setHasSpoken] = useState(false)

    const [voting, setVoting] = useState(false)
    const [selectedVote, setSelectedVote] = useState<string | null>(null)
    const [votes, setVotes] = useState<Record<string,string>>({})
    const [hasVoted, setHasVoted] = useState(false)

    const [showMisterWhiteGuess, setShowMisterWhiteGuess] = useState(false)
    const [misterWhiteGuess, setMisterWhiteGuess] = useState('')

    /* =========================
       AUTH
    ==========================*/
    useEffect(() => {
        supabase.auth.getUser().then(({ data }) => {
            setUser(data.user)
        })
    }, [])

    /* =========================
       FETCH + REALTIME
    ==========================*/
    useEffect(() => {
        if (!id || !user) return

        const fetchData = async () => {
            const { data: g } = await supabase.from('games').select('*').eq('id', id).single()
            const { data: p } = await supabase.from('game_players').select('*').eq('game_id', id)

            setGame(g)
            setPlayers(p || [])
            setMyPlayer((p || []).find(pl => pl.user_id === user.id))
        }

        fetchData()

        const channel = supabase
            .channel(`game-${id}`)
            .on('postgres_changes',
                { event:'UPDATE', schema:'public', table:'games', filter:`id=eq.${id}` },
                payload => {
                    setGame(payload.new)
                    setVoting(payload.new.status === 'voting')
                    if (payload.new.status !== 'voting') {
                        setVotes({})
                        setSelectedVote(null)
                        setHasVoted(false)
                    }
                }
            )
            .on('postgres_changes',
                { event:'*', schema:'public', table:'game_players', filter:`game_id=eq.${id}` },
                async () => {
                    const { data } = await supabase.from('game_players').select('*').eq('game_id', id)
                    setPlayers(data || [])
                    setMyPlayer((data || []).find(pl => pl.user_id === user.id))
                }
            )
            .subscribe()

        return () => { supabase.removeChannel(channel) }

    }, [id, user])

    /* =========================
       DERIVED VALUES
    ==========================*/
    const activePlayers = useMemo(
        () => players.filter(p => !p.is_eliminated),
        [players]
    )

    const totalPlayers = game?.turn_order?.length || 1

    const currentTurnUserId = useMemo(() => {
        if (!game?.turn_order) return null
        return game.turn_order[
        game.current_turn_index % totalPlayers
            ]
    }, [game, totalPlayers])

    const isMyTurn = currentTurnUserId === user?.id

    /* Reset speak state when turn changes */
    useEffect(() => {
        if (!isMyTurn) {
            setHasSpoken(false)
            setMyClue('')
        }
    }, [currentTurnUserId])

    /* =========================
       TURN ADVANCE (CORE LOGIC)
    ==========================*/
    const advanceTurn = async () => {
        if (!game) return

        const newIndex = game.current_turn_index + 1
        const newRound = Math.floor(newIndex / totalPlayers) + 1

        await supabase.from('games').update({
            current_turn_index: newIndex,
            current_round: newRound,
        }).eq('id', id)
    }

    /* =========================
       SUBMIT CLUE
    ==========================*/
    const submitClue = async () => {
        if (!myClue.trim() || !isMyTurn || hasSpoken) return

        await supabase.from('game_players')
            .update({ clue: myClue })
            .eq('game_id', id)
            .eq('user_id', user.id)

        setHasSpoken(true)
        setMyClue('')
        await advanceTurn()
    }

    /* =========================
       VOTE
    ==========================*/
    const submitVote = async () => {
        if (!selectedVote || hasVoted) return
        setHasVoted(true)

        const newVotes = { ...votes, [user.id]: selectedVote }
        setVotes(newVotes)

        if (Object.keys(newVotes).length < activePlayers.length) return

        const count: Record<string, number> = {}
        Object.values(newVotes).forEach(v => {
            const key = v as string
            count[key] = (count[key] || 0) + 1
        })

        const sorted = Object.entries(count).sort((a,b)=>b[1]-a[1])

        if (sorted.length > 1 && sorted[0][1] === sorted[1][1]) {
            showToast('Égalité ! Nouveau vote ! 🔁','info','⚖️')
            setVotes({})
            setHasVoted(false)
            return
        }

        await eliminatePlayer(sorted[0][0])
        showToast('Vote terminé !','success','🗳️')
    }

    /* =========================
       ELIMINATION
    ==========================*/
    const eliminatePlayer = async (userId:string) => {
        await supabase.from('game_players')
            .update({ is_eliminated:true })
            .eq('game_id', id)
            .eq('user_id', userId)

        await supabase.from('game_players')
            .update({ clue:null })
            .eq('game_id', id)

        const remaining = players.filter(p => !p.is_eliminated && p.user_id !== userId)
        const undercovers = remaining.filter(p => p.role !== 'civilian')
        const civilians = remaining.filter(p => p.role === 'civilian')

        if (undercovers.length === 0 || undercovers.length >= civilians.length) {
            await supabase.from('games')
                .update({ status:'finished' })
                .eq('id', id)
            return
        }

        await supabase.from('games')
            .update({ status:'playing', current_turn_index:0 })
            .eq('id', id)
    }

    /* =========================
       MISTER WHITE
    ==========================*/
    const submitMisterWhiteGuess = async () => {
        const civilianWord = game?.civilian_word?.toLowerCase().trim()
        const guess = misterWhiteGuess.toLowerCase().trim()

        if (guess === civilianWord) {
            await supabase.from('games').update({ status:'finished' }).eq('id', id)
            showToast('Mister White gagne ! 👻','info','👻')
        } else {
            const mw = players.find(p => p.role === 'mister_white' && !p.is_eliminated)
            if (mw) await eliminatePlayer(mw.user_id)
        }

        setShowMisterWhiteGuess(false)
    }

    /* =========================
       LOADING
    ==========================*/
    if (!game || !myPlayer) {
        return (
            <div className="min-h-[70vh] flex items-center justify-center">
                <div className="cartoon-spinner" />
            </div>
        )
    }

    /* =========================
       RENDER
    ==========================*/
    return (
        <div className="max-w-2xl mx-auto px-6 py-8">

            {/* Secret Word */}
            <div
                className="p-6 rounded-3xl mb-6 text-center cursor-pointer"
                style={{
                    background:'var(--accent-blue)',
                    border:'3px solid var(--border)'
                }}
                onClick={()=>setWordRevealed(!wordRevealed)}
            >
                {wordRevealed
                    ? <div className="text-5xl text-white">{myPlayer.word || '❓'}</div>
                    : <div className="text-5xl text-white opacity-50">••••••</div>
                }
            </div>

            {/* Turn */}
            <div className="p-4 rounded-2xl mb-6 text-center"
                 style={{ background:isMyTurn?'var(--primary)':'var(--surface)' }}
            >
                {voting
                    ? <p>🗳️ Phase de vote</p>
                    : <p>{isMyTurn ? '🎤 À toi !' : 'Tour en cours...'}</p>
                }
            </div>

            {/* Input */}
            {!voting && isMyTurn && !myPlayer.is_eliminated && (
                <div className="mb-6">
                    <input
                        value={myClue}
                        onChange={e=>setMyClue(e.target.value)}
                        placeholder="Ton indice..."
                        className="input-cartoon w-full mb-3"
                    />
                    <button
                        onClick={submitClue}
                        disabled={!myClue.trim()}
                        className="btn-cartoon btn-primary w-full"
                    >
                        Envoyer
                    </button>
                </div>
            )}

        </div>
    )
}