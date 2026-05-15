/** Shared API origin; set `VITE_API_URL` in `.env` to override (full URL, no trailing slash). */
const envUrl = typeof import.meta.env?.VITE_API_URL === 'string' ? import.meta.env.VITE_API_URL.trim() : '';

/**
 * In dev, call same-origin `/api` so Vite proxies to FastAPI — no CORS.
 * Production / preview without env: direct backend URL (set `VITE_API_URL` when frontend and API differ).
 */
export const API_BASE =
	envUrl !== ''
		? envUrl
		: import.meta.env.DEV
			? '/api'
			: 'http://localhost:8000';
