import tailwindcssAnimate from "tailwindcss-animate";

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
        "node-border": "#1a192b",
        purple: "#650cd7",
      },
      boxShadow: {
        "node-selected": "0 0 0 6px rgb(191, 194, 255)",
        background: "0px 2px 5px 0px rgba(0, 0, 0, 0.2)",
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
    },
    // Add line clamps 1-20 for dynamic use in the graph to truncate node labels
    lineClamp: Object.fromEntries(Array.from({ length: 20 }, (_, i) => [i + 1, i + 1])),
  },
  safelist: [{ pattern: /^line-clamp-(\d+)$/ }],
  plugins: [tailwindcssAnimate],
};
