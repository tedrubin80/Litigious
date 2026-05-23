/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        // IBM Plex Sans: precise, institutional. Falls back to system stack.
        sans: [
          '"IBM Plex Sans"',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'system-ui',
          'sans-serif',
        ],
      },
      colors: {
        primary: {
          50: '#eff6ff',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
        }
      }
    },
  },
  plugins: [],
}
