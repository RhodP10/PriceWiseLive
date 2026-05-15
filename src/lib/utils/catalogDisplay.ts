/** Display helpers for ingredient / other catalog rows (Smart Pricing dates). */

export function formatCatalogDate(iso?: string): string {
	if (!iso?.trim()) return '—';
	const d = new Date(iso);
	if (Number.isNaN(d.getTime())) return '—';
	return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

/** Compact for dense tables (fits narrow columns). */
export function formatCatalogDateShort(iso?: string): string {
	if (!iso?.trim()) return '—';
	const d = new Date(iso);
	if (Number.isNaN(d.getTime())) return '—';
	return d.toLocaleDateString(undefined, { month: 'numeric', day: 'numeric', year: '2-digit' });
}

export function lastCostLogIso(row: {
	addedAt?: string;
	unitCostHistory?: { recordedAt: string }[];
}): string | undefined {
	const h = row.unitCostHistory;
	if (h?.length) return h[h.length - 1]!.recordedAt;
	return row.addedAt;
}
