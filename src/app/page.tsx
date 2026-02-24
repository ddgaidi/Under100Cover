'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'

const FLOATING_EMOJIS = ['🕵️', '🎭', '🃏', '🔍', '💀', '🎪', '🦊', '🎯', '👁️', '🤫', '🎮', '⚡']

function FloatingEmoji({ emoji, style }: { emoji: string; style: React.CSSProperties }) {
  return (
    <div
      className="absolute text-4xl select-none pointer-events-none animate-float"
      style={style}
    >
      {emoji}
    </div>
  )
}

const STATS = [
  { value: '10K+', label: 'Parties jouées', emoji: '🎮' },
  { value: '50K+', label: 'Joueurs', emoji: '👥' },
  { value: '99%', label: 'Trahisons réussies', emoji: '🗡️' },
  { value: '∞', label: 'Fun', emoji: '🎉' },
]

const HOW_TO = [
  {
    step: '01',
    emoji: '🎯',
    title: 'Créez une partie',
    desc: 'Définissez les règles, générez un code secret de 6 chiffres et invitez vos amis.',
    color: 'var(--accent-pink)',
  },
  {
    step: '02',
    emoji: '🤫',
    title: 'Recevez votre rôle',
    desc: 'Citoyen, Undercover ou Mister White ? Chacun reçoit un mot secret différent.',
    color: 'var(--accent-blue)',
  },
  {
    step: '03',
    emoji: '🎭',
    title: 'Décrivez, mentez, survivez',
    desc: 'Décrivez votre mot sans trop en dire. Les undercovers doivent se fondre dans la masse.',
    color: 'var(--accent-purple)',
  },
  {
    step: '04',
    emoji: '🗳️',
    title: 'Votez & éliminez',
    desc: 'Après chaque tour, votez pour éliminer celui que vous suspectez. Bonne chance !',
    color: 'var(--accent-orange)',
  },
]

