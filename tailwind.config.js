/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        paper: "#f7f7f5",
        ink: "#1c1c1a",
        accent: "#6257e8",
      },
    },
  },
  plugins: [],
};
