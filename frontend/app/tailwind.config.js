import tailwindcssAnimate from "tailwindcss-animate";
import typography from "@tailwindcss/typography";

export default {
  darkMode: ["class"],
  content: [
    "./index.html",
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        purple: "#650CD7",
        blue: { DEFAULT: "#286AFF", light: "#0DBFFF" },
        green: "#52CE2A",
        aqua: "#69E2CC",
        // red: "#FF5A34",
        orange: "#FFA100",
        yellow: "#FFDF00",
        pink: "#FF3CE0",
        lilac: "#C99EFF",
        brown: "#BA672C",
        black: "#000000",
        white: "#FFFFFF",
        gray: {
          1: "#222222",
          2: "#545454",
          3: "#727272",
          4: "#9A9A9A",
          5: "#C2C2C2",
          6: "#EEEEEE",
          7: "#F7F7F7",
        },
        bg: "#F6F6F9",
        border: "#D9D8D8",
      },
      zIndex: Object.fromEntries(Array.from({ length: 10 }, (_, i) => [i * 10, i * 10])),
      boxShadow: {
        DEFAULT: "0px 3px 5px 0px rgba(0, 0, 0, 0.05)",
        "node-selected": "0 0 0 6px rgb(191, 194, 255)",
        "node-active": "0px 0px 0px 6px rgb(101, 12, 215, 0.5)",
        background: "0px 2px 5px 0px rgba(0, 0, 0, 0.2)",
        "node-repo": "0px 4px 6px 0px rgba(0, 0, 0, 0.09)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
      ringWidth: {
        DEFAULT: "1px",
        2: "1px",
      },
      typography: {
        DEFAULT: {
          css: {
            maxWidth: "100ch", // add required value here
          },
        },
      },
    },
    // Add line clamps 1-20 for dynamic use in the graph to truncate node labels
    lineClamp: Object.fromEntries(Array.from({ length: 20 }, (_, i) => [i + 1, i + 1])),
  },
  safelist: [{ pattern: /^line-clamp-(\d+)$/ }],
  plugins: [tailwindcssAnimate, typography],
};
