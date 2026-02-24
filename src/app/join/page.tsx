'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/providers/ToastProvider'
import Link from 'next/link'

export default function JoinPage() {
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [code, setCode] = useState(['', '', '', '', '', ''])
  const [loading, setLoading] = useState(false)
  const [checkingAuth, setCheckingAuth] = useState(true)
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])
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

  const handleDigit = (index: number, value: string) => {
    if (!/^\d?$/.test(value)) return
    const newCode = [...code]
    newCode[index] = value
    setCode(newCode)
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
    if (e.key === 'Enter' && code.every(d => d)) {
      handleJoin()
    }
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (text.length === 6) {
      setCode(text.split(''))
      inputRefs.current[5]?.focus()
    }
  }

  const handleJoin = async () => {
    let currentUser = user
    let currentProfile = profile

    // Double check auth if state is not set yet
    if (!currentUser) {
      console.log('No user in state, fetching...')
      const { data } = await supabase.auth.getUser()
      currentUser = data.user
      if (currentUser) {
        console.log('User fetched:', currentUser.id)
        if (!currentProfile) {
          const { data: p, error: pError } = await supabase.from('profiles').select('*').eq('id', currentUser.id).single()
          if (pError) console.error('Error fetching profile:', pError)
          currentProfile = p
        }
      }
    }

    if (!currentUser) {
      showToast('Tu dois être connecté !', 'error', '🔐')
      return
    }

    // If user is logged in but has no profile, create a default one
    if (!currentProfile) {
      console.log('No profile found, creating default...')
      const { data: newProfile, error: insertError } = await supabase.from('profiles').insert({
        id: currentUser.id,
        username: currentUser.email?.split('@')[0] || `Agent_${Math.floor(Math.random() * 1000)}`,
        avatar_emoji: '🕵️'
      }).select().single()

      if (insertError) {
        console.error('Error creating profile:', insertError)
        showToast('Erreur lors de la création de ton profil. Réessaie !', 'error', '💀')
        return
      }
      currentProfile = newProfile
    }

    const fullCode = code.join('')
    if (fullCode.length !== 6) {
      showToast('Entre un code de 6 chiffres !', 'error', '❌')
      return
    }

    setLoading(true)
    try {
      const { data: game, error } = await supabase
        .from('games')
        .select('*')
        .eq('code', fullCode)
        .eq('status', 'waiting')
        .single()

      if (error || !game) {
        showToast('Partie introuvable ou déjà commencée !', 'error', '💀')
        setLoading(false)
        return
      }

      // Check if already in game
      const { data: existingPlayer } = await supabase
        .from('game_players')
        .select('*')
        .eq('game_id', game.id)
        .eq('user_id', currentUser.id)
        .single()

      if (existingPlayer) {
        router.push(`/lobby/${game.id}`)
        return
      }

      // Check if full
      const { count } = await supabase
        .from('game_players')
        .select('*', { count: 'exact', head: true })
        .eq('game_id', game.id)

      if ((count ?? 0) >= game.max_players) {
        showToast('La partie est pleine !', 'error', '😅')
        setLoading(false)
        return
      }

      await supabase.from('game_players').insert({
        game_id: game.id,
        user_id: currentUser.id,
        username: currentProfile.username,
        is_eliminated: false,
      })

      showToast('Tu as rejoint la partie ! 🎉', 'success', '🚪')
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
          <h2 className="font-cartoon text-3xl mb-3" style={{ color: 'var(--text)' }}>Connexion requise</h2>
          <p className="font-body mb-6" style={{ color: 'var(--text-secondary)' }}>Tu dois être connecté pour rejoindre une partie !</p>
          <Link href="/auth" className="btn-cartoon btn-pink w-full text-center">🎮 Se connecter</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div
            className="w-20 h-20 mx-auto mb-4 flex items-center justify-center text-4xl rounded-2xl animate-bounce3d"
            style={{
              background: 'var(--accent-blue)',
              border: '3px solid var(--border)',
              boxShadow: 'var(--shadow)',
            }}
          >
            🚪
          </div>
          <h1 className="font-cartoon text-5xl mb-2" style={{ color: 'var(--text)' }}>Rejoindre</h1>
          <p className="font-body" style={{ color: 'var(--text-secondary)' }}>
            Entre le code à 6 chiffres de la partie
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
          {/* Code input */}
          <div className="flex gap-3 justify-center mb-8" onPaste={handlePaste}>
            {code.map((digit, i) => (
              <input
                key={i}
                ref={el => { inputRefs.current[i] = el }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={e => handleDigit(i, e.target.value)}
                onKeyDown={e => handleKeyDown(i, e)}
                className="text-center font-cartoon text-3xl transition-all"
                style={{
                  width: '52px',
                  height: '64px',
                  background: digit ? 'var(--primary)' : 'var(--bg-secondary)',
                  border: `3px solid ${digit ? 'var(--border)' : 'var(--border)'}`,
                  borderRadius: '12px',
                  boxShadow: digit ? 'var(--shadow)' : 'none',
                  color: 'var(--border)',
                  outline: 'none',
                  transform: digit ? 'translateY(-4px)' : 'none',
                }}
              />
            ))}
          </div>

          <button
            onClick={handleJoin}
            disabled={loading || code.some(d => !d)}
            className="btn-cartoon btn-primary text-xl py-4 w-full disabled:opacity-50"
          >
            {loading ? '⏳ Recherche...' : '🚀 Rejoindre la partie'}
          </button>

          <p className="text-center font-body text-sm mt-4" style={{ color: 'var(--text-secondary)' }}>
            Pas de code ?{' '}
            <Link href="/create" className="font-bold" style={{ color: 'var(--accent-pink)' }}>
              Créer une partie
            </Link>
          </p>
        </div>

        {/* Fun hint */}
        <div
          className="mt-4 p-4 rounded-2xl text-center"
          style={{
            background: 'var(--bg-secondary)',
            border: '2px dashed var(--border)',
          }}
        >
          <p className="font-body text-sm" style={{ color: 'var(--text-secondary)' }}>
            💡 Tu peux coller le code directement (CTRL+V) !
          </p>
        </div>
      </div>
    </div>
  )
}
