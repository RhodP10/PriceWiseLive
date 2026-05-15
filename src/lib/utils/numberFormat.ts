/** User-facing peso: 2 decimals (centavos), thousands grouping (en-PH). */
const phpMoney = new Intl.NumberFormat('en-PH', {
	style: 'currency',
	currency: 'PHP'
});

export function formatPhp(amount: number): string {
	if (!Number.isFinite(amount)) return '—';
	return phpMoney.format(amount);
}

/** Plain numbers with grouping (e.g. weights, counts): fixed fractional digits. */
export function formatDecimal(value: number, fractionDigits = 2): string {
	if (!Number.isFinite(value)) return '—';
	return new Intl.NumberFormat('en-PH', {
		minimumFractionDigits: fractionDigits,
		maximumFractionDigits: fractionDigits
	}).format(value);
}

/** Percent values already in 0–100 scale (e.g. margin 12.5 → "12.5%"). */
export function formatPercent1(value: number): string {
	if (!Number.isFinite(value)) return '—';
	return `${new Intl.NumberFormat('en-PH', { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(value)}%`;
}

/** Same as formatPercent1 but with a leading "+" when value > 0 (trends). */
export function formatPercent1Signed(value: number): string {
	if (!Number.isFinite(value)) return '—';
	const body = new Intl.NumberFormat('en-PH', {
		minimumFractionDigits: 1,
		maximumFractionDigits: 1
	}).format(value);
	if (value > 0) return `+${body}%`;
	return `${body}%`;
}
