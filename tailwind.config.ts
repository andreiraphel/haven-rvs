import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        sora: ["var(--font-sora)", "sans-serif"],
        sans: ["var(--font-dm-sans)", "sans-serif"],
      },
      colors: {
        sand:          "#F5F0E8",
        clay:          "#C4A882",
        terracotta:    "#B5552A",
        sienna:        "#8C3A1A",
        bark:          "#3D2B1F",
        ink:           "#1A1208",
        "ink-lt":      "#5C4832",
        border:        "#E0D4C0",
        teal:          "#1F6F8B",
        "risk-low":    "#2A7D4F",
        "risk-low-bg": "#E6F4EC",
        "risk-mod":    "#9C6A00",
        "risk-mod-bg": "#FFF3D6",
        "risk-high":   "#B52A2A",
        "risk-high-bg":"#FDEAEA",
      },
    },
  },
  plugins: [],
};
export default config;
