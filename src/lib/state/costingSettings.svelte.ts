/** Global costing inputs (VAT, batch, margin, discount) — used in recipe detail costing panel */
export const costingSettings = $state({
	vatRegistered: false,
	vatPct: 12,
	batchSize: 1,
	targetMarginPct: 70,
	discountPct: 20
});

const DEFAULTS = {
	vatRegistered: false,
	vatPct: 12,
	batchSize: 1,
	targetMarginPct: 70,
	discountPct: 20
} as const;

export function replaceCostingSettings(
	next: Partial<{
		vatRegistered: boolean;
		vatPct: number;
		batchSize: number;
		targetMarginPct: number;
		discountPct: number;
	}> | null | undefined
): void {
	const n = { ...DEFAULTS, ...next };
	costingSettings.vatRegistered = n.vatRegistered;
	costingSettings.vatPct = n.vatPct;
	costingSettings.batchSize = n.batchSize;
	costingSettings.targetMarginPct = n.targetMarginPct;
	costingSettings.discountPct = n.discountPct;
}
