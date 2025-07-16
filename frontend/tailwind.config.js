const plugin = require('tailwindcss/plugin');

module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"], // Busca clases en los archivos dentro de src
  theme: {
    extend: {},
  },
  plugins: [
    plugin(function ({ addUtilities }) {
      addUtilities({
        '.scrollbar-hide': {
          '-ms-overflow-style': 'none', /* IE y Edge */
          'scrollbar-width': 'none',   /* Firefox */
          '&::-webkit-scrollbar': {
            display: 'none',           /* Webkit */
          },
        },
      });
    }),
  ],
};
