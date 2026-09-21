import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        display: ["var(--font-libre-franklin)", "Arial", "sans-serif"],
        sans: ["var(--font-libre-franklin)", "Arial", "sans-serif"],
      },
      colors: {
        cream: "#FFFFFF",
        ink: "#131A17",
        forest: "#146B4F",
        forestDark: "#0C4A37",
        azure: "#2E5CE6",
        coral: "#D94F2B",
        sand: "#F2F2F2",
        line: "#E4E4E4",
        gold: "#F2B94E",
      },
    },
  },
  plugins: [],
};
export default config;
