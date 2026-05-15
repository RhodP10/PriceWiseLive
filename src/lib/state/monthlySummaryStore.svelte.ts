import type { MonthlyFinancialSnapshot } from '$lib/types/statistics';

export const monthlySummaryStore = $state({
	rows: [] as MonthlyFinancialSnapshot[]
});

function newId(): string {
	if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
	return `ms_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function upsertMonthlySnapshot(
	row: Omit<MonthlyFinancialSnapshot, 'id' | 'generatedAt'> & { id?: string; generatedAt?: string }
): void {
	const generatedAt = row.generatedAt ?? new Date().toISOString();
	const id = row.id ?? newId();
	const next: MonthlyFinancialSnapshot = {
		id,
		yearMonth: row.yearMonth,
		totalOpex: row.totalOpex,
		totalRevenue: row.totalRevenue,
		grossProfit: row.grossProfit,
		netProfit: row.netProfit,
		profitMarginPct: row.profitMarginPct,
		bestSupplier: row.bestSupplier,
		generatedAt,
		...(row.recipeBreakdown !== undefined ? { recipeBreakdown: row.recipeBreakdown } : {})
	};
	const idx = monthlySummaryStore.rows.findIndex((r) => r.id === next.id);
	const merged =
		idx >= 0
			? monthlySummaryStore.rows.map((r, i) => (i === idx ? next : r))
			: [...monthlySummaryStore.rows, next];
	monthlySummaryStore.rows = [...merged].sort((a, b) => {
		const ym = a.yearMonth.localeCompare(b.yearMonth);
		if (ym !== 0) return ym;
		const g = a.generatedAt.localeCompare(b.generatedAt);
		if (g !== 0) return g;
		return a.id.localeCompare(b.id, undefined, { numeric: true });
	});
}

export function deleteMonthlySnapshot(id: string): void {
	monthlySummaryStore.rows = monthlySummaryStore.rows.filter((r) => r.id !== id);
}

export function replaceMonthlySummariesFromApi(next: MonthlyFinancialSnapshot[]): void {
	monthlySummaryStore.rows = structuredClone(next).sort((a, b) => {
		const ym = a.yearMonth.localeCompare(b.yearMonth);
		if (ym !== 0) return ym;
		return a.generatedAt.localeCompare(b.generatedAt);
	});
}

export function resetMonthlySummaryStore(): void {
	monthlySummaryStore.rows = [];
}
