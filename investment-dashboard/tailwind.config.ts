import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          950: "#0b0f17",
          900: "#101623",
          850: "#141c2b",
          800: "#1a2333",
          700: "#243147",
          600: "#33415c",
        },
        accent: {
          DEFAULT: "#4f8cff",
          dim: "#2b5fd9",
        },
        good: "#34d399",
        warn: "#fbbf24",
        bad: "#f87171",
      },
    },
  },
  plugins: [],
};
export default config;
