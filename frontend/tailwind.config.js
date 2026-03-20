/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "sans-serif"],
        display: ["Playfair Display", "Georgia", "serif"],
        mono: ["JetBrains Mono", "Consolas", "Monaco", "monospace"],
      },
      colors: {
        forest: {
          50:  "#f0fdf4",
          100: "#dcfce7",
          200: "#d8f3dc",
          300: "#95d5b2",
          400: "#74c69d",
          500: "#52b788",
          600: "#40916c",
          700: "#2d6a4f",
          800: "#1b4332",
          900: "#0d1f17",
          DEFAULT: "#1b4332",
        },
      },
      animation: {
        "fade-up":    "fadeUp 0.7s ease both",
        "fade-up-d1": "fadeUp 0.7s 0.15s ease both",
        "fade-up-d2": "fadeUp 0.7s 0.30s ease both",
        "fade-up-d3": "fadeUp 0.7s 0.50s ease both",
        "float":      "float 6s ease-in-out infinite",
        "float-d1":   "float 7s 1s ease-in-out infinite",
        "float-d2":   "float 8s 2s ease-in-out infinite",
        "float-d3":   "float 6.5s 0.5s ease-in-out infinite",
        "float-d4":   "float 7.5s 1.5s ease-in-out infinite",
        "shimmer":    "shimmer 1.4s ease infinite",
      },
      keyframes: {
        fadeUp: {
          from: { opacity: "0", transform: "translateY(22px)" },
          to:   { opacity: "1", transform: "translateY(0)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%":      { transform: "translateY(-14px)" },
        },
        shimmer: {
          "0%":   { backgroundPosition: "-400px 0" },
          "100%": { backgroundPosition: "400px 0" },
        },
      },
    },
  },
  plugins: [],
};
