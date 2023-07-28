import type {Config} from 'tailwindcss';

export default {
  content: ['./packages/renderer/src/**/*.{html,js,svelte,ts}'],
  safelist: [
    {
      pattern: /generic-btn-\S+/,
    },
  ],
  theme: {
    extend: {
      colors: {
        'wc3-yellow': '#fed32a',
        'active-text': '#ccc8b8',
        'inactive-text': '#333',
      },
    },
  },
  plugins: [],
} satisfies Config;
