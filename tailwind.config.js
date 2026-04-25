/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        mono: ['"Share Tech Mono"', 'monospace'],
        '8bit': ['"Press Start 2P"', 'cursive'],
      },
      colors: {
        os: {
          bg: 'rgb(var(--os-bg-rgb) / <alpha-value>)',
          panel: 'rgb(var(--os-panel-rgb) / <alpha-value>)',
          card: 'rgb(var(--os-card-rgb) / <alpha-value>)',
          border: 'rgb(var(--os-border-rgb) / <alpha-value>)',
          divider: 'rgb(var(--os-divider-rgb) / <alpha-value>)',
          
          primary: 'rgb(var(--os-primary-rgb) / <alpha-value>)', // Dynamic Accent
          primaryHover: 'rgb(var(--os-primary-hover-rgb) / <alpha-value>)', // Dynamic Hover Accent
          primaryActive: 'rgb(var(--os-primary-active-rgb) / <alpha-value>)', // Dynamic Active Accent
          primarySoft: 'rgb(var(--os-primary-rgb) / 0.08)', // Soft Background Accent Tint
          
          // Status Colors
          success: '#22c55e',
          warning: '#eab308',
          info: '#6C7A89', // Smoky Steel
          infoAccent: '#9FA8B2', // Warm Ice Accent
          error: '#D83A56', // Deep Error
          
          // Premium Accents
          accentBronze: '#7A5C3E', // Gunmetal Bronze
          accentBurgundy: '#5C1A1B', // Subtle Burgundy
          
          // Terminal Specific
          termBg: '#101014',
          termPrompt: 'rgb(var(--os-primary-rgb) / 1)',
          termText: 'rgb(var(--os-text-rgb) / <alpha-value>)',
          termResponse: 'rgb(var(--os-primary-rgb) / 0.75)', // Pale Accent
          termMuted: 'rgb(var(--os-dim-rgb) / <alpha-value>)',
          
          text: 'rgb(var(--os-text-rgb) / <alpha-value>)',
          dim: 'rgb(var(--os-dim-rgb) / <alpha-value>)',
        }
      },
      backgroundImage: {
        'radial-glow': 'radial-gradient(circle at center, rgb(var(--os-primary-rgb) / 0.12) 0%, rgb(var(--os-bg-rgb) / 1) 60%)',
        'panel-gradient': 'linear-gradient(145deg, #151518, #1C1C22)',
      },
      boxShadow: {
        'primary-glow': '0 0 20px rgb(var(--os-primary-rgb) / 0.35)',
        'gold-glow': '0 0 20px rgba(212,160,23,0.3)',
        'panel-shadow': '0 10px 30px rgba(0,0,0,0.6)',
      },
      animation: {
        'scanline': 'scanline 8s linear infinite',
        'flicker': 'flicker 0.15s infinite',
        'pulse-fast': 'pulse 1s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float': 'float 3s ease-in-out infinite',
        'shake': 'shake 0.5s cubic-bezier(.36,.07,.19,.97) both infinite',
        'glitch-anim': 'glitch-anim 2s infinite',
        'glow-pulse': 'glow-pulse 2s ease-in-out infinite alternate',
      },
      keyframes: {
        scanline: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100vh)' },
        },
        flicker: {
          '0%': { opacity: '0.95' },
          '100%': { opacity: '1' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        shake: {
          '10%, 90%': { transform: 'translate3d(-1px, 0, 0)' },
          '20%, 80%': { transform: 'translate3d(2px, 0, 0)' },
          '30%, 50%, 70%': { transform: 'translate3d(-4px, 0, 0)' },
          '40%, 60%': { transform: 'translate3d(4px, 0, 0)' }
        },
        'glitch-anim': {
          '0%': { clipPath: 'inset(50% 0 30% 0)', transform: 'translate(-2px, 2px)' },
          '20%': { clipPath: 'inset(15% 0 65% 0)', transform: 'translate(2px, -2px)' },
          '40%': { clipPath: 'inset(80% 0 5% 0)', transform: 'translate(-2px, -2px)' },
          '60%': { clipPath: 'inset(40% 0 40% 0)', transform: 'translate(2px, 2px)' },
          '80%': { clipPath: 'inset(10% 0 80% 0)', transform: 'translate(-2px, 2px)' },
          '100%': { clipPath: 'inset(50% 0 30% 0)', transform: 'translate(0)' }
        },
        'glow-pulse': {
          '0%': { boxShadow: '0 0 10px rgb(var(--os-primary-rgb) / 0.2)' },
          '100%': { boxShadow: '0 0 25px rgb(var(--os-primary-rgb) / 0.5)' }
        }
      }
    },
  },
  plugins: [],
}
