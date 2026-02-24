'use client'

import Link from 'next/link'

const EMOJIS = ['🕵️', '🎭', '🃏', '🎯', '🔍', '💀', '🎪', '🦊']

export function Footer() {
  return (
    <footer
      className="relative mt-20 z-10"
      style={{
        background: 'var(--surface)',
        borderTop: '3px solid var(--border)',
        boxShadow: '0 -4px 0 var(--border)',
      }}
    >
      {/* Decorative top wave */}
      <div
        className="h-6 -mt-px"
        style={{
          background: 'var(--primary)',
          borderBottom: '3px solid var(--border)',
        }}
      />

      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div
                className="w-14 h-14 flex items-center justify-center text-3xl rounded-xl"
                style={{
                  background: 'var(--primary)',
                  border: '3px solid var(--border)',
                  boxShadow: 'var(--shadow)',
                }}
              >
                🕵️
              </div>
              <div>
                <h3 className="font-cartoon text-2xl" style={{ color: 'var(--text)' }}>
                  Under<span style={{ color: 'var(--accent-pink)' }}>100</span>Cover
                </h3>
                <p className="font-body text-sm" style={{ color: 'var(--text-secondary)' }}>
                  Le jeu du secret
                </p>
              </div>
            </div>
            <p className="font-body text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              Infiltre, trompe, survie ! Le jeu d&apos;infiltration party game ultime pour te la jouer espion en soirée. 🎉
            </p>
          </div>

          {/* Links */}
          <div>
            <h4 className="font-cartoon text-lg mb-4" style={{ color: 'var(--text)' }}>
              🗺️ Navigation
            </h4>
            <div className="flex flex-col gap-2">
              {[
                { href: '/', label: '🏠 Accueil' },
                { href: '/create', label: '⚡ Créer une partie' },
                { href: '/join', label: '🚪 Rejoindre une partie' },
                { href: '/auth', label: '🎮 Connexion' },
              ].map(({ href, label }) => (
                <Link
                  key={href}
                  href={href}
                  className="font-body text-sm transition-all hover:translate-x-1"
                  style={{ color: 'var(--text-secondary)' }}
                  onMouseEnter={e => { e.currentTarget.style.color = 'var(--accent-pink)' }}
                  onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-secondary)' }}
                >
                  {label}
                </Link>
              ))}
            </div>
          </div>

          {/* Credits */}
          <div>
            <h4 className="font-cartoon text-lg mb-4" style={{ color: 'var(--text)' }}>
              💜 À propos
            </h4>
            <div
              className="p-4 rounded-2xl"
              style={{
                background: 'var(--bg-secondary)',
                border: '3px solid var(--border)',
                boxShadow: 'var(--shadow)',
              }}
            >
              <p className="font-body text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>
                Conçu avec ❤️ et beaucoup de ☕
              </p>
              <div
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl font-cartoon text-lg"
                style={{
                  background: 'var(--primary)',
                  border: '3px solid var(--border)',
                  boxShadow: 'var(--shadow)',
                  color: 'var(--border)',
                }}
              >
                🏆 Fait par DML
              </div>
              <div className="flex flex-wrap gap-1 mt-3">
                {EMOJIS.map((emoji, i) => (
                  <span
                    key={i}
                    className="text-xl hover:animate-wiggle cursor-default transition-all"
                    style={{ animationDelay: `${i * 0.1}s` }}
                  >
                    {emoji}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div
          className="mt-10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4"
          style={{ borderTop: '2px dashed var(--border)' }}
        >
          <p className="font-body text-sm" style={{ color: 'var(--text-secondary)' }}>
            © 2026 Under100Cover — Tous droits réservés 🎭
          </p>
          <div
            className="px-4 py-2 rounded-full font-cartoon text-sm"
            style={{
              background: 'var(--accent-pink)',
              color: 'white',
              border: '2px solid var(--border)',
            }}
          >
            Made with 💜 by DML
          </div>
        </div>
      </div>
    </footer>
  )
}
