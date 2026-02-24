'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useToast } from '@/components/providers/ToastProvider'
import { getRandomEmoji } from '@/lib/game/utils'
import Link from 'next/link'

export default function ProfilePage() {
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [username, setUsername] = useState('')
  const router = useRouter()
  const { showToast } = useToast()
  const supabase = createClient()

  useEffect(() => {
    const getProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUser(user)
        const { data: p } = await supabase.from('profiles').select('*').eq('id', user.id).single()
        if (p) {
          setProfile(p)
          setUsername(p.username)
        }
      } else {
        router.push('/auth')
      }
      setLoading(false)
    }
    getProfile()
  }, [router, supabase])

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!username.trim()) {
      showToast('Le pseudo ne peut pas être vide !', 'error', '😅')
      return
    }

    setUpdating(true)
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ username: username.trim() })
        .eq('id', user.id)

      if (error) throw error

      setProfile({ ...profile, username: username.trim() })
      showToast('Profil mis à jour !', 'success', '✨')
    } catch (err: any) {
      showToast(err.message || 'Une erreur est survenue', 'error', '💀')
    } finally {
      setUpdating(false)
    }
  }

  const handleChangeEmoji = async () => {
    setUpdating(true)
    try {
      const newEmoji = getRandomEmoji()
      const { error } = await supabase
        .from('profiles')
        .update({ avatar_emoji: newEmoji })
        .eq('id', user.id)

      if (error) throw error

      setProfile({ ...profile, avatar_emoji: newEmoji })
      showToast('Nouvel emoji !', 'success', '🎭')
    } catch (err: any) {
      showToast(err.message || 'Une erreur est survenue', 'error', '💀')
    } finally {
      setUpdating(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="cartoon-spinner" />
      </div>
    )
  }

  if (!user || !profile) return null

  return (
    <div className="max-w-2xl mx-auto px-6 py-12">
      <div className="text-center mb-10">
        <h1 className="font-cartoon text-5xl mb-2" style={{ color: 'var(--text)', WebkitTextStroke: '1px var(--border)' }}>
          Mon Profil
        </h1>
        <p className="font-body text-lg" style={{ color: 'var(--text-secondary)' }}>
          Gère ton identité secrète 🕵️
        </p>
      </div>

      <div className="grid gap-8">
        {/* Profile Card */}
        <div
          className="p-8 rounded-3xl relative overflow-hidden"
          style={{
            background: 'var(--surface)',
            border: '3px solid var(--border)',
            boxShadow: 'var(--shadow-xl)',
          }}
        >
          <div className="flex flex-col md:flex-row items-center gap-8">
            {/* Avatar Section */}
            <div className="relative group">
              <div
                className="w-32 h-32 flex items-center justify-center text-6xl rounded-3xl transition-transform group-hover:scale-105"
                style={{
                  background: 'var(--primary)',
                  border: '4px solid var(--border)',
                  boxShadow: 'var(--shadow-lg)',
                }}
              >
                {profile.avatar_emoji}
              </div>
              <button
                onClick={handleChangeEmoji}
                disabled={updating}
                className="absolute -bottom-2 -right-2 w-10 h-10 bg-white border-3 border-black rounded-full flex items-center justify-center text-xl hover:bg-gray-100 transition-colors shadow-md"
                title="Changer d'emoji"
              >
                🎲
              </button>
            </div>

            {/* Form Section */}
            <form onSubmit={handleUpdateProfile} className="flex-1 w-full space-y-4">
              <div>
                <label className="block font-cartoon text-sm mb-2 ml-1" style={{ color: 'var(--text-secondary)' }}>
                  Ton Pseudo
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border-3 font-bold focus:outline-none transition-all"
                  style={{
                    borderColor: 'var(--border)',
                    background: 'var(--bg-secondary)',
                    color: 'var(--text)',
                  }}
                  placeholder="Pseudo..."
                />
              </div>

              <div>
                <label className="block font-cartoon text-sm mb-2 ml-1" style={{ color: 'var(--text-secondary)' }}>
                  Email (non modifiable)
                </label>
                <input
                  type="text"
                  value={user.email}
                  disabled
                  className="w-full px-4 py-3 rounded-xl border-3 font-bold opacity-60 cursor-not-allowed"
                  style={{
                    borderColor: 'var(--border)',
                    background: 'var(--bg-secondary)',
                    color: 'var(--text)',
                  }}
                />
              </div>

              <button
                type="submit"
                disabled={updating}
                className="btn-cartoon btn-primary w-full mt-2"
              >
                {updating ? 'Enregistrement...' : '💾 Sauvegarder'}
              </button>
            </form>
          </div>
        </div>

        {/* Stats / Info Card */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div
            className="p-6 rounded-2xl flex items-center gap-4"
            style={{
              background: 'var(--accent-blue)',
              border: '3px solid var(--border)',
              boxShadow: 'var(--shadow)',
              color: 'var(--border)'
            }}
          >
            <div className="text-4xl">🎮</div>
            <div>
              <div className="font-cartoon text-xl leading-none">Prêt à jouer</div>
              <div className="font-body text-sm font-bold opacity-80">Rejoins ou crée une partie !</div>
            </div>
          </div>

          <Link
            href="/"
            className="p-6 rounded-2xl flex items-center gap-4 hover:scale-[1.02] transition-transform"
            style={{
              background: 'var(--accent-pink)',
              border: '3px solid var(--border)',
              boxShadow: 'var(--shadow)',
              color: 'white'
            }}
          >
            <div className="text-4xl">🏠</div>
            <div>
              <div className="font-cartoon text-xl leading-none">Retour</div>
              <div className="font-body text-sm font-bold opacity-80">Vers l'accueil</div>
            </div>
          </Link>
        </div>
      </div>
    </div>
  )
}
