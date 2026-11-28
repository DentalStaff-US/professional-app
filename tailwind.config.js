import preset from "./src/lib/design-tokens/tailwind-preset.cjs";

/** @type {import('tailwindcss').Config} */
const config = {
	presets: [preset],
	// Never add a .dark class: this keeps the OS dark mode preference from applying.
	darkMode: 'class',
	content: ["./src/**/*.{html,js,svelte,ts}"],
};

export default config;
