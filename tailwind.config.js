/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          bg: '#0C121D',
          surface: '#191E27',
          blue: '#3B8CCF',
          orange: '#D97126',
        }
      }
    },
  },
  plugins: [],
}
