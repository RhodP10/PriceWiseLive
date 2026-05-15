<script lang="ts">
	import { browser } from '$app/environment';
	import { postSmartPricingAnalyze } from '$lib/api/smartPricingClient';
	import { costingSettings } from '$lib/state/costingSettings.svelte';
	import { ingredientCatalog } from '$lib/state/ingredientCatalog.svelte';
	import { otherCatalog } from '$lib/state/otherCatalog.svelte';
	import { recipeStore } from '$lib/state/recipes.svelte';
	import { summarySales } from '$lib/state/summarySales.svelte';
	import { authState } from '$lib/state/auth.svelte';
	import type { SmartPricingAnalysisResult } from '$lib/types/smartPricing';
	import { buildSmartPricingPayload } from '$lib/utils/smartPricingPayload';
	import { formatPhp, formatPercent1, formatPercent1Signed } from '$lib/utils/numberFormat';

	let loading = $state(false);
	let error = $state('');
	let data = $state<SmartPricingAnalysisResult | null>(null);

	const costingInput = $derived({
		vatRegistered: costingSettings.vatRegistered,
		vatPct: costingSettings.vatPct,
		batchSize: costingSettings.batchSize,
		targetMarginPct: costingSettings.targetMarginPct,
		discountPct: costingSettings.discountPct
	});

	async function runAnalyze(): Promise<void> {
		if (!browser) return;
		if (!authState.token) {
			data = null;
			error = '';
			return;
		}
		loading = true;
		error = '';
		try {
			const payload = buildSmartPricingPayload(
				recipeStore.recipes,
				ingredientCatalog.items,
				otherCatalog.items,
				summarySales.ordersPerMonthByRecipeId,
				costingInput
			);
			data = await postSmartPricingAnalyze(authState.token, payload);
		} catch (e) {
			data = null;
			error = e instanceof Error ? e.message : 'Analysis failed';
		} finally {
			loading = false;
		}
	}

	$effect(() => {
		if (!browser) return;
		void authState.token;
		void recipeStore.recipes;
		void ingredientCatalog.items;
		if (authState.token) void runAnalyze();
	});

	function pctBar(p: number): string {
		return `${Math.round(Math.max(0, Math.min(1, p)) * 100)}%`;
	}

	function riskClass(risk: string): string {
		if (risk === 'HIGH') return 'bg-red-100 text-red-800 ring-red-200';
		if (risk === 'MED') return 'bg-amber-100 text-amber-900 ring-amber-200';
		return 'bg-emerald-100 text-emerald-900 ring-emerald-200';
	}

	const kpi = $derived.by(() => {
		if (!data) return { recipes: 0, ingredients: 0, alerts: 0, avgConf: 0 };
		const sells = data.sellingPriceRecommendations;
		const avg =
			sells.length === 0 ? 0 : sells.reduce((s, x) => s + x.confidence, 0) / sells.length;
		return {
			recipes: data.echo?.recipeCount ?? sells.length,
			ingredients: data.echo?.ingredientCount ?? data.ingredientForecasts.length,
			alerts: data.alerts.length,
			avgConf: avg
		};
	});
</script>

<svelte:head>
	<title>Smart Pricing — PriceWise</title>
</svelte:head>

