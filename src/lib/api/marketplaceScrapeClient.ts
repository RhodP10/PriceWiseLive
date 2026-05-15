import { API_BASE } from '$lib/api/apiBase';
import type { ChannelMarketplace } from '$lib/types/recipe';

export type ScrapeMarketplaceResult =
	| { ok: true; bodyJson: string }
	| { ok: false; error: string };

function parseJsonSafe(raw: string): unknown {
	try {
		return JSON.parse(raw) as unknown;
	} catch {
		return null;
	}
}

/**
 * Server-side Playwright capture (Chromium). Start the FastAPI backend and run
 * `playwright install chromium` in the backend venv once.
 */
export async function scrapeMarketplaceFromBrowser(
	url: string,
	marketplace: ChannelMarketplace
): Promise<ScrapeMarketplaceResult> {
	try {
		const res = await fetch(`${API_BASE}/marketplace/scrape`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ url, marketplace })
		});

		const rawText = await res.text();
		const parsed = parseJsonSafe(rawText);

		if (parsed === null) {
			const snippet = rawText.trim().slice(0, 280);
			return {
				ok: false,
				error:
					snippet ||
					`HTTP ${res.status} ${res.statusText || ''}`.trim() ||
					'Invalid response from API (not JSON). Is the backend running?'
			};
		}

		const data = parsed as {
			ok?: boolean;
			body_json?: string | null;
			error?: string | null;
			detail?: unknown;
		};

		if (!res.ok) {
			const detail =
				typeof data.detail === 'string'
					? data.detail
					: Array.isArray(data.detail)
						? data.detail.map((d) => String(d)).join('; ')
						: res.statusText || 'Scrape request failed';
			return { ok: false, error: detail };
		}

		if (data.ok && data.body_json) {
			return { ok: true, bodyJson: data.body_json };
		}
		return { ok: false, error: data.error || 'Scrape returned no data' };
	} catch (e) {
		return {
			ok: false,
			error:
				e instanceof Error
					? e.message
					: 'Could not reach the API. Is the PriceWise backend running?'
		};
	}
}
