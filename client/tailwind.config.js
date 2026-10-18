/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        vyntra: {
          bg: '#0B0F19',
          secondary: '#111827',
          elevated: '#161D2B',
          card: 'rgba(22, 29, 43, 0.7)',
          primary: '#7C3AED',
          accent: '#8B5CF6',
          text: '#F9FAFB',
          muted: '#9CA3AF',
          success: '#22C55E',
          warning: '#F59E0B',
          error: '#EF4444',
          glass: 'rgba(255, 255, 255, 0.045)',
          'glass-border': 'rgba(255, 255, 255, 0.10)',
          'glass-hover': 'rgba(255, 255, 255, 0.08)',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      backdropBlur: {
        xs: '2px',
      },
      boxShadow: {
        'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
        'glow': '0 0 25px -5px rgba(124, 58, 237, 0.35)',
      }
    },
  },
  plugins: [],
}
