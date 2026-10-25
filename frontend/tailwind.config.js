/** @type {import('tailwindcss').Config} */
import forms from '@tailwindcss/forms';

const v = (name) => `rgb(var(--${name}) / <alpha-value>)`;

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        paper: v('paper'),
        surface: v('surface'),
        sunken: v('sunken'),
        line: v('line'),
        ink: { DEFAULT: v('ink'), soft: v('ink-soft'), faint: v('ink-faint') },
        brand: { DEFAULT: v('brand'), strong: v('brand-strong'), tint: v('brand-tint') },
        marker: { DEFAULT: v('marker'), ink: v('marker-ink') },
        ok: v('ok'),
        warn: v('warn'),
        danger: v('danger'),
      },
      fontFamily: {
        sans: ['"IBM Plex Sans"', 'system-ui', 'sans-serif'],
        display: ['"IBM Plex Sans Condensed"', '"IBM Plex Sans"', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'monospace'],
      },
      borderRadius: { sm: '4px', DEFAULT: '6px', lg: '10px', xl: '14px' },
      boxShadow: { lift: '0 1px 0 rgb(var(--line)), 0 8px 24px -12px rgb(var(--ink) / 0.25)' },
    },
  },
  plugins: [forms({ strategy: 'class' })],
};
