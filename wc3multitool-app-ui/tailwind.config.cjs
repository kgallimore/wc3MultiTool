const typography = require("@tailwindcss/typography");
const forms = require("@tailwindcss/forms");

const config = {
  content: ["./src/**/*.{html,js,svelte,ts}"],

  theme: {
    extend: {
      colors: { "wc3-yellow": "#FED32A" },
    },
  },

  plugins: [forms, typography],
};

module.exports = config;
