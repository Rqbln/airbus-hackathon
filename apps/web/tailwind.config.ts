import type { Config } from "tailwindcss";

/**
 * Industrial / mission-control palette for an Airbus-style maintenance ops UI.
 */
const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: {
          0: "#04070d",   // page bg
          1: "#070b14",   // panel deepest
          2: "#0b1220",   // standard panel
          3: "#0f1830",   // nested panel
          4: "#131e3a",   // hover
        },
        line: {
          DEFAULT: "#1a2740",
          strong: "#25395f",
          subtle: "#121a2c",
        },
        fg: {
          DEFAULT: "#e6edf6",
          dim: "#8896ad",
          faint: "#5a6477",
          mute: "#3e4860",
        },
        brand: {
          DEFAULT: "#00b4d8",  // cyan
          bright: "#4ddfff",
          dim: "#0089b0",
        },
        risk: {
          low: "#2ee79b",
          mid: "#f7b956",
          high: "#ff5577",
        },
        tag: {
          robust: "#2ee79b",
          experimental: "#b97aff",
          info: "#4ddfff",
          warn: "#f7b956",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"],
        mono: ["JetBrains Mono", "Menlo", "Monaco", "Consolas", "monospace"],
      },
      fontSize: {
        "2xs": ["10px", "14px"],
      },
      letterSpacing: {
        widest: "0.18em",
      },
      boxShadow: {
        panel: "0 0 0 1px rgba(255,255,255,0.02), 0 8px 24px -12px rgba(0,0,0,0.6)",
        glow: "0 0 24px -6px rgba(0,180,216,0.35)",
      },
    },
  },
  plugins: [],
};

export default config;
