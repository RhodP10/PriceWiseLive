<script lang="ts">
	import { goto } from '$app/navigation';
	import { authState } from '$lib/state/auth.svelte';
	import { ingredientCatalog } from '$lib/state/ingredientCatalog.svelte';
	import { monthlyOpexTotal, resetOpexStore } from '$lib/state/opexStore.svelte';
	import { otherCatalog } from '$lib/state/otherCatalog.svelte';
	import { recipeStore } from '$lib/state/recipes.svelte';
	import {
		getRecipeOrdersPerMonth,
		resetSummarySales,
		setRecipeOrdersPerMonth
	} from '$lib/state/summarySales.svelte';
	import { perOrderTotalCost } from '$lib/utils/recipeCosting';
	import { upsertMonthlySnapshot } from '$lib/state/monthlySummaryStore.svelte';
	import { pushWorkspaceNow } from '$lib/state/userDataPersistence.svelte';
	import { upsertMonthlySummaryOnServer } from '$lib/api/monthlySummariesClient';
	import { computeLiveMonthKpis } from '$lib/utils/dashboardFinance';
	import { bestSupplierLabel } from '$lib/utils/supplierAnalytics';
	import { formatPhp } from '$lib/utils/numberFormat';
	import type { RecipeSalesSnapshotEntry } from '$lib/types/statistics';

	const ingredientMasters = $derived(ingredientCatalog.items);
	const otherMasters = $derived(otherCatalog.items);

	type Row = {
		id: string;
		name: string;
		sellingPrice: number;
		totalCost: number;
		profitPerOrder: number;
		ordersPerMonth: number;
		revenuePerMonth: number;
		profitPerMonth: number;
		breakevenOrdersOnlyThisRecipe: number | null;
	};

	const rows = $derived.by(() => {
		const list: Row[] = [];
		for (const r of recipeStore.recipes) {
			const totalCost = perOrderTotalCost(r, ingredientMasters, otherMasters);
			const sellingPrice = r.pricing.local;
			const profitPerOrder = sellingPrice - totalCost;
			const ordersPerMonth = getRecipeOrdersPerMonth(r.id);
			list.push({
				id: r.id,
				name: r.name,
				sellingPrice,
				totalCost,
				profitPerOrder,
				ordersPerMonth,
				revenuePerMonth: sellingPrice * ordersPerMonth,
				profitPerMonth: profitPerOrder * ordersPerMonth,
				breakevenOrdersOnlyThisRecipe: null
			});
		}
		return list;
	});

	const totalProfitFromOrders = $derived(rows.reduce((s, x) => s + x.profitPerMonth, 0));
	const monthlyOpex = $derived(monthlyOpexTotal());
	const netProfit = $derived(totalProfitFromOrders - monthlyOpex);

	const rowsWithBreakeven = $derived.by(() => {
		const np = netProfit;
		const shortfall = np >= 0 ? 0 : -np;
		return rows.map((row) => {
			let breakeven: number | null = null;
			if (np < 0 && shortfall > 0 && row.profitPerOrder > 0) {
				breakeven = Math.ceil(shortfall / row.profitPerOrder);
			}
			return { ...row, breakevenOrdersOnlyThisRecipe: breakeven };
		});
	});

	const live = $derived(computeLiveMonthKpis(recipeStore.recipes, ingredientMasters, otherMasters));
	const bestSup = $derived(bestSupplierLabel(ingredientMasters));

	async function saveSnapshot(): Promise<void> {
		const breakdown: RecipeSalesSnapshotEntry[] = [];
		for (const r of recipeStore.recipes) {
			const orders = getRecipeOrdersPerMonth(r.id);
			if (orders <= 0) continue;
			const totalCost = perOrderTotalCost(r, ingredientMasters, otherMasters);
			const sellingPrice = r.pricing.local;
			const profitPerOrder = sellingPrice - totalCost;
			breakdown.push({
				recipeId: r.id,
				recipeName: r.name,
				orders,
				revenue: sellingPrice * orders,
				profit: profitPerOrder * orders
			});
		}
		const token = authState.token;
		if (!token) {
			alert('You must be logged in to save statistics to the server.');
			return;
		}
		try {
			const saved = await upsertMonthlySummaryOnServer(token, {
				yearMonth: live.yearMonth,
				totalOpex: live.totalOpex,
				totalRevenue: live.totalRevenue,
				grossProfit: live.grossProfit,
				netProfit: live.netProfit,
				profitMarginPct: live.profitMarginPct,
				bestSupplier: bestSup,
				recipeBreakdown: breakdown
			});
			upsertMonthlySnapshot({
				id: saved.id,
				generatedAt: saved.generatedAt,
				yearMonth: saved.yearMonth,
				totalOpex: saved.totalOpex,
				totalRevenue: saved.totalRevenue,
				grossProfit: saved.grossProfit,
				netProfit: saved.netProfit,
				profitMarginPct: saved.profitMarginPct,
				bestSupplier: saved.bestSupplier,
				recipeBreakdown: saved.recipeBreakdown
			});
		} catch (e) {
			const msg = e instanceof Error ? e.message : 'Save failed';
			alert(`Could not save statistics: ${msg}`);
			return;
		}
		resetSummarySales();
		resetOpexStore();
		if (authState.token) await pushWorkspaceNow(authState.token);
		void goto('/Statistics');
	}
