import { fetchMonthlySummaries } from '$lib/api/monthlySummariesClient';
import { fetchWorkspace, putWorkspace, type WorkspaceClientPayload } from '$lib/api/workspaceClient';
import { costingSettings, replaceCostingSettings } from '$lib/state/costingSettings.svelte';
import { ingredientCatalog, replaceIngredientCatalogItems } from '$lib/state/ingredientCatalog.svelte';
import { opexStore, replaceOpexLines } from '$lib/state/opexStore.svelte';
import { otherCatalog, replaceOtherCatalogItems } from '$lib/state/otherCatalog.svelte';
import { recipeStore, replaceRecipesFromApi, resetRecipes } from '$lib/state/recipes.svelte';
import {
	replaceMonthlySummariesFromApi,
	resetMonthlySummaryStore
} from '$lib/state/monthlySummaryStore.svelte';
import { resetSummarySales, summarySales } from '$lib/state/summarySales.svelte';

/** Must be reactive: +layout `$effect` gates on this before reading recipe/catalog state; otherwise saves never subscribe after bootstrap. */
let workspaceSaveEnabled = $state(false);
let workspacePersistTimer: ReturnType<typeof setTimeout> | null = null;
let workspaceLoadGen = 0;

const WORKSPACE_DEBOUNCE_MS = 400;

/** Deep-clone plain JSON data; avoids DataCloneError on Svelte reactive proxies. */
function cloneJson<T>(value: T): T {
	return JSON.parse(JSON.stringify(value)) as T;
}

export function setWorkspaceSaveEnabled(v: boolean): void {
	workspaceSaveEnabled = v;
}

export function isWorkspaceSaveEnabled(): boolean {
	return workspaceSaveEnabled;
}

export function serializeWorkspacePayload(): WorkspaceClientPayload {
	return {
		recipes: cloneJson(recipeStore.recipes),
		ingredients: cloneJson(ingredientCatalog.items),
		others: cloneJson(otherCatalog.items),
		opex: cloneJson(opexStore.lines),
		summarySales: cloneJson(summarySales.ordersPerMonthByRecipeId),
		costingSettings: {
			vatRegistered: costingSettings.vatRegistered,
			vatPct: costingSettings.vatPct,
			batchSize: costingSettings.batchSize,
			targetMarginPct: costingSettings.targetMarginPct,
			discountPct: costingSettings.discountPct
		}
	};
}

export function applyEmptyWorkspace(): void {
	replaceRecipesFromApi([]);
	replaceIngredientCatalogItems([]);
	replaceOtherCatalogItems([]);
	replaceOpexLines([]);
	resetSummarySales();
	replaceCostingSettings(null);
}

export function applyWorkspacePayload(data: Partial<WorkspaceClientPayload> | null | undefined): void {
	const d = data ?? {};
	replaceRecipesFromApi(Array.isArray(d.recipes) ? cloneJson(d.recipes) : []);
	replaceIngredientCatalogItems(Array.isArray(d.ingredients) ? cloneJson(d.ingredients) : []);
	replaceOtherCatalogItems(Array.isArray(d.others) ? cloneJson(d.others) : []);
	replaceOpexLines(Array.isArray(d.opex) ? cloneJson(d.opex) : []);
	if (d.summarySales && typeof d.summarySales === 'object') {
		summarySales.ordersPerMonthByRecipeId = cloneJson(d.summarySales);
	} else {
		resetSummarySales();
	}
	replaceCostingSettings(
		d.costingSettings && typeof d.costingSettings === 'object' ? cloneJson(d.costingSettings) : null
	);
}

export async function pullWorkspaceFromServer(token: string): Promise<void> {
	const server = await fetchWorkspace(token);
	applyWorkspacePayload(server);
}

export function cancelWorkspacePersistDebounce(): void {
	if (workspacePersistTimer !== null) {
		clearTimeout(workspacePersistTimer);
		workspacePersistTimer = null;
	}
}

export function scheduleWorkspacePersist(token: string): void {
	if (!workspaceSaveEnabled || !token) return;
	cancelWorkspacePersistDebounce();
	workspacePersistTimer = setTimeout(() => {
		workspacePersistTimer = null;
		void putWorkspace(token, serializeWorkspacePayload()).catch((e) =>
			console.warn('workspace save failed', e)
		);
	}, WORKSPACE_DEBOUNCE_MS);
}

export async function pushWorkspaceNow(token: string): Promise<void> {
	cancelWorkspacePersistDebounce();
	await putWorkspace(token, serializeWorkspacePayload());
}

/** Load workspace + monthly summaries after login; disables saves until finished. */
export async function bootstrapUserWorkspace(token: string): Promise<void> {
	const gen = ++workspaceLoadGen;
	setWorkspaceSaveEnabled(false);
	applyEmptyWorkspace();
	resetMonthlySummaryStore();

	try {
		await pullWorkspaceFromServer(token);
	} catch (e) {
		console.warn('workspace bootstrap pull failed', e);
	}

	if (gen !== workspaceLoadGen) return;

	try {
		const rows = await fetchMonthlySummaries(token);
		if (gen !== workspaceLoadGen) return;
		replaceMonthlySummariesFromApi(rows);
	} catch {
		if (gen !== workspaceLoadGen) return;
		replaceMonthlySummariesFromApi([]);
	}
	if (gen !== workspaceLoadGen) return;
	setWorkspaceSaveEnabled(true);
	scheduleWorkspacePersist(token);
}

export function clearInMemoryUserData(): void {
	workspaceLoadGen++;
	cancelWorkspacePersistDebounce();
	setWorkspaceSaveEnabled(false);
	resetRecipes();
	replaceIngredientCatalogItems([]);
	replaceOtherCatalogItems([]);
	replaceOpexLines([]);
	resetSummarySales();
	replaceCostingSettings(null);
	resetMonthlySummaryStore();
}
