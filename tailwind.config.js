/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          900: '#0B1120',
          800: '#111827',
          700: '#1A2332',
          600: '#1F2D3D',
          500: '#2A3A4E',
        },
        accent: {
          blue: '#378ADD',
          green: '#4ADE80',
          red: '#F87171',
          amber: '#FBBF24',
        }
      }
    },
  },
  plugins: [],
}
