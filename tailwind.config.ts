import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        cartoon: ['Fredoka One', 'cursive'],
        body: ['Nunito', 'sans-serif'],
      },
      colors: {
        primary: {
          50: '#fff9db',
          100: '#fff3a3',
          200: '#ffea6b',
          300: '#ffe033',
          400: '#ffd700',
          500: '#ffc200',
          600: '#cc9900',
          700: '#997000',
          800: '#664800',
          900: '#332400',
        },
        accent: {
          pink: '#FF6B9D',
          blue: '#4ECDC4',
          purple: '#A855F7',
          orange: '#FF8C42',
          green: '#6BCB77',
          red: '#FF4757',
        },
        cartoon: {
          light: '#FFF9F0',
          dark: '#1A1025',
          surface: '#FFFFFF',
          'surface-dark': '#2D1F3D',
          border: '#2D1F3D',
          'border-light': '#E8D5C4',
        }
      },
      boxShadow: {
        'cartoon': '4px 4px 0px #2D1F3D',
        'cartoon-lg': '6px 6px 0px #2D1F3D',
        'cartoon-xl': '8px 8px 0px #2D1F3D',
        'cartoon-pink': '4px 4px 0px #FF6B9D',
        'cartoon-blue': '4px 4px 0px #4ECDC4',
        'cartoon-inset': 'inset 3px 3px 0px rgba(0,0,0,0.2)',
      },
      borderRadius: {
        'cartoon': '16px',
        'cartoon-lg': '24px',
        'cartoon-xl': '32px',
      },
      keyframes: {
        wiggle: {
          '0%, 100%': { transform: 'rotate(-3deg)' },
          '50%': { transform: 'rotate(3deg)' },
        },
        bounce3d: {
          '0%, 100%': { transform: 'translateY(0) scale(1)' },
          '50%': { transform: 'translateY(-20px) scale(1.05)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px) rotate(-2deg)' },
          '50%': { transform: 'translateY(-15px) rotate(2deg)' },
        },
        pop: {
          '0%': { transform: 'scale(0) rotate(-10deg)', opacity: '0' },
          '80%': { transform: 'scale(1.1) rotate(2deg)', opacity: '1' },
          '100%': { transform: 'scale(1) rotate(0deg)', opacity: '1' },
        },
        slideInLeft: {
          '0%': { transform: 'translateX(-100px)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        slideInRight: {
          '0%': { transform: 'translateX(100px)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        spinPop: {
          '0%': { transform: 'rotate(0deg) scale(0)' },
          '100%': { transform: 'rotate(360deg) scale(1)' },
        },
        starBurst: {
          '0%': { transform: 'scale(0)', opacity: '1' },
          '100%': { transform: 'scale(3)', opacity: '0' },
        },
        morphBlob: {
          '0%, 100%': { borderRadius: '60% 40% 30% 70% / 60% 30% 70% 40%' },
          '50%': { borderRadius: '30% 60% 70% 40% / 50% 60% 30% 60%' },
        },
        typewriter: {
          'from': { width: '0' },
          'to': { width: '100%' },
        },
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '25%': { transform: 'translateX(-5px)' },
          '75%': { transform: 'translateX(5px)' },
        },
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(255, 107, 157, 0.4)' },
          '50%': { boxShadow: '0 0 0 20px rgba(255, 107, 157, 0)' },
        },
        confettiFall: {
          '0%': { transform: 'translateY(-100vh) rotate(0deg)', opacity: '1' },
          '100%': { transform: 'translateY(100vh) rotate(720deg)', opacity: '0' },
        },
        neonPulse: {
          '0%, 100%': { textShadow: '0 0 10px #FF6B9D, 0 0 20px #FF6B9D, 0 0 40px #FF6B9D' },
          '50%': { textShadow: '0 0 5px #FF6B9D, 0 0 10px #FF6B9D' },
        },
      },
      animation: {
        wiggle: 'wiggle 0.5s ease-in-out infinite',
        'bounce3d': 'bounce3d 2s ease-in-out infinite',
        float: 'float 3s ease-in-out infinite',
        pop: 'pop 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards',
        slideInLeft: 'slideInLeft 0.5s ease forwards',
        slideInRight: 'slideInRight 0.5s ease forwards',
        spinPop: 'spinPop 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards',
        starBurst: 'starBurst 0.8s ease forwards',
        morphBlob: 'morphBlob 8s ease-in-out infinite',
        shake: 'shake 0.3s ease',
        pulseGlow: 'pulseGlow 2s ease infinite',
        confettiFall: 'confettiFall 3s ease-in forwards',
        neonPulse: 'neonPulse 2s ease infinite',
      },
    },
  },
  plugins: [],
}
export default config
