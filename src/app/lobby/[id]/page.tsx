'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/providers/ToastProvider'
import { generateTurnOrder, getRandomWordPair } from '@/lib/game/utils'

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

    // 1. Récupérer l'utilisateur au montage
    useEffect(() => {
        supabase.auth.getUser().then(({ data }) => setUser(data.user))
    }, [supabase])

    // 2. Fonction de rafraîchissement des données (mémoïsée pour éviter les boucles)
    const refreshData = useCallback(async () => {
        if (!id) return

        // Récupérer le jeu
        const { data: g } = await supabase.from('games').select('*').eq('id', id).single()
        if (g) {
            setGame(g)
            if (g.status === 'playing') router.push(`/game/${id}`)
        }

        // Récupérer les joueurs avec leurs profils
        const { data: p } = await supabase
            .from('game_players')
            .select('*, profiles(avatar_emoji)')
            .eq('game_id', id)
            .order('joined_at', { ascending: true })

        if (p) setPlayers(p)
    }, [id, supabase, router])

    // 3. Logique principale : Rejoindre et Souscrire
    useEffect(() => {
        if (!id || !user) return

        const setupLobby = async () => {
            // Étape A : S'assurer que l'utilisateur est bien dans la table game_players
            const { data: existing } = await supabase
                .from('game_players')
                .select('id')
                .eq('game_id', id)
                .eq('user_id', user.id)
                .maybeSingle()

            if (!existing) {
                // Récupérer le pseudo depuis le profil si possible
                const { data: profile } = await supabase.from('profiles').select('username').eq('id', user.id).single()

                await supabase.from('game_players').insert({
                    game_id: id,
                    user_id: user.id,
                    username: profile?.username || user.user_metadata?.username || 'Anonyme'
                })
            }

            // Étape B : Chargement initial
            await refreshData()

            // Étape C : Temps réel (Un seul canal pour tout)
            const channel = supabase
                .channel(`lobby_room_${id}`)
                .on(
                    'postgres_changes',
                    { event: '*', schema: 'public', table: 'games', filter: `id=eq.${id}` },
                    (payload: any) => {
                        setGame(payload.new)
                        if (payload.new.status === 'playing') router.push(`/game/${id}`)
                    }
                )
                .on(
                    'postgres_changes',
                    { event: '*', schema: 'public', table: 'game_players', filter: `game_id=eq.${id}` },
                    () => {
                        refreshData() // On rafraîchit la liste complète pour avoir les jointures profiles
                    }
                )
                .subscribe()

            return () => {
                supabase.removeChannel(channel)
            }
        }

        setupLobby()
    }, [id, user, supabase, refreshData, router])

    const isHost = user && game && game.host_id === user.id

    const copyCode = () => {
        if (!game?.code) return
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
                return { id: p.id, role, word }
            })

            // Update rôles des joueurs
            for (const player of assignments) {
                await supabase
                    .from('game_players')
                    .update({ role: player.role, word: player.word })
                    .eq('id', player.id)
            }

            // Update statut du jeu (déclenche la redirection chez les autres)
            await supabase.from('games').update({
                status: 'playing',
                civilian_word: wordPair.civilian,
                undercover_word: wordPair.undercover,
                turn_order: generateTurnOrder(players),
                current_round: 1,
                current_turn_index: 0,
                turn_started_at: new Date().toISOString(),
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

            {/* Code Display */}
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

            {/* Config Panel */}
            <div className="p-5 rounded-2xl mb-6" style={{ background: 'var(--surface)', border: '3px solid var(--border)' }}>
                <h3 className="font-cartoon text-xl mb-3">⚙️ Paramètres</h3>
                <div className="grid grid-cols-2 gap-3">
                    {[
                        { emoji: '👥', label: 'Max joueurs', value: game.max_players },
                        { emoji: '🔄', label: 'Tours/vote', value: game.rounds_before_vote },
                        { emoji: '🦹', label: 'Undercovers', value: game.undercover_count },
                        { emoji: '👻', label: 'Mister White', value: game.mister_white_count },
                    ].map(({ emoji, label, value }) => (
                        <div key={label} className="flex items-center gap-2 p-3 rounded-xl" style={{ background: 'var(--bg-secondary)', border: '2px solid var(--border)' }}>
                            <span className="text-xl">{emoji}</span>
                            <div>
                                <p className="font-body text-xs" style={{ color: 'var(--text-secondary)' }}>{label}</p>
                                <p className="font-cartoon text-lg">{value}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Players List */}
            <div className="p-5 rounded-2xl mb-6" style={{ background: 'var(--surface)', border: '3px solid var(--border)' }}>
                <div className="flex items-center justify-between mb-4">
                    <h3 className="font-cartoon text-xl">👥 Joueurs ({players.length}/{game.max_players})</h3>
                    <span className={`px-3 py-1 rounded-full font-body text-xs font-bold border-2 border-black text-white ${players.length >= 3 ? 'bg-green-500' : 'bg-orange-500'}`}>
            {players.length >= 3 ? '✅ Prêt' : `Besoin de ${3 - players.length} joueur(s)`}
          </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    {players.map((p, i) => (
                        <div key={p.id} className="flex items-center gap-3 p-3 rounded-xl border-2 border-black bg-white">
                            <span className="text-2xl">{p.profiles?.avatar_emoji || PLAYER_EMOJIS[i % PLAYER_EMOJIS.length]}</span>
                            <div className="min-w-0">
                                <p className="font-bold font-body text-sm truncate">{p.username}</p>
                                {p.user_id === game.host_id && <span className="text-[10px] text-pink-500 font-bold uppercase">👑 Hôte</span>}
                            </div>
                        </div>
                    ))}

                    {/* Slots vides */}
                    {Array.from({ length: Math.max(0, game.max_players - players.length) }).map((_, i) => (
                        <div key={`empty-${i}`} className="flex items-center gap-3 p-3 rounded-xl opacity-30 border-2 border-dashed border-gray-400">
                            <span className="text-2xl">👤</span>
                            <span className="font-body text-xs text-gray-500">En attente...</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Action Button */}
            {isHost ? (
                <button
                    onClick={startGame}
                    disabled={loading || players.length < 3}
                    className="btn-cartoon btn-pink text-xl py-4 w-full disabled:opacity-50"
                >
                    {loading ? '⏳ Démarrage...' : '🚀 Lancer la partie !'}
                </button>
            ) : (
                <div className="text-center p-4 rounded-2xl border-2 border-dashed border-gray-400">
                    <p className="font-cartoon text-lg animate-pulse text-gray-500">⏳ En attente de l&apos;hôte...</p>
                </div>
            )}
        </div>
    )
}