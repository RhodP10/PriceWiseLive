import type { MonthlyFinancialSnapshot } from '$lib/types/statistics';

/** One saved row per calendar month (latest `generatedAt` wins for rollups / charts). */
export function pickLatestSnapshotPerYearMonth(rows: MonthlyFinancialSnapshot[]): MonthlyFinancialSnapshot[] {
	const byYm = new Map<string, MonthlyFinancialSnapshot>();
	for (const r of rows) {
		const cur = byYm.get(r.yearMonth);
		if (
			!cur ||
			r.generatedAt > cur.generatedAt ||
			(r.generatedAt === cur.generatedAt && r.id > cur.id)
		) {
			byYm.set(r.yearMonth, r);
		}
	}
	return [...byYm.values()].sort((a, b) => a.yearMonth.localeCompare(b.yearMonth));
}

export interface PeriodKpiDisplay {
	totalOpex: number;
	totalRevenue: number;
	grossProfit: number;
	netProfit: number;
	profitMarginPct: number;
	hasData: boolean;
}

export function emptyPeriodKpis(): PeriodKpiDisplay {
	return {
		totalOpex: 0,
		totalRevenue: 0,
		grossProfit: 0,
		netProfit: 0,
		profitMarginPct: 0,
		hasData: false
	};
}

export function kpisFromSnapshotRow(row: MonthlyFinancialSnapshot | null): PeriodKpiDisplay {
	if (!row) return emptyPeriodKpis();
	const profitMarginPct =
		row.totalRevenue > 0 ? (row.netProfit / row.totalRevenue) * 100 : row.profitMarginPct;
	return {
		totalOpex: row.totalOpex,
		totalRevenue: row.totalRevenue,
		grossProfit: row.grossProfit,
		netProfit: row.netProfit,
		profitMarginPct,
		hasData: true
	};
}

/** Latest snapshot among all rows for the same `yearMonth` (multiple Summary saves). */
export function latestSnapshotForYearMonth(
	rows: MonthlyFinancialSnapshot[],
	yearMonth: string
): MonthlyFinancialSnapshot | null {
	const matches = rows.filter((r) => r.yearMonth === yearMonth);
	if (matches.length === 0) return null;
	return matches.reduce((a, b) => (a.generatedAt >= b.generatedAt ? a : b));
}

export function addCalendarMonths(yearMonth: string, delta: number): string {
	const [yStr, mStr] = yearMonth.split('-');
	const y = Number(yStr);
	const m = Number(mStr);
	if (!Number.isFinite(y) || !Number.isFinite(m)) return yearMonth;
	const d = new Date(y, m - 1 + delta, 1);
	return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/** Sum latest-per-month snapshots for `year` (YYYY). */
export function rollupYearFromSummaries(
	rows: MonthlyFinancialSnapshot[],
	year: string
): PeriodKpiDisplay {
	const prefix = `${year}-`;
	const inYear = rows.filter((r) => r.yearMonth.startsWith(prefix));
	const latestPerMonth = pickLatestSnapshotPerYearMonth(inYear);
	if (latestPerMonth.length === 0) return emptyPeriodKpis();
	let totalOpex = 0;
	let totalRevenue = 0;
	let grossProfit = 0;
	let netProfit = 0;
	for (const r of latestPerMonth) {
		totalOpex += r.totalOpex;
		totalRevenue += r.totalRevenue;
		grossProfit += r.grossProfit;
		netProfit += r.netProfit;
	}
	const profitMarginPct = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;
	return {
		totalOpex,
		totalRevenue,
		grossProfit,
		netProfit,
		profitMarginPct,
		hasData: true
	};
}
