/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#ff5d22',
          dark: '#e64a12',
          soft: '#fff1eb',
        },
        ink: {
          DEFAULT: '#333333',
          soft: '#434343',
          muted: '#777777',
        },
        surface: '#f0f1f2',
        line: '#e7e7e7',
        cream: '#f6efe4',
      },
      fontFamily: {
        sans: ['Montserrat', 'sans-serif'],
      },
      maxWidth: {
        site: '1280px',
      },
    },
  },
  plugins: [],
};
