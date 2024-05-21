/** @type {import('tailwindcss').Config} */
export default {
  content: ['./**/*.{html,js,svelte,ts}'],
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
};
