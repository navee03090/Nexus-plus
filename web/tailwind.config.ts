import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        np: {
          bg: "#070A0F",
          surface: "#0E141B",
          "surface-2": "#151C25",
          border: "#243041",
          "border-strong": "#3A4B61",
          text: "#E8EEF6",
          muted: "#93A1B5",
          faint: "#6B7A90",
          accent: "#3D8BFF",
          "accent-soft": "rgba(61, 139, 255, 0.12)",
          verify: "#1F9B6A",
          warn: "#D69A2D",
          danger: "#D4535A",
          online: "#2AA8C9",
        },
        brand: {
          50: "#eef2ff",
          100: "#e0e7ff",
          200: "#c7d2fe",
          300: "#a5b4fc",
          400: "#818cf8",
          500: "#6366f1",
          600: "#4f46e5",
          700: "#4338ca",
          800: "#3730a3",
          900: "#312e81",
          950: "#1e1b4b",
        },
        pulse: {
          cyan: "#2AA8C9",
          emerald: "#1F9B6A",
          amber: "#D69A2D",
          rose: "#D4535A",
        },
      },
      borderRadius: {
        np: "0.625rem",
        "np-lg": "0.875rem",
        "np-xl": "1.25rem",
      },
      boxShadow: {
        np: "0 1px 0 rgba(255,255,255,0.04), 0 8px 24px -16px rgba(0,0,0,0.55)",
        "np-lg": "0 1px 0 rgba(255,255,255,0.04), 0 18px 40px -24px rgba(0,0,0,0.7)",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        serif: ["var(--font-serif)", "Georgia", "serif"],
      },
      keyframes: {
        "np-fade": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "np-fade-up": {
          "0%": { opacity: "0", transform: "translateY(14px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "np-shimmer": {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(100%)" },
        },
      },
      animation: {
        "np-fade": "np-fade 0.35s ease-out",
        "np-fade-up": "np-fade-up 0.65s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        "np-shimmer": "np-shimmer 1.4s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
export default config;
