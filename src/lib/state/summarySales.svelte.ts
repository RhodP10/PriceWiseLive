/** User-entered projected orders per recipe per month (summary spreadsheet) */
export const summarySales = $state({
	ordersPerMonthByRecipeId: {} as Record<string, number>
});

export function setRecipeOrdersPerMonth(recipeId: string, orders: number): void {
	summarySales.ordersPerMonthByRecipeId = {
		...summarySales.ordersPerMonthByRecipeId,
		[recipeId]: Math.max(0, orders)
	};
}

export function getRecipeOrdersPerMonth(recipeId: string): number {
	return summarySales.ordersPerMonthByRecipeId[recipeId] ?? 0;
}

export function resetSummarySales(): void {
	summarySales.ordersPerMonthByRecipeId = {};
}
