import type { MonthlyFinancialSnapshot, RecipeSalesSnapshotEntry } from '$lib/types/statistics';

import { API_BASE } from '$lib/api/apiBase';

type ApiRecipeBreakdown = {
	recipe_id: string;
	recipe_name: string;
	orders: number;
	revenue: number;
	profit: number;
};

export type ApiMonthlySnapshot = {
	id: number;
	year_month: string;
	total_opex: number;
	total_revenue: number;
	gross_profit: number;
	net_profit: number;
	profit_margin_pct: number;
	best_supplier: string;
	generated_at: string;
	recipe_breakdown: ApiRecipeBreakdown[] | null;
};

export function apiMonthlySnapshotToClient(a: ApiMonthlySnapshot): MonthlyFinancialSnapshot {
	const recipeBreakdown: RecipeSalesSnapshotEntry[] | undefined = a.recipe_breakdown?.length
		? a.recipe_breakdown.map((x) => ({
				recipeId: x.recipe_id,
				recipeName: x.recipe_name,
				orders: x.orders,
				revenue: x.revenue,
				profit: x.profit
			}))
		: undefined;
	const row: MonthlyFinancialSnapshot = {
		id: String(a.id),
		yearMonth: a.year_month,
		totalOpex: a.total_opex,
		totalRevenue: a.total_revenue,
		grossProfit: a.gross_profit,
		netProfit: a.net_profit,
		profitMarginPct: a.profit_margin_pct,
		bestSupplier: a.best_supplier,
		generatedAt: a.generated_at
	};
	if (recipeBreakdown?.length) row.recipeBreakdown = recipeBreakdown;
	return row;
}

function createBodyFromSnapshot(
	row: Pick<
		MonthlyFinancialSnapshot,
		| 'yearMonth'
		| 'totalOpex'
		| 'totalRevenue'
		| 'grossProfit'
		| 'netProfit'
		| 'profitMarginPct'
		| 'bestSupplier'
	> & { recipeBreakdown?: RecipeSalesSnapshotEntry[] }
): Record<string, unknown> {
	return {
		year_month: row.yearMonth,
		total_opex: row.totalOpex,
		total_revenue: row.totalRevenue,
		gross_profit: row.grossProfit,
		net_profit: row.netProfit,
		profit_margin_pct: row.profitMarginPct,
		best_supplier: row.bestSupplier,
		recipe_breakdown: row.recipeBreakdown?.length
			? row.recipeBreakdown.map((x) => ({
					recipe_id: x.recipeId,
					recipe_name: x.recipeName,
					orders: x.orders,
					revenue: x.revenue,
					profit: x.profit
				}))
			: null
	};
}

export async function fetchMonthlySummaries(token: string): Promise<MonthlyFinancialSnapshot[]> {
	const res = await fetch(`${API_BASE}/monthly-summaries`, {
		headers: { Authorization: `Bearer ${token}` }
	});
	if (!res.ok) throw new Error(`monthly-summaries GET ${res.status}`);
	const data = (await res.json()) as ApiMonthlySnapshot[];
	return data.map(apiMonthlySnapshotToClient);
}

export async function upsertMonthlySummaryOnServer(
	token: string,
	row: Pick<
		MonthlyFinancialSnapshot,
		| 'yearMonth'
		| 'totalOpex'
		| 'totalRevenue'
		| 'grossProfit'
		| 'netProfit'
		| 'profitMarginPct'
		| 'bestSupplier'
	> & { recipeBreakdown?: RecipeSalesSnapshotEntry[] }
): Promise<MonthlyFinancialSnapshot> {
	const res = await fetch(`${API_BASE}/monthly-summaries`, {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${token}`,
			'Content-Type': 'application/json'
		},
		body: JSON.stringify(createBodyFromSnapshot(row))
	});
	if (!res.ok) {
		const text = await res.text();
		throw new Error(text || `monthly-summaries POST ${res.status}`);
	}
	const data = (await res.json()) as ApiMonthlySnapshot;
	return apiMonthlySnapshotToClient(data);
}

export async function deleteMonthlySummaryOnServer(token: string, snapshotId: string): Promise<void> {
	const res = await fetch(`${API_BASE}/monthly-summaries/${encodeURIComponent(snapshotId)}`, {
		method: 'DELETE',
		headers: { Authorization: `Bearer ${token}` }
	});
	if (res.status === 404) throw new Error('Snapshot not found');
	if (!res.ok) throw new Error(`monthly-summaries DELETE ${res.status}`);
}
