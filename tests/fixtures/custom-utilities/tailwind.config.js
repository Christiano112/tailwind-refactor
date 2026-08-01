module.exports = {
  plugins: [
    ({ addUtilities }) => {
      addUtilities({
        '.btn-primary': { color: 'white' },
        '.card-shadow': { boxShadow: '0 4px 6px rgba(0,0,0,0.1)' },
      });
    },
  ],
};
