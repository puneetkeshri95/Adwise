/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Geist', 'Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['"Instrument Serif"', 'ui-serif', 'Georgia', 'serif'],
        mono: ['"Geist Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      letterSpacing: {
        'display': '-0.03em',
        'tight-x': '-0.022em',
      },
      colors: {
        // Aligned with parent workspace (Trackr / AdWise) palette
        navy: {
          950: '#06080F',
          900: '#0B1120',
          800: '#111827',
          700: '#1A2332',
          600: '#1F2D3D',
          500: '#2A3A4E',
        },
        surface: {
          light: '#FBFAF7',
          card: '#FFFFFF',
          muted: '#F1EEE8',
        },
        ink: {
          50: '#F5F5F4',
          100: '#E7E5E1',
          200: '#C9C6BF',
          300: '#A3A09A',
          400: '#78766F',
          500: '#57554F',
          600: '#3D3B36',
          700: '#28261F',
          800: '#191813',
          900: '#0E0D0A',
        },
        brand: {
          50: '#EEF6FF',
          100: '#D9EBFF',
          200: '#B3D6FF',
          300: '#7EB8FF',
          400: '#4A99FF',
          500: '#378ADD',
          600: '#2B6FB8',
          700: '#215690',
          800: '#183D68',
          900: '#0F2440',
        },
        // Social brand accents
        social: {
          instagram: '#E1306C',
          instagramFrom: '#F58529',
          instagramVia: '#DD2A7B',
          instagramTo: '#8134AF',
          facebook: '#1877F2',
          x: '#0F1419',
          xLight: '#E7E9EA',
          youtube: '#FF0000',
        },
        accent: {
          blue: '#378ADD',
          green: '#4ADE80',
          emerald: '#10B981',
          red: '#F87171',
          amber: '#FBBF24',
          violet: '#8B5CF6',
          pink: '#EC4899',
        },
      },
      boxShadow: {
        'glow-blue': '0 0 40px -10px rgba(55, 138, 221, 0.4)',
        'glow-violet': '0 0 40px -10px rgba(139, 92, 246, 0.35)',
        'card': '0 4px 30px rgba(0, 0, 0, 0.2)',
        'card-hover': '0 8px 30px rgba(55, 138, 221, 0.12)',
        'inner-highlight': 'inset 0 1px 0 0 rgba(255, 255, 255, 0.06)',
      },
      backgroundImage: {
        'gradient-instagram': 'linear-gradient(135deg, #F58529 0%, #DD2A7B 50%, #8134AF 100%)',
        'grid-fade': 'linear-gradient(to right, rgba(31,41,55,0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(31,41,55,0.06) 1px, transparent 1px)',
      },
      animation: {
        'fade-in': 'fade-in 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'fade-in-up': 'fade-in-up 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'slide-in-right': 'slide-in-right 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        'pulse-subtle': 'pulse-subtle 3s ease-in-out infinite',
        'shimmer': 'shimmer 2s linear infinite',
        'float': 'float 6s ease-in-out infinite',
        'spin-slow': 'spin 8s linear infinite',
      },
      keyframes: {
        'fade-in': {
          from: { opacity: '0', transform: 'translateY(4px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in-up': {
          from: { opacity: '0', transform: 'translateY(12px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-in-right': {
          from: { transform: 'translateX(20px)', opacity: '0' },
          to: { transform: 'translateX(0)', opacity: '1' },
        },
        'pulse-subtle': {
          '0%, 100%': { opacity: '0.6' },
          '50%': { opacity: '1' },
        },
        'shimmer': {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-8px)' },
        },
      },
    },
  },
  plugins: [],
}
