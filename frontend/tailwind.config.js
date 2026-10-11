/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,jsx}",
    "./src/components/**/*.{js,jsx}",
    "./src/app/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#C2601F",
        "primary-hover": "#A34E18",
        "primary-light": "#F0E8DC",

        cream: {
          50:  "#FDFAF7",
          100: "#F8F4EF",
          200: "#F2EDE6",
          300: "#EDE8E0",
          400: "#E5DFD6",
          500: "#D4C9B8",
          600: "#BEA98E",
          700: "#9E8D7A",
          800: "#6B5C4C",
          900: "#1A1612",
        },

        ink: {
          50:  "#F2EDE6",
          100: "#D4C9B8",
          200: "#BEA98E",
          300: "#9E8D7A",
          400: "#6B5C4C",
          500: "#4A3C30",
          900: "#1A1612",
        },

        safe:    "#16A34A",
        warning: "#CA8A04",
        danger:  "#DC2626",
      },
      fontFamily: {
        mono: ["ui-monospace", "SF Mono", "Menlo", "Consolas", "monospace"],
        sans: ["Inter", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"],
      },
      borderRadius: {
        card: "12px",
        pill: "999px",
      },
      boxShadow: {
        card: "0 1px 3px rgba(80,50,20,0.06), 0 1px 2px rgba(80,50,20,0.04)",
        "card-hover": "0 3px 10px rgba(80,50,20,0.09)",
        "primary-glow": "0 0 0 4px rgba(194,96,31,0.15)",
      },
    },
  },
  plugins: [],
};
