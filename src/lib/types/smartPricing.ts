/** Request body for `POST /ml/smart-pricing/analyze` (camelCase JSON). */
export type SmartPricingAnalyzePayload = {
	ingredients: {
		id: string;
		name: string;
		unitCost: number;
		supplier: string;
		unitCostHistory: { recordedAt: string; unitCost: number }[];
	}[];
	others: {
		id: string;
		name: string;
		unitCost: number;
		supplier: string;
		unitCostHistory: { recordedAt: string; unitCost: number }[];
	}[];
	recipes: {
		id: string;
		name: string;
		cogs: number;
		currentLocal: number;
		suggestedLocal: number;
		currentShopee: number;
		currentLazada: number;
	}[];
	summarySales: Record<string, number>;
	targetMarginPct: number;
};

export type SmartPricingAnalysisResult = {
	ingredientForecasts: {
		id: string;
		name: string;
		current: number;
		predictedNext: number;
		confidence: number;
		trendPct: number | null;
	}[];
	volatility: { id: string; name: string; risk: string; note: string }[];
	demandSignals: {
		recipeId: string;
		name: string;
		level: string;
		ordersNextMonthHint?: number;
	}[];
	sellingPriceRecommendations: {
		recipeId: string;
		name: string;
		channel: string;
		current: number;
		suggested: number;
		cogs: number;
		marginPctCurrent: number;
		marginPctSuggested: number;
		competitorAvg: number | null;
		deltaPctVsCurrent: number;
		confidence: number;
		reasons: string[];
	}[];
	profitPerOrderHint: {
		recipeId: string;
		name: string;
		profitPerOrderCurrent: number;
		profitPerOrderSuggested: number;
	}[];
	supplierTips: { severity: string; text: string }[];
	alerts: { type: string; text: string }[];
	modelNotes: string;
	echo?: { ingredientCount: number; recipeCount: number };
};
