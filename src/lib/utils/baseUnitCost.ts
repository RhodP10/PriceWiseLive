import type { MeasureUnit } from '$lib/types/recipe';

export type BaseUnit = 'g' | 'ml' | 'piece';

export function toBaseQuantity(packageSize: number, packageUnit: MeasureUnit): { quantity: number; unit: BaseUnit } {
	if (packageUnit === 'kg') return { quantity: packageSize * 1000, unit: 'g' };
	if (packageUnit === 'g' || packageUnit === 'oz') return { quantity: packageUnit === 'oz' ? packageSize * 28.349523125 : packageSize, unit: 'g' };
	if (packageUnit === 'l') return { quantity: packageSize * 1000, unit: 'ml' };
	if (packageUnit === 'ml' || packageUnit === 'cc' || packageUnit === 'oz_fl') {
		if (packageUnit === 'oz_fl') return { quantity: packageSize * 29.5735295625, unit: 'ml' };
		return { quantity: packageSize, unit: 'ml' };
	}
	return { quantity: packageSize, unit: 'piece' };
}

export function computeUnitCost(packagePrice: number, shippingFee: number, baseQuantity: number): number {
	if (baseQuantity <= 0) return 0;
	return (packagePrice + shippingFee) / baseQuantity;
}

