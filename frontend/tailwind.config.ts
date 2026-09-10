import type { Config } from "tailwindcss";

const config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
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
      fontFamily: {
        sans: ["var(--font-geist-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", "ui-monospace", "monospace"],
      },
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        card: { DEFAULT: "var(--card)", foreground: "var(--card-foreground)" },
        popover: {
          DEFAULT: "var(--popover)",
          foreground: "var(--popover-foreground)",
        },
        plane: "var(--plane)",
        muted: { DEFAULT: "var(--muted)", foreground: "var(--muted-foreground)" },
        subtle: { foreground: "var(--subtle-foreground)" },
        overlay: "var(--overlay)",
        border: { DEFAULT: "var(--border)", strong: "var(--border-strong)" },
        input: { DEFAULT: "var(--input)", bg: "var(--input-bg)" },
        ring: "var(--ring)",
        primary: {
          DEFAULT: "var(--primary)",
          hover: "var(--primary-hover)",
          foreground: "var(--primary-foreground)",
        },
        secondary: {
          DEFAULT: "var(--secondary)",
          foreground: "var(--secondary-foreground)",
        },
        accent: {
          DEFAULT: "var(--accent)",
          foreground: "var(--accent-foreground)",
          soft: "var(--accent-soft)",
          "soft-foreground": "var(--accent-soft-foreground)",
        },
        success: {
          DEFAULT: "var(--success)",
          soft: "var(--success-soft)",
          "soft-foreground": "var(--success-soft-foreground)",
        },
        warning: {
          DEFAULT: "var(--warning)",
          soft: "var(--warning-soft)",
          "soft-foreground": "var(--warning-soft-foreground)",
        },
        info: {
          DEFAULT: "var(--info)",
          soft: "var(--info-soft)",
          "soft-foreground": "var(--info-soft-foreground)",
        },
        destructive: {
          DEFAULT: "var(--destructive)",
          foreground: "var(--destructive-foreground)",
          soft: "var(--destructive-soft)",
          "soft-foreground": "var(--destructive-soft-foreground)",
        },
        sidebar: {
          DEFAULT: "var(--sidebar)",
          foreground: "var(--sidebar-foreground)",
          muted: "var(--sidebar-muted)",
          accent: "var(--sidebar-accent)",
          "accent-foreground": "var(--sidebar-accent-foreground)",
          active: "var(--sidebar-active)",
          "active-foreground": "var(--sidebar-active-foreground)",
          border: "var(--sidebar-border)",
          brand: "var(--sidebar-brand)",
        },
        deco: {
          "halo-a": "var(--deco-halo-a)",
          "halo-b": "var(--deco-halo-b)",
          dot: "var(--deco-dot)",
          line: "var(--deco-line)",
        },
      },
      borderRadius: {
        sm: "calc(var(--radius) - 4px)",
        md: "calc(var(--radius) - 2px)",
        lg: "var(--radius)",
        xl: "calc(var(--radius) + 4px)",
      },
      boxShadow: {
        e1: "var(--elevation-1)",
        e2: "var(--elevation-2)",
        e3: "var(--elevation-3)",
        pop: "var(--elevation-pop)",
        modal: "var(--elevation-modal)",
      },
      transitionTimingFunction: {
        flow: "cubic-bezier(0.22, 0.68, 0, 1)",
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
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;

export default config;
