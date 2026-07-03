import type { UserConfig } from 'vite';
import preact from '@preact/preset-vite';

// https://vite.dev/config/
export default {
	plugins: [preact()],
	server: { host: '0.0.0.0' },
	base: './',
} satisfies UserConfig;
