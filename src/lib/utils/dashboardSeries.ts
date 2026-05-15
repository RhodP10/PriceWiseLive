import type { MonthlyFinancialSnapshot } from '$lib/types/statistics';
import {
	pickLatestSnapshotPerYearMonth
} from '$lib/utils/summaryPeriodKpis';
import type { LiveMonthKpis } from '$lib/utils/dashboardFinance';

export interface MonthlySeriesPoint {
	yearMonth: string;
	revenue: number;
	netProfit: number;
	grossProfit: number;
}

export function pctChange(prev: number, next: number): number {
	if (prev === 0) return next === 0 ? 0 : 100;
	return ((next - prev) / Math.abs(prev)) * 100;
}

/**
 * Merge saved monthly snapshots with the current live month, sort by month, keep last N points.
 */
export function buildMonthlySeries(
	savedRows: MonthlyFinancialSnapshot[],
	live: LiveMonthKpis,
	maxPoints: number
): MonthlySeriesPoint[] {
	const byMonth = new Map<string, MonthlySeriesPoint>();
	const collapsedSaved = pickLatestSnapshotPerYearMonth(savedRows);
	for (const r of collapsedSaved) {
		byMonth.set(r.yearMonth, {
			yearMonth: r.yearMonth,
			revenue: r.totalRevenue,
			netProfit: r.netProfit,
			grossProfit: r.grossProfit
		});
	}
	byMonth.set(live.yearMonth, {
		yearMonth: live.yearMonth,
		revenue: live.totalRevenue,
		netProfit: live.netProfit,
		grossProfit: live.grossProfit
	});
	const sorted = [...byMonth.values()].sort((a, b) => a.yearMonth.localeCompare(b.yearMonth));
	if (sorted.length <= maxPoints) return sorted;
	return sorted.slice(-maxPoints);
}
