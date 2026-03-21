import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
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
        heading: ["'Cormorant Garamond'", "serif"],
        body: ["'Inter'", "system-ui", "sans-serif"],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--bg))",
        foreground: "hsl(var(--text-primary))",
        primary: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--bg))",
        },
        secondary: {
          DEFAULT: "hsl(var(--surface))",
          foreground: "hsl(var(--text-muted))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--text-primary))",
        },
        muted: {
          DEFAULT: "hsl(var(--surface))",
          foreground: "hsl(var(--text-muted))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--bg))",
          hover: "hsl(var(--accent-hover))",
        },
        popover: {
          DEFAULT: "hsl(var(--surface))",
          foreground: "hsl(var(--text-primary))",
        },
        card: {
          DEFAULT: "hsl(var(--surface))",
          foreground: "hsl(var(--text-primary))",
        },
        surface: {
          DEFAULT: "hsl(var(--surface))",
        },
        success: {
          DEFAULT: "hsl(var(--success))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
      },
      borderRadius: {
        lg: "0px",
        md: "0px",
        sm: "0px",
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
        "fade-pulse": {
          "0%, 100%": { opacity: "0.4" },
          "50%": { opacity: "1" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-pulse": "fade-pulse 2s ease-in-out infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
