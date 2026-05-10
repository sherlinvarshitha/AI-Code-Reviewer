/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        mono: ["'JetBrains Mono'", "monospace"],
        display: ["'Syne'", "sans-serif"],
        body: ["'DM Sans'", "sans-serif"],
      },
      colors: {
        carbon: {
          950: "#050508",
          900: "#0d0d14",
          800: "#13131e",
          700: "#1a1a28",
          600: "#23233a",
          500: "#2e2e50",
        },
        electric: {
          DEFAULT: "#6ee7f7",
          dim: "#3bbdd4",
        },
        neon: {
          green: "#39ff87",
          pink: "#ff3b8b",
          amber: "#ffb547",
          red: "#ff4545",
        },
      },
      animation: {
        "fade-in": "fadeIn 0.4s ease-out",
        "slide-up": "slideUp 0.5s cubic-bezier(0.16, 1, 0.3, 1)",
        "pulse-glow": "pulseGlow 2s ease-in-out infinite",
        "spin-slow": "spin 3s linear infinite",
        scanning: "scanning 2s linear infinite",
      },
      keyframes: {
        fadeIn: { from: { opacity: 0 }, to: { opacity: 1 } },
        slideUp: { from: { opacity: 0, transform: "translateY(20px)" }, to: { opacity: 1, transform: "translateY(0)" } },
        pulseGlow: { "0%,100%": { boxShadow: "0 0 10px rgba(110,231,247,0.3)" }, "50%": { boxShadow: "0 0 30px rgba(110,231,247,0.7)" } },
        scanning: { from: { transform: "translateY(-100%)" }, to: { transform: "translateY(400%)" } },
      },
    },
  },
  plugins: [],
};
