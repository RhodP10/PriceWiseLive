<script lang="ts">
	import { browser } from '$app/environment';
	import { costingSettings } from '$lib/state/costingSettings.svelte';
	import { ingredientCatalog } from '$lib/state/ingredientCatalog.svelte';
	import { otherCatalog } from '$lib/state/otherCatalog.svelte';
	import { recipeStore } from '$lib/state/recipes.svelte';
	import {
		computeAutoSyncedRecipePricing,
		recipePricingMatchesSuggested
	} from '$lib/utils/recipeCosting';

	/** Keeps recipe list prices in sync whenever catalog lines or costing settings change (no need to open costing first). */
	$effect(() => {
		if (!browser) return;
		void ingredientCatalog.items;
		void otherCatalog.items;
		void costingSettings.vatRegistered;
		void costingSettings.vatPct;
		void costingSettings.batchSize;
		void costingSettings.targetMarginPct;
		void costingSettings.discountPct;
		void recipeStore.recipes;

		const ing = ingredientCatalog.items;
		const other = otherCatalog.items;
		const settings = {
			vatRegistered: costingSettings.vatRegistered,
			vatPct: costingSettings.vatPct,
			batchSize: costingSettings.batchSize,
			targetMarginPct: costingSettings.targetMarginPct,
			discountPct: costingSettings.discountPct
		};

		let changed = false;
		const nextRecipes = recipeStore.recipes.map((r) => {
			const next = computeAutoSyncedRecipePricing(r, ing, other, settings);
			const pick = { local: next.local, shopee: next.shopee, lazada: next.lazada };
			if (recipePricingMatchesSuggested(r.pricing, pick)) return r;
			changed = true;
			return { ...r, pricing: pick };
		});
		if (changed) recipeStore.recipes = nextRecipes;
	});
</script>
