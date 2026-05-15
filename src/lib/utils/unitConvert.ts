import type { MeasureUnit } from '$lib/types/recipe';

export type MeasureDimension = 'mass' | 'volume' | 'count';

export function measureDimension(u: MeasureUnit): MeasureDimension | null {
	switch (u) {
		case 'g':
		case 'kg':
		case 'oz':
			return 'mass';
		case 'ml':
		case 'l':
		case 'cc':
		case 'oz_fl':
			return 'volume';
		case 'piece':
			return 'count';
		default:
			return null;
	}
}

function toGrams(q: number, u: MeasureUnit): number {
	switch (u) {
		case 'g':
			return q;
		case 'kg':
			return q * 1000;
		case 'oz':
			return q * 28.349523125;
		default:
			throw new Error(`Not mass: ${u}`);
	}
}

function gramsTo(qGrams: number, u: MeasureUnit): number {
	switch (u) {
		case 'g':
			return qGrams;
		case 'kg':
			return qGrams / 1000;
		case 'oz':
			return qGrams / 28.349523125;
		default:
			throw new Error(`Not mass: ${u}`);
	}
}

function toMl(q: number, u: MeasureUnit): number {
	switch (u) {
		case 'ml':
		case 'cc':
			return q;
		case 'l':
			return q * 1000;
		case 'oz_fl':
			return q * 29.5735295625;
		default:
			throw new Error(`Not volume: ${u}`);
	}
}

function mlTo(qMl: number, u: MeasureUnit): number {
	switch (u) {
		case 'ml':
		case 'cc':
			return qMl;
		case 'l':
			return qMl / 1000;
		case 'oz_fl':
			return qMl / 29.5735295625;
		default:
			throw new Error(`Not volume: ${u}`);
	}
}

/** How many `to` units equal `q` units of `from` (same dimension only). */
export function convertQuantity(q: number, from: MeasureUnit, to: MeasureUnit): number | null {
	const d1 = measureDimension(from);
	const d2 = measureDimension(to);
	if (d1 === null || d2 === null || d1 !== d2) return null;
	if (d1 === 'count') {
		return from === 'piece' && to === 'piece' ? q : null;
	}
	if (d1 === 'mass') {
		return gramsTo(toGrams(q, from), to);
	}
	return mlTo(toMl(q, from), to);
}

export function unitLabel(u: MeasureUnit): string {
	switch (u) {
		case 'oz_fl':
			return 'oz (fl)';
		case 'piece':
			return 'piece';
		default:
			return u;
	}
}
