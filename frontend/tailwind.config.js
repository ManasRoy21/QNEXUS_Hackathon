/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        qin: {
          navy: '#071842',
          'navy-dark': '#040B1E',
          'navy-light': '#0B1E4E',
          'navy-card': '#091A48',
          teal: '#20C8A7',
          'teal-hover': '#1AB899',
          'teal-light': '#E6FBF7',
          paper: '#F8FAF9',
          'paper-card': '#FFFFFF',
          blue: '#263EDC',
          'blue-light': '#EFF4FF',
          border: '#E2E8F0',
          'border-strong': '#CBD5E1',
          muted: '#64748B',
          subtle: '#94A3B8',
          heading: '#071842',
          body: '#334155',
        },
        slate: {
          950: '#020617',
        },
      },
      fontFamily: {
        serif: ['Newsreader', 'Georgia', 'serif'],
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'ui-monospace', 'monospace'],
        grotesk: ['Space Grotesk', 'sans-serif'],
        cinzel: ['Cinzel', 'serif'],
      },
    },
  },
  plugins: [],
};
