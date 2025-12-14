/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Backgrounds
        'dark-bg': '#121212',       // Deep Charcoal Gray
        'panel-bg': '#1E1E1E',      // Darker Gray for cards
        
        // Teams
        'pro': {
          DEFAULT: '#00BFA5',       // Teal (Main)
          dark: '#00796B',          // Darker Teal
          glow: 'rgba(0, 191, 165, 0.5)' // Untuk efek neon
        },
        'contra': {
          DEFAULT: '#FF5722',       // Vibrant Orange (Main)
          dark: '#BF360C',          // Darker Orange
          glow: 'rgba(255, 87, 34, 0.5)'
        },

        // Utilities
        'text-primary': '#E0E0E0',
        'text-secondary': '#A0A0A0',
        'timer-warning': '#FFEB3B', // Yellow
        'timer-critical': '#F44336', // Red
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'], // Kita akan load font Inter nanti
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      }
    },
  },
  plugins: [],
}