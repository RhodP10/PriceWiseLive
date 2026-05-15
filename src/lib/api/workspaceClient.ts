import type { IngredientMasterDTO, OtherItemMasterDTO, OpexLineDTO, RecipeDTO } from '$lib/types/recipe';

import { API_BASE } from '$lib/api/apiBase';

/** Payload shape stored in `user_workspaces.payload` (camelCase JSON). */
export type WorkspaceClientPayload = {
	recipes: RecipeDTO[];
	ingredients: IngredientMasterDTO[];
	others: OtherItemMasterDTO[];
	opex: OpexLineDTO[];
	summarySales: Record<string, number>;
	costingSettings: {
		vatRegistered: boolean;
		vatPct: number;
		batchSize: number;
		targetMarginPct: number;
		discountPct: number;
	};
};

export async function fetchWorkspace(token: string): Promise<WorkspaceClientPayload> {
	const res = await fetch(`${API_BASE}/workspace`, {
		headers: { Authorization: `Bearer ${token}` }
	});
	if (!res.ok) throw new Error(`workspace GET ${res.status}`);
	return (await res.json()) as WorkspaceClientPayload;
}

export async function putWorkspace(token: string, body: WorkspaceClientPayload): Promise<void> {
	const res = await fetch(`${API_BASE}/workspace`, {
		method: 'PUT',
		headers: {
			Authorization: `Bearer ${token}`,
			'Content-Type': 'application/json'
		},
		body: JSON.stringify(body)
	});
	if (!res.ok) {
		const t = await res.text();
		throw new Error(t || `workspace PUT ${res.status}`);
	}
}
