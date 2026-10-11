/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "var(--primary)",
        cream: {
          50: "#FAF7F2",
          100: "#F5EFEB",
          200: "#EAE2D5",
          300: "#DFD5C2",
          400: "#C8BBA4",
          500: "#A6987E",
        },
        dark: {
          950: "#0B0C0E",
          900: "#121316",
          850: "#17181D",
          800: "#1E2026",
          700: "#2A2D36",
          600: "#3D414D",
        },
        safe: "#10B981",
        warning: "#F59E0B",
        danger: "#EF4444",
      },
      fontFamily: {
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
      }
    },
  },
  plugins: [],
};
