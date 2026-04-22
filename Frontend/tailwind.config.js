

export default {content: [
  './index.html',
  './src/**/*.{js,ts,jsx,tsx}'
],
  theme: {
    extend: {
      fontFamily: {
        arabic: ['IBM Plex Sans Arabic', 'sans-serif'],
        heading: ['Almarai', 'sans-serif'],
        serif: ['Playfair Display', 'serif'],
      },
      colors: {
        eclipse: {
          DEFAULT: 'var(--color-eclipse)',
          2: 'var(--color-eclipse-2)',
          3: 'var(--color-eclipse-3)',
        },
        matcha: {
          DEFAULT: 'var(--color-matcha)',
          light: 'var(--color-matcha-light)',
          dim: 'var(--color-matcha-dim)',
        },
        cream: {
          DEFAULT: 'var(--color-cream)',
          dim: 'var(--color-cream-dim)',
          muted: 'var(--color-cream-muted)',
        },
        safe: 'var(--color-safe)',
        warn: 'var(--color-warn)',
        danger: 'var(--color-danger)',
      },
    },
  },
}

