/**
 * API boundary — swap for real HTTP when backend is ready.
 */

import type { RecipeDTO } from '$lib/types/recipe';
import { recipeStore, replaceRecipesFromApi } from '$lib/state/recipes.svelte';

const BASE = typeof window !== 'undefined' ? '' : '';

export async function fetchRecipes(): Promise<RecipeDTO[]> {
	void BASE;
	// const res = await fetch(`${BASE}/api/recipes`);
	return structuredClone(recipeStore.recipes);
}

export async function syncRecipesFromServer(): Promise<void> {
	const data = await fetchRecipes();
	replaceRecipesFromApi(data);
}
