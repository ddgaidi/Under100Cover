'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useToast } from '@/components/providers/ToastProvider'
import { getRandomEmoji } from '@/lib/game/utils'

export default function AuthPage() {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const { showToast } = useToast()
  const supabase = createClient()

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        showToast('Bon retour ! 🎉', 'success', '🕵️')
        router.push('/')
      } else {
        if (!username.trim()) {
          showToast('Choisis un pseudo !', 'error', '😅')
          setLoading(false)
          return
        }

        const { data, error } = await supabase.auth.signUp({ email, password })
        if (error) throw error

        if (data.user) {
          await supabase.from('profiles').insert({
            id: data.user.id,
            username: username.trim(),
            avatar_emoji: getRandomEmoji(),
          })
        }

        showToast('Compte créé ! Bienvenue 🎭', 'success', '🎉')
        router.push('/')
      }
    } catch (err: any) {
      showToast(err.message || 'Une erreur est survenue', 'error', '💀')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-md">
        {/* Card */}
        <div
          className="p-8 rounded-3xl"
          style={{
            background: 'var(--surface)',
            border: '3px solid var(--border)',
            boxShadow: 'var(--shadow-xl)',
          }}
        >
          {/* Header */}
          <div className="text-center mb-8">
            <div
              className="w-20 h-20 mx-auto mb-4 flex items-center justify-center text-4xl rounded-2xl animate-bounce3d"
              style={{
                background: 'var(--primary)',
                border: '3px solid var(--border)',
                boxShadow: 'var(--shadow)',
              }}
            >
              {mode === 'login' ? '🕵️' : '🎭'}
            </div>
            <h1
              className="font-cartoon text-4xl mb-2"
              style={{ color: 'var(--text)' }}
            >
              {mode === 'login' ? 'Connexion' : 'Inscription'}
            </h1>
            <p className="font-body text-sm" style={{ color: 'var(--text-secondary)' }}>
              {mode === 'login'
                ? 'Content de te revoir, agent 🤫'
                : 'Rejoins la confrérie des infiltrés !'}
            </p>
          </div>

          {/* Mode tabs */}
          <div
            className="flex mb-6 p-1 rounded-xl"
            style={{
              background: 'var(--bg-secondary)',
              border: '2px solid var(--border)',
            }}
          >
            {(['login', 'register'] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className="flex-1 py-2 rounded-lg font-cartoon text-sm transition-all"
                style={{
                  background: mode === m ? 'var(--primary)' : 'transparent',
                  color: mode === m ? 'var(--border)' : 'var(--text-secondary)',
                  border: mode === m ? '2px solid var(--border)' : '2px solid transparent',
                  boxShadow: mode === m ? 'var(--shadow)' : 'none',
                }}
              >
                {m === 'login' ? '🔑 Connexion' : '✨ Inscription'}
              </button>
            ))}
          </div>

          {/* Form */}
          <form onSubmit={handleAuth} className="flex flex-col gap-4">
            {mode === 'register' && (
              <div>
                <label className="block font-body font-bold text-sm mb-1" style={{ color: 'var(--text)' }}>
                  🎭 Pseudo
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder="Agent007"
                  className="input-cartoon"
                  maxLength={20}
                  required
                />
              </div>
            )}

            <div>
              <label className="block font-body font-bold text-sm mb-1" style={{ color: 'var(--text)' }}>
                📧 Email
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="agent@secret.com"
                className="input-cartoon"
                required
              />
            </div>

            <div>
              <label className="block font-body font-bold text-sm mb-1" style={{ color: 'var(--text)' }}>
                🔒 Mot de passe
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="input-cartoon"
                required
                minLength={6}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-cartoon btn-pink text-lg py-4 mt-2 w-full disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Chargement...
                </span>
              ) : mode === 'login' ? '🚀 Me connecter' : '🎉 Créer mon compte'}
            </button>
          </form>

          {/* Footer note */}
          <p className="text-center font-body text-xs mt-4" style={{ color: 'var(--text-secondary)' }}>
            {mode === 'login'
              ? 'Pas encore de compte ?'
              : 'Déjà un compte ?'}{' '}
            <button
              onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
              className="font-bold underline"
              style={{ color: 'var(--accent-pink)' }}
            >
              {mode === 'login' ? 'Inscription' : 'Connexion'}
            </button>
          </p>
        </div>

        {/* Floating emojis */}
        {['🕵️', '🎭', '🤫', '🎯'].map((e, i) => (
          <div
            key={i}
            className="absolute text-4xl pointer-events-none animate-float opacity-30"
            style={{
              left: `${[10, 85, 5, 90][i]}%`,
              top: `${[20, 30, 70, 60][i]}%`,
              animationDelay: `${i * 0.8}s`,
            }}
          >
            {e}
          </div>
        ))}
      </div>
    </div>
  )
}
