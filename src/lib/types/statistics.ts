/** Per-recipe sales when saving Summary → Statistics (recipes with orders > 0; empty when none) */
export interface RecipeSalesSnapshotEntry {
	recipeId: string;
	recipeName: string;
	orders: number;
	revenue: number;
	profit: number;
}

/** Saved row in monthly history (Statistics dashboard) */
export interface MonthlyFinancialSnapshot {
	id: string;
	yearMonth: string;
	totalOpex: number;
	totalRevenue: number;
	grossProfit: number;
	netProfit: number;
	profitMarginPct: number;
	bestSupplier: string;
	generatedAt: string;
	/** Present when save included at least one recipe with orders > 0 */
	recipeBreakdown?: RecipeSalesSnapshotEntry[];
}

export type SupplierChannel = 'lazada' | 'shopee' | 'local';

export interface ChannelLandedPrices {
	lazada: number;
	shopee: number;
	local: number;
}
