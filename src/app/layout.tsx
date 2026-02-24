import type { Metadata } from 'next'
import './globals.css'
import { ThemeProvider } from '@/components/providers/ThemeProvider'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import { ToastProvider } from '@/components/providers/ToastProvider'

export const metadata: Metadata = {
  title: 'Under100Cover 🕵️ | Le jeu du secret',
  description: 'Le jeu d\'infiltration ultime. Qui est l\'undercover parmi vous ?',
  icons: {
    icon: '🕵️',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  const saved = localStorage.getItem('theme')
                  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
                  if (saved === 'dark' || (!saved && prefersDark)) {
                    document.documentElement.classList.add('dark')
                  }
                } catch(e) {}
              })()
            `,
          }}
        />
      </head>
      <body>
        <ThemeProvider>
          <ToastProvider>
            <div className="min-h-screen flex flex-col relative">
              {/* Animated background blobs */}
              <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
                <div
                  className="blob w-96 h-96 -top-20 -left-20"
                  style={{ background: 'var(--accent-pink)' }}
                />
                <div
                  className="blob w-80 h-80 top-1/3 -right-20"
                  style={{ background: 'var(--accent-blue)', animationDelay: '3s' }}
                />
                <div
                  className="blob w-64 h-64 bottom-10 left-1/3"
                  style={{ background: 'var(--accent-purple)', animationDelay: '6s' }}
                />
              </div>

              <Navbar />
              <main className="flex-1 relative z-10">
                {children}
              </main>
              <Footer />
            </div>
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
