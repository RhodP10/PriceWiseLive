import { API_BASE } from '$lib/api/apiBase';
import type { SmartPricingAnalyzePayload, SmartPricingAnalysisResult } from '$lib/types/smartPricing';

export async function postSmartPricingAnalyze(
	token: string,
	payload: SmartPricingAnalyzePayload
): Promise<SmartPricingAnalysisResult> {
	const res = await fetch(`${API_BASE}/ml/smart-pricing/analyze`, {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${token}`,
			'Content-Type': 'application/json'
		},
		body: JSON.stringify(payload)
	});
	if (!res.ok) {
		const t = await res.text();
		throw new Error(t || `Smart pricing ${res.status}`);
	}
	return (await res.json()) as SmartPricingAnalysisResult;
}
