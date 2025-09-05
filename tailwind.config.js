/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src//*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      boxShadow: { soft: "0 10px 30px rgba(0,0,0,0.10)" },
      colors: {
        brand: { a: "#3B82F6", b: "#A855F7", c: "#10B981" }
      }
    },
  },
  plugins: [],
}