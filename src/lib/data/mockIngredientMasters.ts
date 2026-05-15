import type { IngredientMasterDTO } from '$lib/types/recipe';

function m(row: Omit<IngredientMasterDTO, 'unitCost'> & { unitCost?: number }): IngredientMasterDTO {
	const unitCost =
		row.unitCost ??
		(row.baseQuantity > 0 ? (row.packagePrice + row.shippingFee) / row.baseQuantity : 0);
	return { ...row, unitCost };
}

/** Seed catalog — aligns with starter recipes */
export const mockIngredientMasters: IngredientMasterDTO[] = [
	m({
		id: 'mid_matcha',
		name: 'Matcha powder',
		supplier: 'Tea Supply Co.',
		packagePrice: 625,
		packageSize: 1,
		packageUnit: 'kg',
		shippingFee: 0,
		baseQuantity: 1000,
		baseUnit: 'g',
		unitCost: 0.625
	}),
	m({
		id: 'mid_strawberry_syrup',
		name: 'Strawberry syrup',
		supplier: 'Syrups PH',
		packagePrice: 420,
		packageSize: 1,
		packageUnit: 'l',
		shippingFee: 50,
		baseQuantity: 1000,
		baseUnit: 'ml',
		unitCost: (420 + 50) / 1000
	}),
	m({
		id: 'mid_milk',
		name: 'Whole milk',
		supplier: 'Fresh Dairy',
		packagePrice: 95,
		packageSize: 1,
		packageUnit: 'l',
		shippingFee: 0,
		baseQuantity: 1000,
		baseUnit: 'ml',
		unitCost: 0.095
	}),
	m({
		id: 'mid_ice',
		name: 'Ice',
		supplier: 'Internal',
		packagePrice: 40,
		packageSize: 2,
		packageUnit: 'kg',
		shippingFee: 0,
		baseQuantity: 2000,
		baseUnit: 'g',
		unitCost: 0.02
	}),
	m({
		id: 'mid_espresso',
		name: 'Espresso shot',
		supplier: 'Roastery',
		packagePrice: 900,
		packageSize: 50,
		packageUnit: 'piece',
		shippingFee: 0,
		baseQuantity: 50,
		baseUnit: 'piece',
		unitCost: 18
	}),
	m({
		id: 'mid_vanilla_syrup',
		name: 'Vanilla syrup',
		supplier: 'Syrups PH',
		packagePrice: 380,
		packageSize: 1,
		packageUnit: 'l',
		shippingFee: 0,
		baseQuantity: 1000,
		baseUnit: 'ml',
		unitCost: 0.38
	}),
	m({
		id: 'mid_caramel',
		name: 'Caramel drizzle',
		supplier: 'Syrups PH',
		packagePrice: 660,
		packageSize: 1200,
		packageUnit: 'ml',
		shippingFee: 0,
		baseQuantity: 1200,
		baseUnit: 'ml',
		unitCost: 0.55
	})
];
