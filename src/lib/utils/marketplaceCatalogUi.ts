import type { ChannelMarketplace, IngredientMasterDTO, OtherItemMasterDTO } from '$lib/types/recipe';
import {
	channelLandedPackagePeso,
	channelUnitCostFromLanded,
	displayScrapeStatus,
	showMarketplaceLandedPrice,
	type DisplayScrapeState
} from '$lib/utils/channelCatalogDisplay';

export type StatusTier = 'success' | 'processing' | 'warning' | 'error';

export interface MarketplaceStatusPresentation {
	tier: StatusTier;
	shortLabel: string;
	description: string;
	pulse: boolean;
	shimmer: boolean;
	badgeClass: string;
	glowClass: string;
}

/** Rich dashboard-style status copy (no raw supplier names). */
export function marketplaceStatusPresentation(
	row: Pick<IngredientMasterDTO, 'supplierChannelLanded' | 'channelScrape'> &
		Pick<OtherItemMasterDTO, 'supplierChannelLanded' | 'channelScrape'> & {
			marketplaceSourcingLocalOnly?: boolean;
		},
	channel: ChannelMarketplace
): MarketplaceStatusPresentation {
	if (row.marketplaceSourcingLocalOnly === true) {
		return {
			tier: 'success',
			shortLabel: 'Local-only',
			description:
				'Marketplace COGS for recipes uses your catalog unit cost — no listing required for this SKU.',
			pulse: false,
			shimmer: false,
			badgeClass:
				'bg-violet-500/15 text-violet-800 ring-violet-500/25 dark:bg-violet-500/20 dark:text-violet-100',
			glowClass: ''
		};
	}
	const st = displayScrapeStatus(row, channel);
	const meta = row.channelScrape?.[channel];
	const landed = row.supplierChannelLanded?.[channel] ?? 0;

	const updatedHint = meta?.updatedAt
		? formatRelativeTime(meta.updatedAt)
		: meta?.url?.trim()
			? 'Listing hint saved'
			: '';

	switch (st) {
		case 'complete':
			return {
				tier: 'success',
				shortLabel: 'Synced',
				description: landed > 0 ? `Marketplace landed total verified · ${updatedHint || 'Updated'}` : 'Verified',
				pulse: true,
				shimmer: false,
				badgeClass:
					'bg-emerald-500/15 text-emerald-800 ring-emerald-500/25 dark:bg-emerald-500/20 dark:text-emerald-100',
				glowClass: 'shadow-[0_0_20px_-4px_rgba(16,185,129,0.45)]'
			};
		case 'scraping':
			return {
				tier: 'processing',
				shortLabel: 'Fetching listings',
				description: 'Pulling latest marketplace prices…',
				pulse: false,
				shimmer: true,
				badgeClass:
					'bg-amber-500/15 text-amber-900 ring-amber-500/30 dark:bg-amber-500/20 dark:text-amber-50',
				glowClass: ''
			};
		case 'pending':
			return {
				tier: 'processing',
				shortLabel: 'Queued',
				description: meta?.url?.trim()
					? 'Listing URL saved — awaiting sync'
					: 'Awaiting marketplace sync',
				pulse: false,
				shimmer: false,
				badgeClass:
					'bg-sky-500/15 text-sky-900 ring-sky-500/25 dark:bg-sky-500/20 dark:text-sky-50',
				glowClass: ''
			};
		case 'error':
			return {
				tier: 'error',
				shortLabel: 'Sync issue',
				description: 'Marketplace data unavailable — retry sync',
				pulse: false,
				shimmer: false,
				badgeClass: 'bg-rose-500/15 text-rose-800 ring-rose-500/25 dark:bg-rose-900/40 dark:text-rose-100',
				glowClass: ''
			};
		case 'idle':
		default:
			return {
				tier: 'warning',
				shortLabel: 'Awaiting data',
				description:
					landed > 0 ? 'Estimate ready — mark scrape complete to unlock' : 'No marketplace listing matched yet',
				pulse: false,
				shimmer: false,
				badgeClass: 'bg-zinc-500/10 text-zinc-600 ring-zinc-400/20 dark:bg-zinc-600/30 dark:text-zinc-200',
				glowClass: ''
			};
	}
}

export function formatRelativeTime(iso: string): string {
	const t = new Date(iso).getTime();
	if (Number.isNaN(t)) return '';
	const sec = Math.round((Date.now() - t) / 1000);
	if (sec < 60) return 'Updated just now';
	if (sec < 3600) return `Updated ${Math.floor(sec / 60)} min ago`;
	if (sec < 86400) return `Updated ${Math.floor(sec / 3600)} hr ago`;
	return `Updated ${Math.floor(sec / 86400)} d ago`;
}

/** Delta vs local unit economics (positive = marketplace unit higher than local). */
export function marketplaceVsLocalMarginPct(
	row: IngredientMasterDTO | OtherItemMasterDTO,
	channel: ChannelMarketplace
): number | null {
	const ch = channelUnitCostFromLanded(row, channel);
	if (ch === null || row.unitCost <= 0) return null;
	return ((ch - row.unitCost) / row.unitCost) * 100;
}

export type CatalogRow = IngredientMasterDTO | OtherItemMasterDTO;

export function aggregateMarketplacePrices(
	items: CatalogRow[],
	channel: ChannelMarketplace
): { avg: number | null; min: number | null; max: number | null; withData: number } {
	const vals: number[] = [];
	for (const row of items) {
		const p = channelLandedPackagePeso(row, channel);
		if (p !== null && p > 0) vals.push(p);
	}
	if (vals.length === 0) return { avg: null, min: null, max: null, withData: 0 };
	const sum = vals.reduce((a, b) => a + b, 0);
	return {
		avg: sum / vals.length,
		min: Math.min(...vals),
		max: Math.max(...vals),
		withData: vals.length
	};
}

export function listingAvailabilityPct(items: CatalogRow[], channel: ChannelMarketplace): number {
	if (items.length === 0) return 0;
	let ok = 0;
	for (const row of items) {
		if (showMarketplaceLandedPrice(row, channel)) ok++;
	}
	return Math.round((ok / items.length) * 100);
}
