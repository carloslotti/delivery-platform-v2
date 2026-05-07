/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-sans)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['var(--font-display)', 'ui-serif', 'serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'monospace'],
      },
      colors: {
        ink: {
          50:  '#f8f6f1',
          100: '#eee9de',
          200: '#d8d0bc',
          300: '#b9ac8a',
          400: '#8b7e5e',
          500: '#5e553f',
          600: '#3d3826',
          700: '#2a2618',
          800: '#1c190f',
          900: '#0e0c07',
        },
        clay: {
          50:  '#fef4ed',
          100: '#fce6d4',
          200: '#f9c8a8',
          300: '#f4a070',
          400: '#ee7a45',
          500: '#e85d2c',
          600: '#d24521',
          700: '#ae341d',
          800: '#8b2c1f',
          900: '#71281d',
        },
        moss: {
          50:  '#f4f6f0',
          100: '#e6ead9',
          200: '#cdd6b4',
          300: '#abba87',
          400: '#8b9f63',
          500: '#6d8447',
          600: '#546937',
          700: '#42532e',
          800: '#374427',
          900: '#2f3a23',
        },
      },
      boxShadow: {
        soft: '0 1px 2px rgba(28,25,15,.04), 0 4px 8px rgba(28,25,15,.04)',
        card: '0 1px 0 rgba(28,25,15,.06), 0 8px 24px -8px rgba(28,25,15,.10)',
      },
    },
  },
  plugins: [],
};
