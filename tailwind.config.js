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
        // App Theme Tokens
        app: {
          bg: {
            light: '#F3F3F5',
            dark: '#0B0B0C',
          },
          card: {
            light: '#FFFFFF',
            dark: '#1C1C1E',
          },
          summary: {
            light: '#D9D4F2', // Soft lavender
            dark: '#2A2740',  // Deep purple/lavender dark
          },
          text: {
            light: '#111111',
            dark: '#FFFFFF',
          },
          green: {
            accent: '#5A9E2F',
            soft: 'rgba(90, 158, 47, 0.16)',
            light: '#6EBD3A',
          }
        }
      },
      borderRadius: {
        '3xl': '24px',
        '4xl': '32px',
        '5xl': '40px',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      boxShadow: {
        'soft': '0 4px 20px -2px rgba(0, 0, 0, 0.05)',
        'sheet': '0 -8px 30px -4px rgba(0, 0, 0, 0.08)',
        'pill': '0 2px 10px rgba(90, 158, 47, 0.25)',
      }
    },
  },
  plugins: [],
}
