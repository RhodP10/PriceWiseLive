import type { OtherItemMasterDTO } from '$lib/types/recipe';
import type { ChannelLandedPrices } from '$lib/types/statistics';

function ch(base: number, skew: number): ChannelLandedPrices {
	const s = skew * 0.012;
	return {
		lazada: Math.round(base * (1.06 + s)),
		shopee: Math.round(base * (0.98 - s * 0.4)),
		local: Math.round(base * (0.94 + s * 0.25))
	};
}

function o(row: Omit<OtherItemMasterDTO, 'unitCost'> & { unitCost?: number }): OtherItemMasterDTO {
	const unitCost =
		row.unitCost ??
		(row.baseQuantity > 0 ? (row.packagePrice + row.shippingFee) / row.baseQuantity : 0);
	return { ...row, unitCost };
}

export const mockOtherMasters: OtherItemMasterDTO[] = [
	o({
		id: 'oid_cup12oz',
		name: '12oz cup + lid',
		supplier: 'Packaging Supply',
		packagePrice: 850,
		packageSize: 100,
		packageUnit: 'piece',
		shippingFee: 0,
		baseQuantity: 100,
		baseUnit: 'piece',
		unitCost: 8.5,
		supplierChannelLanded: ch(850, 1)
	}),
	o({
		id: 'oid_cup8oz',
		name: 'Paper cup 8oz',
		supplier: 'Packaging Supply',
		packagePrice: 600,
		packageSize: 100,
		packageUnit: 'piece',
		shippingFee: 0,
		baseQuantity: 100,
		baseUnit: 'piece',
		unitCost: 6,
		supplierChannelLanded: ch(600, 2)
	}),
	o({
		id: 'oid_sleeve_lid',
		name: 'Sleeve + lid set',
		supplier: 'Packaging Supply',
		packagePrice: 350,
		packageSize: 100,
		packageUnit: 'piece',
		shippingFee: 0,
		baseQuantity: 100,
		baseUnit: 'piece',
		unitCost: 3.5,
		supplierChannelLanded: ch(350, 3)
	})
];
