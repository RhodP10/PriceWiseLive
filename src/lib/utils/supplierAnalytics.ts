import type { IngredientMasterDTO } from '$lib/types/recipe';
import type { SupplierChannel } from '$lib/types/statistics';

export interface IngredientSupplierCompare {
	ingredientId: string;
	name: string;
	catalogLanded: number;
	/** Lazada/Shopee are null when no explicit marketplace landed price is entered (> 0). */
	channels: { lazada: number | null; shopee: number | null; local: number };
	/** Channels tied at the minimum among comparable prices (each gets equal win credit). */
	tiedWinners: SupplierChannel[];
	savingsVsWorstPct: number;
}

/** Local catalog landed package (₱). */
function packageLandedLocal(m: IngredientMasterDTO): number {
	return m.packagePrice + m.shippingFee;
}

function explicitMarketplaceLanded(m: IngredientMasterDTO, ch: 'lazada' | 'shopee'): number | null {
	const v = m.supplierChannelLanded?.[ch];
	return typeof v === 'number' && v > 0 ? v : null;
}

export function buildIngredientSupplierCompares(items: IngredientMasterDTO[]): IngredientSupplierCompare[] {
	return items.map((m) => {
		const catalogLanded = packageLandedLocal(m);
		const lazada = explicitMarketplaceLanded(m, 'lazada');
		const shopee = explicitMarketplaceLanded(m, 'shopee');
		const local = catalogLanded;

		const candidates: { ch: SupplierChannel; v: number }[] = [{ ch: 'local', v: local }];
		if (lazada !== null) candidates.push({ ch: 'lazada', v: lazada });
		if (shopee !== null) candidates.push({ ch: 'shopee', v: shopee });

		const values = candidates.map((c) => c.v);
		const minV = Math.min(...values);
		const maxV = Math.max(...values);
		const tiedWinners = candidates.filter((c) => c.v === minV).map((c) => c.ch);
		const savingsVsWorstPct = maxV > 0 ? ((maxV - minV) / maxV) * 100 : 0;

		return {
			ingredientId: m.id,
			name: m.name,
			catalogLanded,
			channels: { lazada, shopee, local },
			tiedWinners,
			savingsVsWorstPct
		};
	});
}

export function supplierWinCounts(items: IngredientMasterDTO[]): Record<string, number> {
	const counts: Record<string, number> = { lazada: 0, shopee: 0, local: 0 };
	for (const row of buildIngredientSupplierCompares(items)) {
		const n = row.tiedWinners.length;
		if (n === 0) continue;
		const add = 1 / n;
		for (const ch of row.tiedWinners) {
			counts[ch] = (counts[ch] ?? 0) + add;
		}
	}
	return counts;
}

/** Label for snapshot row — channel name(s) with the highest “cheapest SKU” win score (ties shown as “A / B”). */
export function bestSupplierLabel(items: IngredientMasterDTO[]): string {
	const counts = supplierWinCounts(items);
	const entries = Object.entries(counts)
		.filter(([, v]) => v > 1e-6)
		.sort((a, b) => b[1] - a[1]);
	if (entries.length === 0) return '—';
	const top = entries[0]![1];
	const tops = entries.filter(([, v]) => Math.abs(v - top) < 1e-6).map(([k]) => k);
	return tops.map((k) => k.charAt(0).toUpperCase() + k.slice(1)).join(' / ');
}

export function avgLandedByChannel(compares: IngredientSupplierCompare[]): {
	lazada: number | null;
	shopee: number | null;
	local: number | null;
} {
	if (compares.length === 0) return { lazada: null, shopee: null, local: null };
	let lz = 0;
	let lzN = 0;
	let sh = 0;
	let shN = 0;
	let loc = 0;
	let locN = 0;
	for (const c of compares) {
		if (c.channels.lazada !== null) {
			lz += c.channels.lazada;
			lzN++;
		}
		if (c.channels.shopee !== null) {
			sh += c.channels.shopee;
			shN++;
		}
		if (c.channels.local > 0) {
			loc += c.channels.local;
			locN++;
		}
	}
	return {
		lazada: lzN > 0 ? lz / lzN : null,
		shopee: shN > 0 ? sh / shN : null,
		local: locN > 0 ? loc / locN : null
	};
}

/**
 * Average % by which `winner` is cheaper than `loser`, only among SKUs where winner &lt; loser.
 */
export function avgPctCheaperThan(
	items: IngredientMasterDTO[],
	winner: SupplierChannel,
	loser: SupplierChannel
): number | null {
	const compares = buildIngredientSupplierCompares(items);
	const pcts: number[] = [];
	for (const c of compares) {
		const w = c.channels[winner];
		const l = c.channels[loser];
		if (w === null || l === null || l <= 0 || w >= l) continue;
		pcts.push(((l - w) / l) * 100);
	}
	if (pcts.length === 0) return null;
	return pcts.reduce((a, b) => a + b, 0) / pcts.length;
}
