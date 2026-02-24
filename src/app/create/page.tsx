'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { generateGameCode, getMaxUndercovers, getMaxMisterWhites } from '@/lib/game/utils'
import { useToast } from '@/components/providers/ToastProvider'
import Link from 'next/link'

export default function CreatePage() {
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [checkingAuth, setCheckingAuth] = useState(true)

  // Game settings
  const [maxPlayers, setMaxPlayers] = useState(8)
  const [roundsBeforeVote, setRoundsBeforeVote] = useState(2)
  const [undercoverCount, setUndercoverCount] = useState(2)
  const [misterWhiteCount, setMisterWhiteCount] = useState(1)

  const router = useRouter()
  const { showToast } = useToast()
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      setUser(data.user)
      if (data.user) {
        const { data: p } = await supabase.from('profiles').select('*').eq('id', data.user.id).single()
        setProfile(p)
      }
      setCheckingAuth(false)
    })
  }, [])

  const maxUndercovers = getMaxUndercovers(maxPlayers)
  const maxMisterWhites = getMaxMisterWhites(maxPlayers, undercoverCount)

  const handleCreate = async () => {
    let currentUser = user
    let currentProfile = profile

    // Double check auth if state is not set yet
    if (!currentUser) {
      const { data } = await supabase.auth.getUser()
      currentUser = data.user
      if (currentUser && !currentProfile) {
        const { data: p } = await supabase.from('profiles').select('*').eq('id', currentUser.id).single()
        currentProfile = p
      }
    }

    if (!currentUser || !currentProfile) {
      showToast('Tu dois être connecté !', 'error', '🔐')
      return
    }
    setLoading(true)
    try {
      const code = generateGameCode()
      const { data: game, error } = await supabase.from('games').insert({
        code,
        host_id: currentUser.id,
        status: 'waiting',
        max_players: maxPlayers,
        rounds_before_vote: roundsBeforeVote,
        undercover_count: undercoverCount,
        mister_white_count: misterWhiteCount,
        current_round: 0,
        current_turn_index: 0,
        turn_order: [],
      }).select().single()

      if (error) throw error

      // Join as host
      await supabase.from('game_players').insert({
        game_id: game.id,
        user_id: currentUser.id,
        username: currentProfile.username,
        is_eliminated: false,
      })

      showToast(`Partie créée ! Code: ${code}`, 'success', '⚡')
      router.push(`/lobby/${game.id}`)
    } catch (err: any) {
      showToast(err.message, 'error', '💀')
    } finally {
      setLoading(false)
    }
  }

  if (checkingAuth) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="cartoon-spinner" />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-6">
        <div className="text-center card-cartoon max-w-sm mx-auto">
          <div className="text-6xl mb-4 animate-bounce3d">🔐</div>
          <h2 className="font-cartoon text-3xl mb-3" style={{ color: 'var(--text)' }}>
            Connexion requise
          </h2>
          <p className="font-body mb-6" style={{ color: 'var(--text-secondary)' }}>
            Tu dois être connecté pour créer une partie !
          </p>
          <Link href="/auth" className="btn-cartoon btn-pink w-full text-center">
            🎮 Se connecter
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-12">
      <div className="text-center mb-10">
        <div
          className="w-20 h-20 mx-auto mb-4 flex items-center justify-center text-4xl rounded-2xl animate-bounce3d"
          style={{
            background: 'var(--accent-pink)',
            border: '3px solid var(--border)',
            boxShadow: 'var(--shadow)',
          }}
        >
          ⚡
        </div>
        <h1 className="font-cartoon text-5xl mb-2" style={{ color: 'var(--text)' }}>
          Créer une partie
        </h1>
        <p className="font-body" style={{ color: 'var(--text-secondary)' }}>
          Configure ta partie et invite tes amis !
        </p>
      </div>

      <div
        className="p-8 rounded-3xl"
        style={{
          background: 'var(--surface)',
          border: '3px solid var(--border)',
          boxShadow: 'var(--shadow-xl)',
        }}
      >
        <div className="flex flex-col gap-8">
          {/* Max players */}
          <SliderSetting
            emoji="👥"
            label="Nombre de joueurs max"
            value={maxPlayers}
            min={3}
            max={12}
            onChange={(v) => {
              setMaxPlayers(v)
              setUndercoverCount(Math.min(undercoverCount, getMaxUndercovers(v)))
              setMisterWhiteCount(Math.min(misterWhiteCount, getMaxMisterWhites(v, undercoverCount)))
            }}
            color="var(--accent-blue)"
          />

          {/* Rounds before vote */}
          <SliderSetting
            emoji="🔄"
            label="Tours avant vote"
            value={roundsBeforeVote}
            min={1}
            max={5}
            onChange={setRoundsBeforeVote}
            color="var(--accent-orange)"
          />

          {/* Undercovers */}
          <SliderSetting
            emoji="🦹"
            label="Nombre d'undercovers"
            value={undercoverCount}
            min={1}
            max={maxUndercovers}
            onChange={(v) => {
              setUndercoverCount(v)
              setMisterWhiteCount(Math.min(misterWhiteCount, getMaxMisterWhites(maxPlayers, v)))
            }}
            color="var(--accent-pink)"
          />

          {/* Mister White */}
          <SliderSetting
            emoji="👻"
            label="Nombre de Mister White"
            value={misterWhiteCount}
            min={0}
            max={maxMisterWhites}
            onChange={setMisterWhiteCount}
            color="var(--accent-purple)"
          />

          {/* Summary */}
          <div
            className="p-4 rounded-2xl"
            style={{
              background: 'var(--bg-secondary)',
              border: '2px dashed var(--border)',
            }}
          >
            <h3 className="font-cartoon text-lg mb-3" style={{ color: 'var(--text)' }}>
              📋 Résumé
            </h3>
            <div className="grid grid-cols-2 gap-2 font-body text-sm" style={{ color: 'var(--text-secondary)' }}>
              <span>👥 Max joueurs :</span><span className="font-bold" style={{ color: 'var(--text)' }}>{maxPlayers}</span>
              <span>😇 Civils :</span><span className="font-bold" style={{ color: 'var(--accent-blue)' }}>{maxPlayers - undercoverCount - misterWhiteCount}</span>
              <span>🦹 Undercovers :</span><span className="font-bold" style={{ color: 'var(--accent-pink)' }}>{undercoverCount}</span>
              <span>👻 Mister White :</span><span className="font-bold" style={{ color: 'var(--accent-purple)' }}>{misterWhiteCount}</span>
              <span>🔄 Tours/vote :</span><span className="font-bold" style={{ color: 'var(--text)' }}>{roundsBeforeVote}</span>
            </div>
          </div>

          <button
            onClick={handleCreate}
            disabled={loading}
            className="btn-cartoon btn-primary text-xl py-4 w-full disabled:opacity-50"
          >
            {loading ? '⏳ Création...' : '🚀 Créer la partie'}
          </button>
        </div>
      </div>
    </div>
  )
}

function SliderSetting({
  emoji, label, value, min, max, onChange, color
}: {
  emoji: string
  label: string
  value: number
  min: number
  max: number
  onChange: (v: number) => void
  color: string
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <label className="font-cartoon text-lg flex items-center gap-2" style={{ color: 'var(--text)' }}>
          <span>{emoji}</span> {label}
        </label>
        <span
          className="font-cartoon text-2xl w-12 h-12 flex items-center justify-center rounded-xl"
          style={{
            background: color,
            border: '3px solid var(--border)',
            boxShadow: 'var(--shadow)',
            color: 'white',
          }}
        >
          {value}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full h-4 rounded-full cursor-pointer"
        style={{
          accentColor: color,
          background: `linear-gradient(to right, ${color} ${((value - min) / (max - min)) * 100}%, var(--bg-secondary) 0%)`,
          border: '2px solid var(--border)',
          outline: 'none',
        }}
      />
      <div className="flex justify-between font-body text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
        <span>{min}</span>
        <span>{max}</span>
      </div>
    </div>
  )
}
