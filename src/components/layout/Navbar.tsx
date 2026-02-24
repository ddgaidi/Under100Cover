'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useTheme } from '@/components/providers/ThemeProvider'
import { createClient } from '@/lib/supabase/client'
import { User } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'

export function Navbar() {
  const { theme, toggleTheme } = useTheme()
  const [user, setUser] = useState<User | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
    setMenuOpen(false)
  }

  return (
    <nav
      className="sticky top-0 z-50 transition-all duration-300"
      style={{
        background: scrolled ? 'var(--surface)' : 'transparent',
        borderBottom: scrolled ? '3px solid var(--border)' : 'none',
        boxShadow: scrolled ? 'var(--shadow)' : 'none',
      }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <div
              className="w-12 h-12 flex items-center justify-center text-2xl border-3 rounded-xl transition-all group-hover:animate-wiggle"
              style={{
                background: 'var(--primary)',
                border: '3px solid var(--border)',
                boxShadow: 'var(--shadow)',
              }}
            >
              🕵️
            </div>
            <div className="flex flex-col leading-tight">
              <span
                className="font-cartoon text-xl"
                style={{ color: 'var(--text)', WebkitTextStroke: '0.5px var(--border)' }}
              >
                Under
              </span>
              <span
                className="font-cartoon text-xl -mt-2"
                style={{ color: 'var(--accent-pink)', WebkitTextStroke: '0.5px var(--border)' }}
              >
                100Cover
              </span>
            </div>
          </Link>

          {/* Desktop Nav - innovative pill design */}
          <div
            className="hidden md:flex items-center gap-2 p-2 rounded-2xl"
            style={{
              background: 'var(--surface)',
              border: '3px solid var(--border)',
              boxShadow: 'var(--shadow)',
            }}
          >
            <NavLink href="/" emoji="🏠">Accueil</NavLink>
            <NavLink href="/create" emoji="⚡">Créer</NavLink>
            <NavLink href="/join" emoji="🚪">Rejoindre</NavLink>
          </div>

          {/* Right side */}
          <div className="hidden md:flex items-center gap-3">
            {/* Theme toggle - innovative design */}
            <button
              onClick={toggleTheme}
              className="relative w-16 h-9 transition-all"
              style={{
                background: theme === 'dark' ? '#A855F7' : '#FFD700',
                border: '3px solid var(--border)',
                borderRadius: '999px',
                boxShadow: 'var(--shadow)',
              }}
              aria-label="Toggle theme"
            >
              <div
                className="absolute top-1 w-6 h-6 rounded-full transition-all duration-300 flex items-center justify-center text-sm"
                style={{
                  left: theme === 'dark' ? 'calc(100% - 28px)' : '4px',
                  background: 'white',
                  border: '2px solid var(--border)',
                }}
              >
                {theme === 'dark' ? '🌙' : '☀️'}
              </div>
            </button>

            {user ? (
              <div className="flex items-center gap-2">
                <Link href="/profile" className="btn-cartoon btn-primary text-sm">
                  👤 Profil
                </Link>
                <button onClick={handleLogout} className="btn-cartoon btn-ghost text-sm">
                  👋 Déco
                </button>
              </div>
            ) : (
              <Link href="/auth" className="btn-cartoon btn-pink text-sm">
                🎮 Connexion
              </Link>
            )}
          </div>

          {/* Mobile burger - animated */}
          <button
            className="md:hidden flex flex-col gap-1.5 p-3 rounded-xl transition-all"
            style={{
              background: 'var(--primary)',
              border: '3px solid var(--border)',
              boxShadow: 'var(--shadow)',
            }}
            onClick={() => setMenuOpen(!menuOpen)}
          >
            <span
              className="block w-5 h-0.5 transition-all duration-300"
              style={{
                background: 'var(--border)',
                transform: menuOpen ? 'rotate(45deg) translate(4px, 4px)' : 'none',
              }}
            />
            <span
              className="block w-5 h-0.5 transition-all duration-300"
              style={{
                background: 'var(--border)',
                opacity: menuOpen ? 0 : 1,
              }}
            />
            <span
              className="block w-5 h-0.5 transition-all duration-300"
              style={{
                background: 'var(--border)',
                transform: menuOpen ? 'rotate(-45deg) translate(4px, -4px)' : 'none',
              }}
            />
          </button>
        </div>

        {/* Mobile menu */}
        <div
          className="md:hidden overflow-hidden transition-all duration-300"
          style={{ maxHeight: menuOpen ? '400px' : '0' }}
        >
          <div
            className="flex flex-col gap-2 pb-4"
          >
            {[
              { href: '/', emoji: '🏠', label: 'Accueil' },
              { href: '/create', emoji: '⚡', label: 'Créer une partie' },
              { href: '/join', emoji: '🚪', label: 'Rejoindre une partie' },
            ].map(({ href, emoji, label }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-3 p-3 rounded-xl font-bold font-body transition-all"
                style={{
                  background: 'var(--surface)',
                  border: '2px solid var(--border)',
                  color: 'var(--text)',
                }}
              >
                <span className="text-xl">{emoji}</span>
                {label}
              </Link>
            ))}
            <div className="flex gap-2 mt-2">
              <button
                onClick={toggleTheme}
                className="flex-1 btn-cartoon btn-primary"
              >
                {theme === 'dark' ? '☀️ Clair' : '🌙 Sombre'}
              </button>
              {user ? (
                <button onClick={handleLogout} className="flex-1 btn-cartoon btn-ghost">
                  👋 Déconnexion
                </button>
              ) : (
                <Link href="/auth" onClick={() => setMenuOpen(false)} className="flex-1 btn-cartoon btn-pink text-center">
                  🎮 Connexion
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </nav>
  )
}

function NavLink({ href, emoji, children }: { href: string; emoji: string; children: string }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-1.5 px-4 py-2 rounded-xl font-bold font-body text-sm transition-all hover:scale-105"
      style={{
        color: 'var(--text)',
      }}
      onMouseEnter={e => {
        const el = e.currentTarget
        el.style.background = 'var(--primary)'
        el.style.color = 'var(--border)'
      }}
      onMouseLeave={e => {
        const el = e.currentTarget
        el.style.background = 'transparent'
        el.style.color = 'var(--text)'
      }}
    >
      <span>{emoji}</span>
      {children}
    </Link>
  )
}
