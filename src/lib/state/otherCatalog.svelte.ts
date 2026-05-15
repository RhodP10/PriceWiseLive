import { mockOtherMasters } from '$lib/data/mockOtherMasters';
import type {
	ChannelMarketplace,
	ChannelScrapeInfo,
	MeasureUnit,
	OtherItemMasterDTO,
	OtherItemMasterInput,
	UnitCostHistoryEntry
} from '$lib/types/recipe';
import type { ChannelLandedPrices } from '$lib/types/statistics';
import { mergeChannelLanded } from '$lib/utils/marketplaceJsonImport';
import { computeUnitCost, toBaseQuantity } from '$lib/utils/baseUnitCost';

export const otherCatalog = $state({
	items: structuredClone(mockOtherMasters) as OtherItemMasterDTO[]
});

export function computeOtherUnitCost(input: {
	packagePrice: number;
	shippingFee: number;
	packageSize: number;
	packageUnit: MeasureUnit;
}): number {
	const base = toBaseQuantity(input.packageSize, input.packageUnit);
	if (base.quantity <= 0) return 0;
	return computeUnitCost(input.packagePrice, input.shippingFee, base.quantity);
}

function mergeChannelScrape(
	prev: OtherItemMasterDTO['channelScrape'],
	patch: Partial<Record<ChannelMarketplace, Partial<ChannelScrapeInfo>>>
): OtherItemMasterDTO['channelScrape'] {
	const next: NonNullable<OtherItemMasterDTO['channelScrape']> = { ...prev };
	for (const [k, v] of Object.entries(patch) as [ChannelMarketplace, Partial<ChannelScrapeInfo>][]) {
		const merged = { ...prev?.[k], ...v };
		next[k] = {
			status: merged.status ?? prev?.[k]?.status ?? 'idle',
			url: merged.url,
			updatedAt: merged.updatedAt,
			listingPackageSize: merged.listingPackageSize,
			listingPackageUnit: merged.listingPackageUnit,
			listingShippingFee: merged.listingShippingFee,
			listingBaseQuantity: merged.listingBaseQuantity,
			listingBaseUnit: merged.listingBaseUnit
		};
	}
	return next;
}

function newId(): string {
	if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
	return `oid_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

const MAX_UNIT_COST_HISTORY = 36;

function trimHistory(h: UnitCostHistoryEntry[]): UnitCostHistoryEntry[] {
	if (h.length <= MAX_UNIT_COST_HISTORY) return h;
	return h.slice(h.length - MAX_UNIT_COST_HISTORY);
}

export function addOtherMaster(input: OtherItemMasterInput): OtherItemMasterDTO {
	const base = toBaseQuantity(input.packageSize, input.packageUnit);
	const unitCost = computeUnitCost(input.packagePrice, input.shippingFee, base.quantity);
	const now = new Date().toISOString();
	const row: OtherItemMasterDTO = {
		id: newId(),
		name: input.name.trim(),
		supplier: input.supplier.trim(),
		packagePrice: input.packagePrice,
		packageSize: input.packageSize,
		packageUnit: input.packageUnit,
		shippingFee: input.shippingFee,
		baseQuantity: base.quantity,
		baseUnit: base.unit,
		unitCost,
		addedAt: now,
		unitCostHistory: [{ recordedAt: now, unitCost }],
		marketplaceSourcingLocalOnly: input.marketplaceSourcingLocalOnly === true
	};
	otherCatalog.items = [...otherCatalog.items, row];
	return row;
}

export function updateOtherMaster(
	id: string,
	patch: Partial<
		Pick<
			OtherItemMasterDTO,
			| 'name'
			| 'supplier'
			| 'packagePrice'
			| 'packageSize'
			| 'packageUnit'
			| 'shippingFee'
			| 'marketplaceSourcingLocalOnly'
		>
	> & {
		channelScrape?: Partial<Record<ChannelMarketplace, Partial<ChannelScrapeInfo>>>;
		supplierChannelLanded?: Partial<ChannelLandedPrices>;
	}
): void {
	otherCatalog.items = otherCatalog.items.map((m) => {
		if (m.id !== id) return m;
		const { channelScrape: chPatch, supplierChannelLanded: landedPatch, ...fieldPatch } = patch;
		const next: OtherItemMasterDTO = {
			...m,
			...fieldPatch,
			name: patch.name !== undefined ? patch.name.trim() : m.name,
			supplier: patch.supplier !== undefined ? patch.supplier.trim() : m.supplier
		};
		if (landedPatch) {
			next.supplierChannelLanded = mergeChannelLanded(m.supplierChannelLanded, landedPatch);
		}
		if (chPatch) {
			next.channelScrape = mergeChannelScrape(m.channelScrape, chPatch);
		}
		if (
			patch.packagePrice !== undefined ||
			patch.packageSize !== undefined ||
			patch.shippingFee !== undefined ||
			patch.packageUnit !== undefined
		) {
			const prevUnit = m.unitCost;
			const base = toBaseQuantity(next.packageSize, next.packageUnit);
			next.baseQuantity = base.quantity;
			next.baseUnit = base.unit;
			next.unitCost = computeUnitCost(next.packagePrice, next.shippingFee, next.baseQuantity);
			if (Math.abs(next.unitCost - prevUnit) > 1e-6) {
				const ts = new Date().toISOString();
				const hist = trimHistory([...(m.unitCostHistory ?? []), { recordedAt: ts, unitCost: next.unitCost }]);
				next.unitCostHistory = hist;
				next.addedAt = m.addedAt ?? hist[0]?.recordedAt ?? ts;
			} else {
				next.unitCostHistory = m.unitCostHistory;
				next.addedAt = m.addedAt;
			}
		} else {
			next.unitCostHistory = m.unitCostHistory;
			next.addedAt = m.addedAt;
		}
		return next;
	});
}

export function deleteOtherMaster(id: string): void {
	otherCatalog.items = otherCatalog.items.filter((m) => m.id !== id);
}

export function getOtherMaster(id: string): OtherItemMasterDTO | undefined {
	return otherCatalog.items.find((m) => m.id === id);
}

export function resetOtherCatalog(): void {
	otherCatalog.items = structuredClone(mockOtherMasters);
}

export function replaceOtherCatalogItems(next: OtherItemMasterDTO[]): void {
	otherCatalog.items = structuredClone(next);
}