export default function HomePage() {
  const [animatedStats, setAnimatedStats] = useState([0, 0, 0, 0])
  const statsRef = useRef<HTMLDivElement>(null)
  const [floatingEmojis] = useState(() =>
    FLOATING_EMOJIS.map((emoji, i) => ({
      emoji,
      style: {
        left: `${(i * 8.3) % 100}%`,
        top: `${(i * 17 + 10) % 80}%`,
        animationDelay: `${i * 0.4}s`,
        animationDuration: `${3 + (i % 3)}s`,
        opacity: 0.2,
        fontSize: `${2 + (i % 2)}rem`,
      } as React.CSSProperties,
    }))
  )

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setAnimatedStats([10, 50, 99, 100])
        }
      },
      { threshold: 0.3 }
    )
    if (statsRef.current) observer.observe(statsRef.current)
    return () => observer.disconnect()
  }, [])

  return (
    <div>
      {/* HERO */}
      <section className="relative min-h-[90vh] flex items-center overflow-hidden">
        {/* Background */}
        <div
          className="absolute inset-0 z-0"
          style={{
            background: 'linear-gradient(135deg, var(--bg) 0%, var(--bg-secondary) 50%, var(--bg) 100%)',
          }}
        />

        {/* Grid pattern */}
        <div
          className="absolute inset-0 z-0 opacity-5"
          style={{
            backgroundImage: 'radial-gradient(var(--border) 1px, transparent 1px)',
            backgroundSize: '30px 30px',
          }}
        />

        {/* Floating emojis */}
        {floatingEmojis.map((item, i) => (
          <FloatingEmoji key={i} {...item} />
        ))}

        <div className="relative z-10 max-w-7xl mx-auto px-6 py-20 text-center w-full">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 mb-8 animate-pop" style={{ animationDelay: '0.1s' }}>
            <span
              className="px-4 py-2 rounded-full font-cartoon text-sm"
              style={{
                background: 'var(--accent-pink)',
                color: 'white',
                border: '3px solid var(--border)',
                boxShadow: 'var(--shadow)',
              }}
            >
              🎮 Le party game de l&apos;infiltration
            </span>
          </div>

          {/* Title */}
          <div className="animate-pop" style={{ animationDelay: '0.2s' }}>
            <h1 className="font-cartoon leading-none mb-6">
              <span
                className="block text-6xl sm:text-8xl lg:text-9xl"
                style={{
                  color: 'var(--text)',
                  WebkitTextStroke: '2px var(--border)',
                  textShadow: '6px 6px 0px var(--border)',
                }}
              >
                Under
              </span>
              <span
                className="block text-7xl sm:text-9xl lg:text-[10rem]"
                style={{
                  color: 'var(--accent-pink)',
                  WebkitTextStroke: '2px var(--border)',
                  textShadow: '6px 6px 0px var(--border)',
                }}
              >
                100Cover
              </span>
            </h1>
          </div>

          <p
            className="font-body text-xl sm:text-2xl max-w-2xl mx-auto mb-10 font-bold animate-pop"
            style={{ color: 'var(--text-secondary)', animationDelay: '0.4s' }}
          >
            🤫 Infiltre, trompe tes amis et survive ! Le jeu de déduction où personne ne peut être vraiment confiance.
          </p>

          {/* CTA Buttons */}
          <div
            className="flex flex-col sm:flex-row gap-4 justify-center animate-pop"
            style={{ animationDelay: '0.6s' }}
          >
            <Link href="/create" className="btn-cartoon btn-primary text-xl px-8 py-4 hover:animate-wiggle">
              ⚡ Créer une partie
            </Link>
            <Link href="/join" className="btn-cartoon btn-pink text-xl px-8 py-4">
              🚪 Rejoindre une partie
            </Link>
          </div>

          {/* Scroll indicator */}
          <div className="mt-16 animate-bounce3d">
            <div
              className="inline-flex flex-col items-center gap-2"
              style={{ color: 'var(--text-secondary)' }}
            >
              <span className="font-body text-sm font-bold">Découvrir</span>
              <span className="text-2xl">👇</span>
            </div>
          </div>
        </div>
      </section>

      {/* STATS */}
      <section ref={statsRef} className="py-20 relative z-10">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {STATS.map((stat, i) => (
              <div
                key={i}
                className="card-cartoon text-center hover-lift"
                style={{ animationDelay: `${i * 0.1}s` }}
              >
                <div className="text-5xl mb-3 animate-bounce3d" style={{ animationDelay: `${i * 0.3}s` }}>
                  {stat.emoji}
                </div>
                <div
                  className="font-cartoon text-4xl sm:text-5xl mb-1"
                  style={{ color: 'var(--accent-pink)' }}
                >
                  {stat.value}
                </div>
                <div className="font-body text-sm font-bold" style={{ color: 'var(--text-secondary)' }}>
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW TO PLAY */}
      <section className="py-20 relative z-10">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2
              className="font-cartoon text-5xl sm:text-6xl mb-4"
              style={{ color: 'var(--text)', textShadow: '4px 4px 0px var(--border)' }}
            >
              Comment jouer ? 🎭
            </h2>
            <p className="font-body text-lg" style={{ color: 'var(--text-secondary)' }}>
              Simple à apprendre, impossible à maîtriser
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {HOW_TO.map((item, i) => (
              <div
                key={i}
                className="relative p-6 rounded-2xl hover-lift"
                style={{
                  background: 'var(--surface)',
                  border: '3px solid var(--border)',
                  boxShadow: 'var(--shadow-lg)',
                }}
              >
                {/* Step number */}
                <div
                  className="absolute -top-5 -left-3 w-12 h-12 rounded-full flex items-center justify-center font-cartoon text-lg"
                  style={{
                    background: item.color,
                    border: '3px solid var(--border)',
                    boxShadow: 'var(--shadow)',
                    color: 'white',
                  }}
                >
                  {item.step}
                </div>

                <div className="text-5xl mb-4 mt-2 animate-float" style={{ animationDelay: `${i * 0.5}s` }}>
                  {item.emoji}
                </div>
                <h3 className="font-cartoon text-xl mb-2" style={{ color: 'var(--text)' }}>
                  {item.title}
                </h3>
                <p className="font-body text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ROLES */}
      <section className="py-20 relative z-10">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2
              className="font-cartoon text-5xl sm:text-6xl mb-4"
              style={{ color: 'var(--text)', textShadow: '4px 4px 0px var(--border)' }}
            >
              Les rôles 🎭
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                emoji: '😇',
                title: 'Citoyen',
                color: 'var(--accent-blue)',
                bg: '#4ECDC420',
                desc: 'Tu connais le vrai mot. Décris-le sans trop en dire pour démasquer les infiltrés. Tu dois rester crédible et éliminer les traîtres.',
                tag: 'Équipe innocente',
              },
              {
                emoji: '🦹',
                title: 'Undercover',
                color: 'var(--accent-pink)',
                bg: '#FF6B9D20',
                desc: 'Tu as un mot similaire mais différent. Tu dois te fondre parmi les civils tout en découvrant leur vrai mot sans te faire griller !',
                tag: 'Infiltré',
              },
              {
                emoji: '👻',
                title: 'Mister White',
                color: 'var(--accent-purple)',
                bg: '#A855F720',
                desc: 'Danger maximum ! Tu n\'as aucun mot. Tu dois deviner le mot des civils en écoutant les indices et survivre jusqu\'à la fin.',
                tag: 'Mystérieux',
              },
            ].map((role, i) => (
              <div
                key={i}
                className="relative overflow-hidden p-8 rounded-2xl hover-lift"
                style={{
                  background: role.bg,
                  border: `3px solid ${role.color}`,
                  boxShadow: `6px 6px 0px ${role.color}`,
                }}
              >
                <div className="text-7xl mb-4 animate-bounce3d" style={{ animationDelay: `${i * 0.7}s` }}>
                  {role.emoji}
                </div>
                <span
                  className="inline-block px-3 py-1 rounded-full font-body text-xs font-bold mb-3"
                  style={{ background: role.color, color: 'white', border: '2px solid var(--border)' }}
                >
                  {role.tag}
                </span>
                <h3 className="font-cartoon text-3xl mb-3" style={{ color: 'var(--text)' }}>
                  {role.title}
                </h3>
                <p className="font-body text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  {role.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="py-20 relative z-10">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <div
            className="p-12 rounded-3xl relative overflow-hidden"
            style={{
              background: 'var(--primary)',
              border: '4px solid var(--border)',
              boxShadow: 'var(--shadow-xl)',
            }}
          >
            {/* Decoration */}
            <div className="absolute top-0 right-0 text-8xl opacity-20 font-cartoon">🕵️</div>
            <div className="absolute bottom-0 left-0 text-8xl opacity-20 font-cartoon">🎭</div>

            <h2
              className="font-cartoon text-5xl sm:text-6xl mb-4 relative"
              style={{ color: 'var(--border)', textShadow: '3px 3px 0px rgba(0,0,0,0.2)' }}
            >
              Prêt à jouer ? 🎯
            </h2>
            <p className="font-body text-xl font-bold mb-8 relative" style={{ color: 'var(--border)' }}>
              Lance une partie maintenant et vois qui parmi tes amis est le meilleur menteur !
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center relative">
              <Link
                href="/create"
                className="btn-cartoon text-xl px-8 py-4"
                style={{
                  background: 'var(--border)',
                  color: 'var(--primary)',
                  boxShadow: '4px 4px 0px rgba(0,0,0,0.3)',
                }}
              >
                ⚡ Créer une partie
              </Link>
              <Link
                href="/join"
                className="btn-cartoon btn-ghost text-xl px-8 py-4"
                style={{ borderColor: 'var(--border)' }}
              >
                🚪 Rejoindre une partie
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
