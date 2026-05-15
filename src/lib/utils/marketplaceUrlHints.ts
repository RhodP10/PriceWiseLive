import type { ChannelMarketplace } from '$lib/types/recipe';

/** Parsed Shopee listing IDs from a standard product URL (`…-i.{shopId}.{itemId}`). */
export type ShopeeIds = { shopId: string; itemId: string; origin: string };

/**
 * Extract shop/item IDs from a Shopee product URL (desktop). Short/mobile-only links may not parse.
 * Pattern: path ends with `-i.{shopId}.{itemId}` or contains `.i.{shopId}.{itemId}` before query string.
 */
export function parseShopeeProductUrl(raw: string): ShopeeIds | null {
	const trimmed = raw.trim();
	if (!trimmed) return null;
	let url: URL;
	try {
		url = new URL(trimmed);
	} catch {
		return null;
	}
	const host = url.hostname.toLowerCase();
	if (!host.includes('shopee.')) return null;

	const path = url.pathname.replace(/\/$/, '');
	let m = path.match(/-i\.(\d+)\.(\d+)$/);
	if (!m) m = path.match(/\.i\.(\d+)\.(\d+)$/);
	if (!m) return null;
	const [, shopId, itemId] = m;
	const origin = `${url.protocol}//${url.host}`;
	return { shopId, itemId, origin };
}

/** Public item JSON endpoint used by Shopee web app (same origin as the storefront). */
export function shopeeItemGetApiUrl(ids: ShopeeIds): string {
	const q = new URLSearchParams({ itemid: ids.itemId, shopid: ids.shopId });
	return `${ids.origin}/api/v4/item/get?${q.toString()}`;
}

export function marketplaceGuideTitle(channel: ChannelMarketplace): string {
	return channel === 'shopee'
		? 'Shopee: fetch PDP JSON (names vary by region)'
		: 'Lazada: page globals + SKU (more reliable than random XHR)';
}
