import preset from "./src/lib/design-tokens/tailwind-preset.cjs";
import flowbitePlugin from 'flowbite/plugin'

/** @type {import('tailwindcss').Config} */
const config = {
	presets: [preset],
	// Dark mode is disabled. 'class' (not default 'media') means flowbite-svelte's
	// built-in `dark:` utilities only apply under a `.dark` class — which we never
	// add — instead of reacting to the user's OS prefers-color-scheme.
	darkMode: 'class',
	content: ["./src/**/*.{html,js,svelte,ts}", './node_modules/flowbite-svelte/**/*.{html,js,svelte,ts}'],

	plugins: [flowbitePlugin],
};

export default config;
