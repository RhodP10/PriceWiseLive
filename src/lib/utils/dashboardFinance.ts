import { monthlyOpexTotal } from '$lib/state/opexStore.svelte';
import { getRecipeOrdersPerMonth } from '$lib/state/summarySales.svelte';
import type { IngredientMasterDTO, OtherItemMasterDTO, RecipeDTO } from '$lib/types/recipe';
import {
	computeSpreadsheetCosting,
	perOrderTotalCost,
	type CostingSettingsInput
} from '$lib/utils/recipeCosting';

export interface LiveMonthKpis {
	yearMonth: string;
	totalOpex: number;
	totalRevenue: number;
	grossProfit: number;
	netProfit: number;
	profitMarginPct: number;
}

function currentYearMonth(): string {
	const d = new Date();
	return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/** Live KPIs from current Summary inputs (orders/mo, local prices, COGS, OPEX lines). */
export function computeLiveMonthKpis(
	recipes: RecipeDTO[],
	ingredientMasters: IngredientMasterDTO[],
	otherMasters: OtherItemMasterDTO[]
): LiveMonthKpis {
	const totalOpex = monthlyOpexTotal();
	let totalRevenue = 0;
	let grossProfit = 0;
	for (const r of recipes) {
		const orders = getRecipeOrdersPerMonth(r.id);
		if (orders <= 0) continue;
		const cogs = perOrderTotalCost(r, ingredientMasters, otherMasters);
		const price = r.pricing.local;
		totalRevenue += price * orders;
		grossProfit += (price - cogs) * orders;
	}
	const netProfit = grossProfit - totalOpex;
	const profitMarginPct = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;
	return {
		yearMonth: currentYearMonth(),
		totalOpex,
		totalRevenue,
		grossProfit,
		netProfit,
		profitMarginPct
	};
}

/** Mean list price for a channel. Shopee/Lazada use only recipes with a price > 0 (unset marketplace prices excluded). */
export function averageChannelPrice(
	recipes: RecipeDTO[],
	channel: 'local' | 'shopee' | 'lazada'
): number | null {
	if (recipes.length === 0) return null;
	if (channel === 'local') {
		const sum = recipes.reduce((s, r) => s + (Number.isFinite(r.pricing.local) ? r.pricing.local : 0), 0);
		return sum / recipes.length;
	}
	const vals = recipes.map((r) => r.pricing[channel]).filter((v) => Number.isFinite(v) && v > 0);
	if (vals.length === 0) return null;
	return vals.reduce((s, v) => s + v, 0) / vals.length;
}

/** Mean suggested selling price from costing engine across recipes. */
export function averageSuggestedPrice(
	recipes: RecipeDTO[],
	ingredientMasters: IngredientMasterDTO[],
	otherMasters: OtherItemMasterDTO[],
	settings: CostingSettingsInput
): number {
	if (recipes.length === 0) return 0;
	let sum = 0;
	for (const r of recipes) {
		const sheet = computeSpreadsheetCosting(r, ingredientMasters, otherMasters, settings);
		sum += sheet.perOrder.regularSellingPrice;
	}
	return sum / recipes.length;
}
