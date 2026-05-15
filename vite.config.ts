import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

/** Same-origin `/api/*` → FastAPI on :8000 avoids browser CORS during `npm run dev`. */
const apiProxy = {
	'/api': {
		target: 'http://127.0.0.1:8000',
		changeOrigin: true,
		rewrite: (path: string) => path.replace(/^\/api/, '')
	}
} as const;

export default defineConfig({
	plugins: [tailwindcss(), sveltekit()],
	server: { proxy: apiProxy },
	preview: { proxy: apiProxy }
});
