import type { Config } from "tailwindcss";
const config: Config = { content: ["./app/**/*.{js,ts,jsx,tsx,mdx}", "./components/**/*.{js,ts,jsx,tsx,mdx}"], theme: { extend: { colors: { ink:"#101b2d", steel:"#273b52", signal:"#d7f36a" }, boxShadow: { soft:"0 18px 60px rgba(15,23,42,.08)" } } }, plugins: [] };
export default config;