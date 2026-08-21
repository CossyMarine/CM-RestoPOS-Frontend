
}
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        orange: {
          50:  '#FEF6F6',
          100: '#FCE9EA', // your exact color — used for light backgrounds/badges
          200: '#F8D2D4',
          300: '#F1B0B4',
          400: '#E68086',
          500: '#D14F58', // buttons / primary actions — deep enough for white text to stay readable
          600: '#B93641',
          700: '#96222B',
          800: '#7A1D24',
          900: '#661A20',
        },
      },
    },
  },
  plugins: [],
}