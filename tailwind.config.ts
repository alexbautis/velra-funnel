import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./content/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        teal: {
          DEFAULT: "#36CFC3",
          dark: "#26ABA0",
        },
        blush: {
          DEFAULT: "#F2C4B2",
        },
        ink: {
          DEFAULT: "#0A0A0A",
          soft: "#141414",
        },
        paper: "#FFFFFF",
        "text-dark": "#1A1A1A",
        wa: {
          bg: "#ECE5DD",
          header: "#075E54",
          bubble: "#FFFFFF",
          green: "#25D366",
          tick: "#53BDEB",
        },
      },
      fontFamily: {
        bebas: ["var(--font-bebas)", "sans-serif"],
        poppins: ["var(--font-poppins)", "sans-serif"],
        dm: ["var(--font-dm)", "sans-serif"],
      },
      keyframes: {
        "pulse-ring": {
          "0%": { boxShadow: "0 0 0 0 rgba(37, 211, 102, 0.5)" },
          "70%": { boxShadow: "0 0 0 18px rgba(37, 211, 102, 0)" },
          "100%": { boxShadow: "0 0 0 0 rgba(37, 211, 102, 0)" },
        },
        "soft-blink": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.4" },
        },
        "call-shake": {
          "0%, 100%": { transform: "translateX(0)" },
          "10%": { transform: "translateX(-1.5px)" },
          "20%": { transform: "translateX(1.5px)" },
          "30%": { transform: "translateX(-1px)" },
          "40%": { transform: "translateX(1px)" },
          "50%": { transform: "translateX(0)" },
        },
        "typing-dot": {
          "0%, 60%, 100%": { transform: "translateY(0)", opacity: "0.4" },
          "30%": { transform: "translateY(-4px)", opacity: "1" },
        },
        wave: {
          "0%, 100%": { transform: "scaleY(0.4)" },
          "50%": { transform: "scaleY(1)" },
        },
      },
      animation: {
        "pulse-ring": "pulse-ring 1.6s ease-out infinite",
        "soft-blink": "soft-blink 1.8s ease-in-out infinite",
        "call-shake": "call-shake 1.2s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
export default config;
