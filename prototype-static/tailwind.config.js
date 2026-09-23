module.exports = {
  content: ['./*.html', './assets/*.js'],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Libre Franklin"', 'Arial', 'sans-serif'],
        sans: ['"Libre Franklin"', 'Arial', 'sans-serif']
      },
      colors: {
        cream: '#FFFFFF',
        ink: '#131A17',
        forest: '#146B4F',
        forestDark: '#0C4A37',
        azure: '#2E5CE6',
        coral: '#D94F2B',
        sand: '#F2F2F2',
        line: '#E4E4E4',
        gold: '#F2B94E'
      }
    }
  },
  safelist: [
    { pattern: /^(bg|text|border)-(forest|forestDark|ink|coral|sand|line|gold|cream|azure|red|amber|green)-?(50|100|200|300|400|500|600|700)?$/ }
  ]
}
