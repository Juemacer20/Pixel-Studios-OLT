/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        'bg-base': '#0A0E1A',
        'bg-surface': '#111827',
        'bg-card': '#1A2235',
        'bg-input': '#1F2D44',
        cyan: { DEFAULT: '#00D4FF', 50: '#E0FAFF', 500: '#00D4FF' },
        orange: { DEFAULT: '#FF6B35' },
        green: { DEFAULT: '#00FF94', neon: '#00FF94' },
        red: { DEFAULT: '#FF3B5C', neon: '#FF3B5C' },
        purple: { DEFAULT: '#A855F7' },
        border: '#1E2D45',
      },
      fontFamily: {
        mono: ['"IBM Plex Mono"', 'monospace'],
        sans: ['"DM Sans"', 'system-ui', 'sans-serif'],
      },
      animation: {
        'pulse-red': 'pulse-red 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'pulse-green': 'pulse-green 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'slide-in': 'slide-in 0.3s ease-out',
        'fade-in': 'fade-in 0.2s ease-out',
      },
      keyframes: {
        'pulse-red': {
          '0%, 100%': { opacity: 1 },
          '50%': { opacity: 0.4, boxShadow: '0 0 8px #FF3B5C' },
        },
        'pulse-green': {
          '0%, 100%': { opacity: 1 },
          '50%': { opacity: 0.4, boxShadow: '0 0 8px #00FF94' },
        },
        'slide-in': {
          from: { transform: 'translateX(100%)' },
          to: { transform: 'translateX(0)' },
        },
        'fade-in': {
          from: { opacity: 0, transform: 'translateY(-4px)' },
          to: { opacity: 1, transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
};
