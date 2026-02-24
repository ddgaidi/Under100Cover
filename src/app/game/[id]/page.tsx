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
  const [voting, setVoting] = useState(false)
  const [selectedVote, setSelectedVote] = useState<string | null>(null)
  const [votes, setVotes] = useState<Record<string, string>>({}) // voter_id -> target_id
  const [misterWhiteGuess, setMisterWhiteGuess] = useState('')
  const [showMisterWhiteGuess, setShowMisterWhiteGuess] = useState(false)
  const [descriptionInput, setDescriptionInput] = useState('')
  const [timeLeft, setTimeLeft] = useState(20)
  const [sending, setSending] = useState(false)
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

      const { data: p } = await supabase
        .from('game_players')
        .select('*, profiles(avatar_emoji)')
        .eq('game_id', id)
      setPlayers(p || [])

      const me = (p || []).find((pl: any) => pl.user_id === user.id)
      setMyPlayer(me)
    }

    fetchData()

    const gameSub = supabase
      .channel(`game-${id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'games', filter: `id=eq.${id}` }, async (payload: any) => {
        console.log('Game update received in game room:', payload)
        // Refetch to ensure consistency and get all fields
        const { data: g } = await supabase.from('games').select('*').eq('id', id).single()
        if (g) {
          setGame(g)
          if (g.status === 'voting') {
            setVoting(true)
            setVotes({})
            setSelectedVote(null)
          } else if (g.status !== 'voting') {
            setVoting(false)
          }
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'game_players', filter: `game_id=eq.${id}` }, () => {
        console.log('Player change received in game room')
        supabase
          .from('game_players')
          .select('*, profiles(avatar_emoji)')
          .eq('game_id', id)
          .then(({ data }) => {
            if (data) {
              setPlayers(data)
              const me = data.find((pl: any) => pl.user_id === user?.id)
              setMyPlayer(me)
            }
          })
      })
      .subscribe((status) => {
        console.log(`Game room subscription status for ${id}:`, status)
      })

    return () => { supabase.removeChannel(gameSub) }
  }, [id, user])

  const activePlayers = players.filter(p => !p.is_eliminated)
  const currentTurnUserId = game?.turn_order?.[game?.current_turn_index % (game?.turn_order?.length || 1)]
  const isMyTurn = currentTurnUserId === user?.id
  const isHost = user && game && game.host_id === user.id

  // Timer logic
  useEffect(() => {
    if (!game || game.status !== 'playing' || voting) return

    const calculateTimeLeft = () => {
      const startedAt = new Date(game.turn_started_at).getTime()
      const now = new Date().getTime()
      const diff = Math.max(0, 20 - Math.floor((now - startedAt) / 1000))
      setTimeLeft(diff)

      if (diff === 0 && isHost) {
        // Auto skip or next turn if time is up (host triggers it to avoid everyone doing it)
        // But better if the active player handles it, or anyone can? 
        // Let's have the host handle turn transitions for consistency.
        handleNextTurnAuto()
      }
    }

    calculateTimeLeft()
    const timer = setInterval(calculateTimeLeft, 1000)
    return () => clearInterval(timer)
  }, [game, voting, isHost])

  const handleNextTurnAuto = async () => {
    if (!isHost) return
    // If time is up, we move to next turn
    // We might want to clear the description of the player who skipped
    const currentTurnPlayer = players.find(p => p.user_id === currentTurnUserId)
    if (currentTurnPlayer) {
        // Optionally update their description to "Pas de mot..."
    }
    await nextTurn()
  }

  const submitDescription = async () => {
    if (!descriptionInput.trim() || !isMyTurn || sending) return
    setSending(true)
    try {
      // Update my description
      await supabase
        .from('game_players')
        .update({ description: descriptionInput.trim() })
        .eq('game_id', id)
        .eq('user_id', user.id)

      setDescriptionInput('')
      
      // Move to next turn
      // Note: In a real app, you might want a DB function to do this atomically
      await nextTurn()
    } catch (err: any) {
      showToast(err.message, 'error', '💀')
    } finally {
      setSending(false)
    }
  }

  const nextTurn = async () => {
    // We need to fetch the latest game state to avoid race conditions
    const { data: latestGame } = await supabase.from('games').select('*').eq('id', id).single()
    if (!latestGame) return

    const newIndex = latestGame.current_turn_index + 1
    const totalActivePlayers = activePlayers.length
    const newRound = Math.floor(newIndex / totalActivePlayers) + 1

    const updateData: any = {
      current_turn_index: newIndex,
      turn_started_at: new Date().toISOString(),
    }

    // Check if vote should happen
    if (newIndex > 0 && newIndex % totalActivePlayers === 0 && (newRound - 1) % latestGame.rounds_before_vote === 0) {
      updateData.status = 'voting'
    } else {
      updateData.current_round = newRound
    }

    await supabase.from('games').update(updateData).eq('id', id)
  }

  const submitVote = async () => {
    if (!selectedVote || !user) return

    const newVotes = { ...votes, [user.id]: selectedVote }
    setVotes(newVotes)

    // Check if all active non-eliminated players voted
    const activePlayers = players.filter(p => !p.is_eliminated)
    if (Object.keys(newVotes).length >= activePlayers.length) {
      // Count votes
      const voteCounts: Record<string, number> = {}

      Object.values(newVotes as Record<string, string>).forEach((v) => {
        voteCounts[v] = (voteCounts[v] || 0) + 1
      })

      // Find most voted
      const mostVoted = Object.entries(voteCounts).sort((a, b) => b[1] - a[1])[0]

      if (mostVoted) {
        // Check if mister white
        const eliminatedPlayer = players.find(p => p.user_id === mostVoted[0])
        if (eliminatedPlayer?.role === 'mister_white') {
          setShowMisterWhiteGuess(true)
          return
        }

        await eliminatePlayer(mostVoted[0])
      }
    }
    showToast('Vote soumis !', 'success', '🗳️')
  }

  const eliminatePlayer = async (userId: string) => {
    await supabase.from('game_players').update({ is_eliminated: true }).eq('game_id', id).eq('user_id', userId)

    const eliminatedPlayer = players.find(p => p.user_id === userId)
    showToast(`${eliminatedPlayer?.username} a été éliminé(e) ! ${eliminatedPlayer?.role === 'undercover' ? '🎉' : '😢'}`, 'info', '💀')

    // Check win conditions
    const remaining = players.filter(p => !p.is_eliminated && p.user_id !== userId)
    const undercovers = remaining.filter(p => p.role === 'undercover' || p.role === 'mister_white')
    const civilians = remaining.filter(p => p.role === 'civilian')

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
        turn_started_at: new Date().toISOString()
      }).eq('id', id)
      
      // Clear all descriptions for the next round
      await supabase.from('game_players').update({ description: null }).eq('game_id', id)
    }
  }

  const submitMisterWhiteGuess = async () => {
    const civilianWord = game?.civilian_word?.toLowerCase().trim()
    const guess = misterWhiteGuess.toLowerCase().trim()

    if (guess === civilianWord) {
      showToast('Mister White a deviné le mot ! Il gagne ! 👻', 'info', '👻')
      await supabase.from('games').update({ status: 'finished' }).eq('id', id)
    } else {
      showToast('Mister White s\'est trompé ! Éliminé !', 'info', '💀')
      const misterWhite = players.find(p => p.role === 'mister_white' && !p.is_eliminated)
      if (misterWhite) await eliminatePlayer(misterWhite.user_id)
    }
    setShowMisterWhiteGuess(false)
  }

  if (!game || !myPlayer) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="cartoon-spinner" />
      </div>
    )
  }

  if (game.status === 'finished') {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-6">
        <div className="text-center card-cartoon max-w-md mx-auto">
          <div className="text-7xl mb-4 animate-bounce3d">🏆</div>
          <h2 className="font-cartoon text-5xl mb-3" style={{ color: 'var(--text)' }}>Partie terminée !</h2>
          <div className="flex flex-col gap-3 mt-6">
            {players.map((p, i) => (
              <div
                key={p.id}
                className="flex items-center justify-between p-3 rounded-xl"
                style={{
                  background: 'var(--bg-secondary)',
                  border: '2px solid var(--border)',
                  opacity: p.is_eliminated ? 0.5 : 1,
                }}
              >
                <div className="flex items-center gap-2">
                  <span className="text-xl">{p.profiles?.avatar_emoji || PLAYER_EMOJIS[i % PLAYER_EMOJIS.length]}</span>
                  <span className="font-bold font-body" style={{ color: 'var(--text)' }}>{p.username}</span>
                </div>
                <span
                  className="px-3 py-1 rounded-full font-body text-xs font-bold"
                  style={{
                    background: p.role === 'civilian' ? 'var(--accent-blue)' : p.role === 'undercover' ? 'var(--accent-pink)' : 'var(--accent-purple)',
                    color: 'white',
                    border: '2px solid var(--border)',
                  }}
                >
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
      {/* My word card */}
      <div
        className="p-6 rounded-3xl mb-6 text-center cursor-pointer hover-lift"
        style={{
          background: myPlayer.role === 'civilian' ? 'var(--accent-blue)' : myPlayer.role === 'undercover' ? 'var(--accent-pink)' : 'var(--accent-purple)',
          border: '3px solid var(--border)',
          boxShadow: 'var(--shadow-xl)',
        }}
        onClick={() => setWordRevealed(!wordRevealed)}
      >
        <p className="font-body text-sm font-bold text-white mb-1 opacity-80">
          {myPlayer.role === 'civilian' ? '😇 Citoyen' : myPlayer.role === 'undercover' ? '🦹 Undercover' : '👻 Mister White'}
          {' '}— Touche pour {wordRevealed ? 'cacher' : 'révéler'}
        </p>
        {wordRevealed ? (
          <div className="font-cartoon text-5xl sm:text-6xl text-white" style={{ textShadow: '3px 3px 0px rgba(0,0,0,0.3)' }}>
            {myPlayer.role === 'mister_white' ? '❓' : myPlayer.word}
          </div>
        ) : (
          <div className="font-cartoon text-5xl text-white opacity-50">
            ••••••
          </div>
        )}
      </div>

      {/* Turn indicator */}
      <div
        className="p-4 rounded-2xl mb-6 text-center"
        style={{
          background: isMyTurn ? 'var(--primary)' : 'var(--surface)',
          border: `3px solid ${isMyTurn ? 'var(--border)' : 'var(--border)'}`,
          boxShadow: 'var(--shadow)',
          animation: isMyTurn ? 'pulseGlow 2s ease infinite' : 'none',
        }}
      >
        {voting ? (
          <p className="font-cartoon text-2xl" style={{ color: 'var(--text)' }}>
            🗳️ Phase de vote !
          </p>
        ) : (
          <>
            <div className="flex justify-between items-center mb-1">
              <p className="font-body text-xs font-bold" style={{ color: 'var(--text-secondary)' }}>
                Tour {game.current_round} • {isMyTurn ? 'C\'est ton tour !' : 'Tour de...'}
              </p>
              <div 
                className={`px-3 py-1 rounded-full font-cartoon text-sm border-2 ${timeLeft <= 5 ? 'animate-pulse bg-red-500 text-white' : 'bg-white text-border'}`}
                style={{ borderColor: 'var(--border)' }}
              >
                ⏱️ {timeLeft}s
              </div>
            </div>
            <p className="font-cartoon text-3xl" style={{ color: isMyTurn ? 'var(--border)' : 'var(--text)' }}>
              {isMyTurn ? '🎤 À TOI !' : `${players.find(p => p.user_id === currentTurnUserId)?.username || '...'}`}
            </p>

            {isMyTurn && (
              <div className="mt-4 flex gap-2">
                <input
                  type="text"
                  value={descriptionInput}
                  onChange={(e) => setDescriptionInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && submitDescription()}
                  placeholder="Décris ton mot..."
                  className="input-cartoon flex-1"
                  autoFocus
                />
                <button
                  onClick={submitDescription}
                  disabled={!descriptionInput.trim() || sending}
                  className="btn-cartoon btn-pink py-2"
                >
                  {sending ? '⏳' : 'Envoyer'}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Players grid */}
      <div
        className="p-5 rounded-2xl mb-6"
        style={{
          background: 'var(--surface)',
          border: '3px solid var(--border)',
          boxShadow: 'var(--shadow)',
        }}
      >
        <h3 className="font-cartoon text-xl mb-4" style={{ color: 'var(--text)' }}>
          👥 Joueurs actifs ({activePlayers.length})
        </h3>
        <div className="grid grid-cols-2 gap-3">
          {players.map((player, i) => {
            const isCurrentTurn = player.user_id === currentTurnUserId && !voting
            const isMe = player.user_id === user?.id
            return (
              <div
                key={player.id}
                className="flex items-center gap-3 p-3 rounded-xl transition-all"
                style={{
                  background: player.is_eliminated ? 'var(--bg-secondary)' : isCurrentTurn ? 'var(--primary)' : 'var(--bg-secondary)',
                  border: `2px solid ${isCurrentTurn ? 'var(--border)' : player.is_eliminated ? 'transparent' : 'var(--border)'}`,
                  opacity: player.is_eliminated ? 0.4 : 1,
                  boxShadow: isCurrentTurn ? 'var(--shadow)' : 'none',
                  transform: isCurrentTurn ? 'scale(1.02)' : 'scale(1)',
                }}
              >
                <span className="text-2xl">{player.is_eliminated ? '💀' : player.profiles?.avatar_emoji || PLAYER_EMOJIS[i % PLAYER_EMOJIS.length]}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex justify-between items-start">
                    <p className="font-bold font-body text-sm truncate" style={{ color: 'var(--text)' }}>
                      {player.username} {isMe ? '(moi)' : ''}
                    </p>
                    {player.description && !player.is_eliminated && (
                      <span className="font-body text-[10px] px-2 py-0.5 rounded-lg bg-white border border-border italic truncate max-w-[80px]">
                        "{player.description}"
                      </span>
                    )}
                  </div>
                  <p className="font-body text-xs" style={{ color: 'var(--text-secondary)' }}>
                    {player.is_eliminated ? '💀 Éliminé' : isCurrentTurn ? '🎤 Parle !' : '🎧 Écoute'}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Voting section */}
      {voting && (
        <div
          className="p-5 rounded-2xl mb-6"
          style={{
            background: 'var(--surface)',
            border: '3px solid var(--accent-red)',
            boxShadow: '6px 6px 0px var(--accent-red)',
          }}
        >
          <h3 className="font-cartoon text-2xl mb-4" style={{ color: 'var(--text)' }}>
            🗳️ Qui éliminer ?
          </h3>
          <div className="grid grid-cols-2 gap-3 mb-4">
            {activePlayers
              .filter(p => p.user_id !== user?.id)
              .map((player, i) => (
                <button
                  key={player.id}
                  onClick={() => setSelectedVote(player.user_id)}
                  className="flex items-center gap-3 p-3 rounded-xl transition-all text-left"
                  style={{
                    background: selectedVote === player.user_id ? '#FF4757' : 'var(--bg-secondary)',
                    border: `2px solid ${selectedVote === player.user_id ? 'var(--border)' : 'var(--border)'}`,
                    color: selectedVote === player.user_id ? 'white' : 'var(--text)',
                    transform: selectedVote === player.user_id ? 'scale(1.02)' : 'scale(1)',
                  }}
                >
                  <span className="text-2xl">{player.profiles?.avatar_emoji || PLAYER_EMOJIS[i % PLAYER_EMOJIS.length]}</span>
                  <span className="font-bold font-body">{player.username}</span>
                </button>
              ))}
          </div>
          <button
            onClick={submitVote}
            disabled={!selectedVote}
            className="btn-cartoon w-full text-lg py-3 disabled:opacity-50"
            style={{
              background: '#FF4757',
              color: 'white',
              border: '3px solid var(--border)',
            }}
          >
            🗳️ Voter pour l&apos;élimination
          </button>
        </div>
      )}

      {/* Mister White guess modal */}
      {showMisterWhiteGuess && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50 p-6"
          style={{ background: 'rgba(0,0,0,0.7)' }}
        >
          <div
            className="w-full max-w-sm p-8 rounded-3xl text-center"
            style={{
              background: 'var(--surface)',
              border: '3px solid var(--accent-purple)',
              boxShadow: '8px 8px 0px var(--accent-purple)',
            }}
          >
            <div className="text-6xl mb-4 animate-bounce3d">👻</div>
            <h3 className="font-cartoon text-3xl mb-2" style={{ color: 'var(--text)' }}>
              Mister White !
            </h3>
            <p className="font-body mb-4" style={{ color: 'var(--text-secondary)' }}>
              Tu as été éliminé ! Devine le mot des civils pour gagner quand même !
            </p>
            <input
              type="text"
              value={misterWhiteGuess}
              onChange={e => setMisterWhiteGuess(e.target.value)}
              placeholder="Ton mot..."
              className="input-cartoon mb-4"
            />
            <button onClick={submitMisterWhiteGuess} className="btn-cartoon btn-primary w-full text-lg">
              🎯 Je parie sur ce mot !
            </button>
          </div>
        </div>
      )}

      {/* Host controls */}
      {isHost && !voting && (
        <button
          onClick={nextTurn}
          className="btn-cartoon btn-primary text-lg py-4 w-full"
        >
          ➡️ Tour suivant
        </button>
      )}
    </div>
  )
}
