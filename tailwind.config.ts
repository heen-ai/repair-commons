import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        rc: {
          navy: {
            DEFAULT: '#2b357d',
            50: '#eef0f9',
            100: '#d5d8ee',
            200: '#a8afe0',
            300: '#7b86d1',
            400: '#4e5dc3',
            500: '#2b357d',
            600: '#232c68',
            700: '#1b2253',
            800: '#14193e',
            900: '#0c0f29',
          },
          orange: {
            DEFAULT: '#f03f2c',
            50: '#fef2f0',
            100: '#fddad6',
            200: '#f9a99f',
            300: '#f57968',
            400: '#f25a47',
            500: '#f03f2c',
            600: '#d12e1d',
            700: '#a22317',
            800: '#731910',
            900: '#440f0a',
          },
        },
      },
    },
  },
  plugins: [],
};
export default config;
