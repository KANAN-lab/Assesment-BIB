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
          50: '#eef2ff',
          100: '#e0e7ff',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
          900: '#312e81',
        },
        bib: {
          behavior: '#10b981', // Emerald green
          integrity: '#06b6d4', // Cyan
          benchmark: '#f59e0b', // Amber
        }
      },
    },
  },
  plugins: [],
}
