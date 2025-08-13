/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './src/**/*.{js,ts,jsx,tsx}',        // cobre pages + components
  ],
  theme: {
    extend: {
      colors: {
        bg: 'var(--bg)',
        fg: 'var(--fg)',
        panel: 'var(--panel)',
        card: 'var(--card)',
        border: 'var(--border)',
        muted: 'var(--muted)',
        accent: 'var(--accent)',
        accentfg: 'var(--accent-fg)',
      },
      boxShadow: {
        soft: '0 6px 24px rgba(0,0,0,.18), 0 2px 8px rgba(0,0,0,.12)',
      },
      borderRadius: {
        xl: '0.75rem',
      },
    },
  },
  plugins: [],
}