<section class="space-y-10 pb-16">
	<div class="relative overflow-hidden rounded-3xl bg-zinc-900 p-8 text-white shadow-2xl lg:p-12">
		<div class="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-violet-500/25 blur-3xl"></div>
		<div class="absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-emerald-500/20 blur-3xl"></div>
		<div class="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
			<div class="max-w-2xl space-y-3">
				<p class="text-xs font-bold uppercase tracking-[0.2em] text-emerald-300/90">AI pricing intelligence</p>
				<h1 class="text-4xl font-bold tracking-tight sm:text-5xl">Smart Pricing</h1>
				<p class="text-lg text-zinc-400">
					Predictive cost trends, selling-price recommendations from your COGS and margin rules, demand hints
					from Summary inputs, and alerts — powered by your dated ingredient logs and scikit-learn regression
					on the server.
				</p>
				<p class="text-sm text-zinc-500">
					Tip: local ingredient rows now record <strong class="text-zinc-300">added date</strong> and a
					<strong class="text-zinc-300">price history</strong> whenever package price or size changes — that
					feeds forecasts here automatically.
				</p>
			</div>
			<div class="flex flex-wrap gap-3">
				<button
					type="button"
					disabled={loading || !authState.token}
					onclick={() => void runAnalyze()}
					class="rounded-2xl bg-emerald-500 px-6 py-3 text-sm font-bold text-emerald-950 shadow-lg shadow-emerald-900/30 transition hover:bg-emerald-400 disabled:opacity-50"
				>
					{loading ? 'Analyzing…' : 'Refresh analysis'}
				</button>
			</div>
		</div>
	</div>

	{#if error}
		<div class="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">
			{error}
		</div>
	{/if}

	<!-- KPI strip -->
	<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
		<div class="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
			<p class="text-[11px] font-bold uppercase tracking-wider text-zinc-500">Recipes in model</p>
			<p class="mt-1 text-3xl font-bold tabular-nums text-zinc-900">{kpi.recipes}</p>
		</div>
		<div class="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
			<p class="text-[11px] font-bold uppercase tracking-wider text-zinc-500">Ingredients tracked</p>
			<p class="mt-1 text-3xl font-bold tabular-nums text-zinc-900">{kpi.ingredients}</p>
		</div>
		<div class="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
			<p class="text-[11px] font-bold uppercase tracking-wider text-zinc-500">Active alerts</p>
			<p class="mt-1 text-3xl font-bold tabular-nums text-violet-700">{kpi.alerts}</p>
		</div>
		<div class="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
			<p class="text-[11px] font-bold uppercase tracking-wider text-zinc-500">Avg. recommendation confidence</p>
			<p class="mt-1 text-3xl font-bold tabular-nums text-emerald-700">{pctBar(kpi.avgConf)}</p>
		</div>
	</div>

	{#if loading && !data}
		<div class="flex flex-col items-center justify-center gap-3 rounded-3xl border border-zinc-200 bg-white py-24">
			<div class="h-10 w-10 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent"></div>
			<p class="text-sm font-medium text-zinc-600">Running Smart Pricing models…</p>
		</div>
	{:else if data}
		<!-- Selling price recommendations -->
		<div class="rounded-3xl border border-zinc-200 bg-white shadow-sm">
			<div class="border-b border-zinc-100 px-6 py-4">
				<h2 class="text-lg font-bold text-zinc-900">Selling price recommendations</h2>
				<p class="mt-1 text-sm text-zinc-500">
					Suggested local list prices from your catalog COGS and target margin; competitor average uses
					Shopee/Lazada list prices when set.
				</p>
			</div>
			<div class="overflow-x-auto">
				<table class="w-full min-w-[900px] text-left text-sm">
					<thead>
						<tr class="border-b border-zinc-100 bg-zinc-50/80 text-[11px] font-bold uppercase tracking-wider text-zinc-500">
							<th class="px-6 py-3">Product</th>
							<th class="px-6 py-3 text-right">COGS</th>
							<th class="px-6 py-3 text-right">Current</th>
							<th class="px-6 py-3 text-right">Suggested</th>
							<th class="px-6 py-3 text-right">Δ%</th>
							<th class="px-6 py-3 text-right">Margin (cur)</th>
							<th class="px-6 py-3">Confidence</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-zinc-100">
						{#each data.sellingPriceRecommendations as row (row.recipeId)}
							<tr class="hover:bg-zinc-50/80">
								<td class="px-6 py-3 font-semibold text-zinc-900">{row.name}</td>
								<td class="px-6 py-3 text-right tabular-nums text-zinc-600">{formatPhp(row.cogs)}</td>
								<td class="px-6 py-3 text-right tabular-nums text-zinc-900">{formatPhp(row.current)}</td>
								<td class="px-6 py-3 text-right tabular-nums font-bold text-emerald-700">
									{formatPhp(row.suggested)}
								</td>
								<td class="px-6 py-3 text-right tabular-nums text-zinc-700">{formatPercent1(row.deltaPctVsCurrent)}</td>
								<td class="px-6 py-3 text-right tabular-nums text-zinc-600">{formatPercent1(row.marginPctCurrent)}</td>
								<td class="px-6 py-3">
									<div class="flex items-center gap-2">
										<div class="h-2 flex-1 max-w-[140px] overflow-hidden rounded-full bg-zinc-200">
											<div
												class="h-full rounded-full bg-gradient-to-r from-emerald-500 to-violet-500"
												style={`width: ${pctBar(row.confidence)}`}
											></div>
										</div>
										<span class="text-xs font-semibold text-zinc-600">{pctBar(row.confidence)}</span>
									</div>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
			{#if data.sellingPriceRecommendations.length === 0}
				<p class="px-6 py-10 text-center text-sm text-zinc-500">Add recipes with ingredient lines to see recommendations.</p>
			{/if}
		</div>

		<div class="grid gap-8 lg:grid-cols-2">
			<!-- Ingredient price prediction -->
			<div class="rounded-3xl border border-zinc-200 bg-white shadow-sm">
				<div class="border-b border-zinc-100 px-6 py-4">
					<h2 class="text-lg font-bold text-zinc-900">Ingredient cost forecast</h2>
					<p class="mt-1 text-sm text-zinc-500">Linear trend on your logged unit costs (~next 30 days).</p>
				</div>
				<div class="overflow-x-auto">
					<table class="w-full text-left text-sm">
						<thead>
							<tr class="border-b border-zinc-100 bg-zinc-50/80 text-[11px] font-bold uppercase tracking-wider text-zinc-500">
								<th class="px-5 py-3">Ingredient</th>
								<th class="px-5 py-3 text-right">Current</th>
								<th class="px-5 py-3 text-right">Predicted</th>
								<th class="px-5 py-3 text-right">Trend</th>
							</tr>
						</thead>
						<tbody class="divide-y divide-zinc-100">
							{#each data.ingredientForecasts as f (f.id)}
								<tr>
									<td class="px-5 py-2.5 font-medium text-zinc-900">{f.name}</td>
									<td class="px-5 py-2.5 text-right tabular-nums text-zinc-600">{formatPhp(f.current)}</td>
									<td class="px-5 py-2.5 text-right tabular-nums font-semibold text-violet-700">
										{formatPhp(f.predictedNext)}
									</td>
									<td class="px-5 py-2.5 text-right text-xs text-zinc-500">
										{f.trendPct === null ? '—' : formatPercent1Signed(f.trendPct)}
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			</div>

			<!-- Volatility -->
			<div class="rounded-3xl border border-zinc-200 bg-white shadow-sm">
				<div class="border-b border-zinc-100 px-6 py-4">
					<h2 class="text-lg font-bold text-zinc-900">Cost volatility</h2>
					<p class="mt-1 text-sm text-zinc-500">Risk from variation in your dated unit-cost snapshots.</p>
				</div>
				<ul class="divide-y divide-zinc-100">
					{#each data.volatility as v (v.id)}
						<li class="flex flex-col gap-1 px-6 py-3 sm:flex-row sm:items-center sm:justify-between">
							<div>
								<p class="font-semibold text-zinc-900">{v.name}</p>
								<p class="text-xs text-zinc-500">{v.note}</p>
							</div>
							<span
								class="inline-flex w-fit rounded-full px-3 py-1 text-xs font-bold ring-1 ring-inset {riskClass(
									v.risk
								)}">{v.risk}</span
							>
						</li>
					{/each}
				</ul>
			</div>
		</div>

		<!-- Demand + supplier -->
		<div class="grid gap-8 lg:grid-cols-2">
			<div class="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
				<h2 class="text-lg font-bold text-zinc-900">Demand signals</h2>
				<p class="mt-1 text-sm text-zinc-500">From Summary “orders per month” inputs (tertiles).</p>
				<ul class="mt-4 space-y-2">
					{#each data.demandSignals as d (d.recipeId)}
						<li class="flex items-center justify-between rounded-xl bg-zinc-50 px-4 py-2.5">
							<span class="font-medium text-zinc-800">{d.name}</span>
							<span class="text-xs font-bold uppercase text-zinc-500">{d.level}</span>
						</li>
					{/each}
				</ul>
			</div>
			<div class="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
				<h2 class="text-lg font-bold text-zinc-900">Supplier intelligence</h2>
				<p class="mt-1 text-sm text-zinc-500">Heuristics from cost stability in your logs.</p>
				<ul class="mt-4 space-y-3">
					{#each data.supplierTips as tip, i (i)}
						<li class="rounded-xl border border-amber-100 bg-amber-50/60 px-4 py-3 text-sm text-amber-950">
							{tip.text}
						</li>
					{/each}
					{#if data.supplierTips.length === 0}
						<li class="text-sm text-zinc-500">No supplier warnings — add more price history for richer tips.</li>
					{/if}
				</ul>
			</div>
		</div>

		<!-- Smart alerts + reasons -->
		<div class="grid gap-8 lg:grid-cols-2">
			<div class="rounded-3xl border border-violet-200 bg-violet-50/40 p-6 shadow-sm">
				<h2 class="text-lg font-bold text-violet-950">Smart alerts</h2>
				<ul class="mt-4 space-y-3">
					{#each data.alerts as a, i (i)}
						<li class="rounded-xl bg-white/90 px-4 py-3 text-sm text-violet-950 shadow-sm ring-1 ring-violet-100">
							<span class="text-[10px] font-bold uppercase text-violet-500">{a.type}</span>
							<p class="mt-1">{a.text}</p>
						</li>
					{/each}
					{#if data.alerts.length === 0}
						<li class="text-sm text-violet-800/80">No critical alerts for the current snapshot.</li>
					{/if}
				</ul>
			</div>
			<div class="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
				<h2 class="text-lg font-bold text-zinc-900">Profit per order (hint)</h2>
				<ul class="mt-4 space-y-2 text-sm">
					{#each data.profitPerOrderHint as p (p.recipeId)}
						<li class="flex justify-between rounded-xl bg-zinc-50 px-4 py-2 tabular-nums">
							<span class="font-medium text-zinc-800">{p.name}</span>
							<span class="text-zinc-600">
								{formatPhp(p.profitPerOrderCurrent)}
								<span class="text-zinc-400">→</span>
								<span class="font-semibold text-emerald-700">{formatPhp(p.profitPerOrderSuggested)}</span>
							</span>
						</li>
					{/each}
				</ul>
			</div>
		</div>

		<!-- Narrative cards for first few selling rows -->
		{#if data.sellingPriceRecommendations.length > 0}
			<div>
				<h2 class="mb-4 text-lg font-bold text-zinc-900">Recommendation detail</h2>
				<div class="grid gap-4 md:grid-cols-2">
					{#each data.sellingPriceRecommendations.slice(0, 4) as card (card.recipeId)}
						<div class="rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50/80 to-white p-5 shadow-sm">
							<p class="text-xs font-bold uppercase tracking-wider text-emerald-700">AI-style summary</p>
							<p class="mt-2 text-base font-bold text-zinc-900">{card.name}</p>
							<ul class="mt-3 list-inside list-disc space-y-1 text-sm text-zinc-600">
								{#each card.reasons as r}
									<li>{r}</li>
								{/each}
							</ul>
						</div>
					{/each}
				</div>
			</div>
		{/if}

		<p class="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-xs leading-relaxed text-zinc-600">
			{data.modelNotes}
		</p>
	{/if}
</section>