</script>

<section class="animate-in space-y-8">
	<div class="relative overflow-hidden rounded-3xl bg-zinc-900 p-8 text-white shadow-2xl lg:p-12">
		<div class="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-emerald-500/20 blur-3xl"></div>
		<div class="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-teal-500/10 blur-3xl"></div>

		<div class="relative z-10 flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
			<div class="max-w-3xl space-y-2">
				<h1 class="text-4xl font-bold tracking-tight sm:text-5xl">
					Summary <span class="text-emerald-400">Dashboard</span>
				</h1>
				<p class="text-lg text-zinc-400">
					Per recipe: if net profit is negative, see how many extra orders of <strong class="text-zinc-300">that recipe alone</strong> would
					cover the gap (uses Local selling price and current costs). You can save with <strong class="text-zinc-300">no sales</strong> (all orders
					at zero) to still record monthly OPEX and KPIs in Statistics. Saving clears monthly order inputs and resets OPEX lines so you start a
					fresh month here.
				</p>
			</div>
			<div class="flex shrink-0 flex-col gap-3 sm:flex-row lg:flex-col">
				<button
					type="button"
					class="flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-900/30 transition-all hover:bg-emerald-500 hover:-translate-y-0.5"
					onclick={saveSnapshot}
				>
					Save Summary to Statistics
				</button>
			</div>
		</div>
	</div>

	<div class="glass overflow-hidden rounded-3xl shadow-xl">
		<div class="grid divide-y divide-zinc-200/50 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
			<div class="flex flex-col justify-center px-6 py-6 sm:py-8">
				<div class="flex items-center gap-3">
					<div class="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-100 text-zinc-600">
						<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>
					</div>
					<div>
						<p class="text-[11px] font-bold uppercase tracking-wider text-zinc-500">Monthly OPEX</p>
						<p class="mt-0.5 text-2xl font-bold tabular-nums text-zinc-900">{formatPhp(monthlyOpex)}</p>
					</div>
				</div>
			</div>
			<div class="flex flex-col justify-center px-6 py-6 sm:py-8">
				<div class="flex items-center gap-3">
					<div class="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
						<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 12h-4l-3 9L9 3l-3 9H2" /></svg>
					</div>
					<div>
						<p class="text-[11px] font-bold uppercase tracking-wider text-zinc-500">Profit from orders (month)</p>
						<p class="mt-0.5 text-2xl font-bold tabular-nums text-emerald-700">{formatPhp(totalProfitFromOrders)}</p>
					</div>
				</div>
			</div>
			<div class="flex flex-col justify-center bg-emerald-50/40 px-6 py-6 sm:py-8">
				<div class="flex items-center gap-3">
					<div class="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-md shadow-emerald-900/20">
						<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></svg>
					</div>
					<div>
						<p class="text-[11px] font-bold uppercase tracking-wider text-emerald-800">Net profit</p>
						<p
							class="mt-0.5 text-2xl font-bold tabular-nums"
							class:text-red-700={netProfit < 0}
							class:text-emerald-900={netProfit >= 0}
						>
							{formatPhp(netProfit)}
						</p>
						<p class="mt-1 text-xs text-emerald-900/80">Sum of recipe profit/month − OPEX. No orders ⇒ net ≈ −OPEX.</p>
					</div>
				</div>
			</div>
		</div>
	</div>

	<div class="glass overflow-hidden rounded-3xl shadow-xl transition-all">
		<div class="overflow-x-auto">
			<table class="w-full min-w-[1040px] text-left text-sm">
				<thead>
					<tr class="border-b border-zinc-200/50 bg-zinc-50/50 text-[11px] font-bold uppercase tracking-wider text-zinc-500">
						<th class="px-6 py-4">Recipe</th>
						<th class="px-6 py-4 text-right">Selling ₱</th>
						<th class="px-6 py-4 text-right">Total cost</th>
						<th class="px-6 py-4 text-right">Profit / order</th>
						<th class="px-6 py-4 text-right">Orders / mo</th>
						<th class="px-6 py-4 text-right">Revenue / mo</th>
						<th class="px-6 py-4 text-right">Profit / mo</th>
						<th class="px-6 py-4 text-right">Breakeven orders*</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-zinc-100/50">
					{#each rowsWithBreakeven as row (row.id)}
						<tr class="group transition-colors hover:bg-zinc-50/50">
							<td class="px-6 py-4 font-semibold text-zinc-900">{row.name}</td>
							<td class="px-6 py-4 text-right tabular-nums text-zinc-700">{formatPhp(row.sellingPrice)}</td>
							<td class="px-6 py-4 text-right tabular-nums text-zinc-600">{formatPhp(row.totalCost)}</td>
							<td
								class="px-6 py-4 text-right tabular-nums font-semibold"
								class:text-emerald-700={row.profitPerOrder >= 0}
								class:text-red-600={row.profitPerOrder < 0}
							>
								{formatPhp(row.profitPerOrder)}
							</td>
							<td class="px-6 py-4 text-right">
								<input
									type="number"
									min="0"
									step="1"
									value={row.ordersPerMonth}
									onchange={(e) =>
										setRecipeOrdersPerMonth(row.id, +((e.currentTarget as HTMLInputElement).value || 0))}
									class="w-24 rounded-xl border border-zinc-200 bg-white px-2 py-1.5 text-right text-sm tabular-nums focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
								/>
							</td>
							<td class="px-6 py-4 text-right tabular-nums text-zinc-700">{formatPhp(row.revenuePerMonth)}</td>
							<td
								class="px-6 py-4 text-right tabular-nums font-semibold"
								class:text-emerald-700={row.profitPerMonth >= 0}
								class:text-red-600={row.profitPerMonth < 0}
							>
								{formatPhp(row.profitPerMonth)}
							</td>
							<td class="px-6 py-4 text-right tabular-nums font-semibold text-zinc-900">
								{#if row.breakevenOrdersOnlyThisRecipe !== null}
									{row.breakevenOrdersOnlyThisRecipe.toLocaleString()}
								{:else if netProfit >= 0}
									—
								{:else}
									<span class="text-zinc-400">—</span>
								{/if}
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
		{#if rowsWithBreakeven.length === 0}
			<div class="flex flex-col items-center justify-center py-20 text-center">
				<div class="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-zinc-50 shadow-inner">
					<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" class="text-zinc-300"><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></svg>
				</div>
				<h3 class="text-lg font-bold text-zinc-900">No recipes yet</h3>
				<p class="mt-1 text-sm text-zinc-500">Add recipes from the Recipe Manager page.</p>
			</div>
		{/if}
	</div>

	<p class="text-xs leading-relaxed text-zinc-500">
		*Breakeven orders (this recipe only): extra orders needed if <strong>only this drink</strong> contributed profit at
		the current profit/order to wipe out today’s negative net ({formatPhp(Math.max(0, -netProfit))} shortfall). If
		profit/order ≤ 0 or net ≥ 0, shown as —.
	</p>
</section>
