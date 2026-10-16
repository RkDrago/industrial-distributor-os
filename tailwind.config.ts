import type { Config } from "tailwindcss";

/**
 * Design tokens for the industrial commerce platform.
 * Restrained palette: green for action and positive state, navy for structure,
 * neutral greys for everything else.
 */
const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx,mdx}", "./components/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#E9F8F2",
          100: "#D0F0E4",
          200: "#A3E1CB",
          300: "#6FCFAD",
          400: "#35B98D",
          500: "#0B9B70",
          600: "#098560",
          700: "#076B4E",
          800: "#05543E",
          900: "#043B2C",
        },
        navy: {
          50: "#F2F4F7",
          100: "#E4E7EC",
          200: "#C9CFD9",
          300: "#98A2B3",
          400: "#667085",
          500: "#3F4A5C",
          600: "#2C3648",
          700: "#1F2937",
          800: "#182031",
          900: "#111827",
          950: "#0B1120",
        },
        ink: "#17212B",
        muted: "#667085",
        line: "#E3E8ED",
        lineStrong: "#D3DAE2",
        canvas: "#F3F6F8",
        surface: "#FFFFFF",
        success: "#0B9B70",
        "success-soft": "#E9F8F2",
        warning: "#B4700A",
        "warning-soft": "#FDF4E3",
        danger: "#B42318",
        "danger-soft": "#FDECEA",
        info: "#175CD3",
        "info-soft": "#EFF4FF",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "sans-serif"],
      },
      fontSize: {
        "2xs": ["0.6875rem", { lineHeight: "1rem" }],
      },
      borderRadius: {
        chip: "8px",
        control: "10px",
        card: "14px",
      },
      boxShadow: {
        card: "0 1px 2px rgba(17,24,39,0.04), 0 1px 3px rgba(17,24,39,0.06)",
        raised: "0 4px 12px rgba(17,24,39,0.06), 0 12px 32px rgba(17,24,39,0.08)",
        pop: "0 12px 40px rgba(17,24,39,0.16)",
        focus: "0 0 0 3px rgba(11,155,112,0.22)",
      },
      keyframes: {
        fadeUp: { from: { opacity: "0", transform: "translateY(10px)" }, to: { opacity: "1", transform: "translateY(0)" } },
        fadeIn: { from: { opacity: "0" }, to: { opacity: "1" } },
        slideUp: { from: { transform: "translateY(100%)" }, to: { transform: "translateY(0)" } },
        slideInRight: { from: { transform: "translateX(100%)" }, to: { transform: "translateX(0)" } },
        shimmer: { "100%": { transform: "translateX(100%)" } },
        spinSlow: { to: { transform: "rotate(360deg)" } },
      },
      animation: {
        fadeUp: "fadeUp .35s cubic-bezier(.2,.7,.2,1) both",
        fadeIn: "fadeIn .2s ease both",
        slideUp: "slideUp .28s cubic-bezier(.2,.7,.2,1) both",
        slideInRight: "slideInRight .28s cubic-bezier(.2,.7,.2,1) both",
        shimmer: "shimmer 1.4s infinite",
      },
    },
  },
  plugins: [],
};

export default config;
