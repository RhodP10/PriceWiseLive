<script lang="ts">
	import type { IngredientMasterDTO, OtherItemMasterDTO, RecipeDTO } from '$lib/types/recipe';
	import { costingSettings } from '$lib/state/costingSettings.svelte';
	import { computeSpreadsheetCosting, computeAutoSyncedRecipePricing, marginPercentAtPrice } from '$lib/utils/recipeCosting';
	import { fade } from 'svelte/transition';
	import { formatPhp, formatPercent1 } from '$lib/utils/numberFormat';

	const LOW_MARGIN_PCT = 15;

	const {
		recipe,
		ingredientMasters,
		otherMasters
	}: {
		recipe: RecipeDTO;
		ingredientMasters: IngredientMasterDTO[];
		otherMasters: OtherItemMasterDTO[];
	} = $props();

	const sheet = $derived.by(() => {
		void recipe.ingredientLines;
		void recipe.otherLines;
		void costingSettings.vatRegistered;
		void costingSettings.vatPct;
		void costingSettings.batchSize;
		void costingSettings.targetMarginPct;
		void costingSettings.discountPct;
		void ingredientMasters;
		void otherMasters;
		return computeSpreadsheetCosting(recipe, ingredientMasters, otherMasters, {
			vatRegistered: costingSettings.vatRegistered,
			vatPct: costingSettings.vatPct,
			batchSize: costingSettings.batchSize,
			targetMarginPct: costingSettings.targetMarginPct,
			discountPct: costingSettings.discountPct
		});
	});

	const cogs = $derived(sheet.perOrder.totalCost);
	const sell = $derived(sheet.perOrder.regularSellingPrice);
	const marginPct = $derived(marginPercentAtPrice(sell, cogs));
	const autoPricing = $derived.by(() => {
		void recipe.ingredientLines;
		void recipe.otherLines;
		void costingSettings.vatRegistered;
		void costingSettings.vatPct;
		void costingSettings.batchSize;
		void costingSettings.targetMarginPct;
		void costingSettings.discountPct;
		void ingredientMasters;
		void otherMasters;
		return computeAutoSyncedRecipePricing(recipe, ingredientMasters, otherMasters, {
			vatRegistered: costingSettings.vatRegistered,
			vatPct: costingSettings.vatPct,
			batchSize: costingSettings.batchSize,
			targetMarginPct: costingSettings.targetMarginPct,
			discountPct: costingSettings.discountPct
		});
	});
	const profitBeforeDiscount = $derived(sheet.perOrder.profitPerOrder);
	const finalProfit = $derived(sheet.discount.discountedPrice - cogs);

	const pulseHealth = $derived.by(() => {
		if (finalProfit < 0 || marginPct < 0) return 'loss' as const;
		if (marginPct > 0 && marginPct < LOW_MARGIN_PCT) return 'low' as const;
		return 'ok' as const;
	});

	const healthCopy = $derived.by(() => {
		if (pulseHealth === 'loss') return { dot: '🔴', label: 'Below cost', sub: 'Adjust margin or costs' };
		if (pulseHealth === 'low')
			return { dot: '🟠', label: 'Low margin', sub: `Under ${LOW_MARGIN_PCT}% on revenue` };
		return { dot: '🟢', label: 'Profitable', sub: 'Healthy spread on revenue' };
	});

	const meterTint = $derived(
		pulseHealth === 'loss'
			? 'from-rose-400 to-red-500'
			: pulseHealth === 'low'
				? 'from-amber-300 to-orange-500'
				: 'from-emerald-400 to-teal-500'
	);

	const chartCostPct = $derived(sell > 0 ? Math.min(100, (cogs / sell) * 100) : 0);

	function fmt(n: number): string {
		return formatPhp(n);
	}

	const channels = [
		{ key: 'local' as const, label: 'Local', hint: 'Catalog COGS + target margin' },
		{
			key: 'shopee' as const,
			label: 'Shopee',
			hint: 'Shopee landed on each line that needs a listing, or local-only rows'
		},
		{
			key: 'lazada' as const,
			label: 'Lazada',
			hint: 'Lazada landed on each line that needs a listing, or local-only rows'
		}
	];
</script>

<div class="flex flex-col gap-4 font-sans">
	<!-- Hero pricing -->
	<div
		class="relative overflow-hidden rounded-3xl border border-white/70 bg-gradient-to-br from-white via-emerald-50/40 to-teal-50/50 p-6 shadow-[0_20px_60px_-24px_rgba(15,118,110,0.35)] backdrop-blur-md"
	>
		<div
			class="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-emerald-400/15 blur-3xl"
			aria-hidden="true"
		></div>
		<p class="text-center text-[11px] font-semibold uppercase tracking-[0.2em] text-teal-800/70">Sell price</p>
		{#key sell}
			<p
				in:fade={{ duration: 180 }}
				class="mt-1 text-center text-4xl font-semibold tracking-tight text-zinc-900 tabular-nums"
			>
				{fmt(sell)}
			</p>
		{/key}
		<p class="mt-0.5 text-center text-xs font-medium text-zinc-500">Final selling price</p>

		<div class="mt-5 flex flex-col items-center gap-1 border-t border-emerald-100/80 pt-4">
			{#key profitBeforeDiscount}
				<p in:fade={{ duration: 180 }} class="text-lg font-semibold tabular-nums text-emerald-700">
					+{fmt(profitBeforeDiscount)} profit
				</p>
			{/key}
			<p class="text-center text-sm text-zinc-600">
				<span class="font-semibold tabular-nums">{formatPercent1(marginPct)}</span>
				margin · {healthCopy.label}
			</p>
			{#if costingSettings.discountPct > 0}
				<p class="text-center text-xs text-zinc-500">
					After {costingSettings.discountPct}% discount: <span class="font-medium text-zinc-700">{fmt(finalProfit)}</span> net
				</p>
			{/if}
		</div>
	</div>

	<!-- Settings + summary -->
	<div class="grid min-w-0 gap-4 sm:grid-cols-2 sm:items-stretch">
		<div
			class="flex h-full min-h-[300px] min-w-0 flex-col overflow-hidden rounded-3xl border border-white/80 bg-white/65 p-5 shadow-sm backdrop-blur-md [&_input]:min-w-0 [&_input]:max-w-full [&_input]:tabular-nums"
		>
			<h3 class="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">Settings</h3>
			<div class="mt-4 flex min-h-0 flex-1 flex-col gap-4 text-sm">
				<label class="flex min-h-[48px] min-w-0 cursor-pointer items-center justify-between gap-3 rounded-2xl bg-zinc-50/90 px-4 py-3.5 ring-1 ring-zinc-100">
					<span class="min-w-0 shrink text-zinc-700">VAT registered</span>
					<input type="checkbox" bind:checked={costingSettings.vatRegistered} class="size-4 shrink-0 rounded border-zinc-300 text-teal-600 focus:ring-teal-500" />
				</label>
				<div class="flex min-w-0 items-center gap-2">
					<label class="w-[4.25rem] shrink-0 text-xs text-zinc-500 sm:w-[4.5rem]" for="cs-vat">VAT %</label>
					<input
						id="cs-vat"
						type="number"
						min="0"
						step="0.01"
						bind:value={costingSettings.vatPct}
						class="min-w-0 flex-1 rounded-xl border border-zinc-200/90 bg-white/90 px-3 py-2 text-sm outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-500/15"
					/>
				</div>
				<div class="flex min-w-0 items-center gap-2">
					<label class="w-[4.25rem] shrink-0 text-xs text-zinc-500 sm:w-[4.5rem]" for="cs-margin">Margin %</label>
					<input
						id="cs-margin"
						type="number"
						min="0"
						max="99"
						step="1"
						bind:value={costingSettings.targetMarginPct}
						class="min-w-0 flex-1 rounded-xl border border-zinc-200/90 bg-white/90 px-3 py-2 text-sm outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-500/15"
					/>
				</div>
				<div class="flex min-w-0 items-center gap-2">
					<label class="w-[4.25rem] shrink-0 text-xs text-zinc-500 sm:w-[4.5rem]" for="cs-disc">Discount %</label>
					<input
						id="cs-disc"
						type="number"
						min="0"
						max="100"
						step="1"
						bind:value={costingSettings.discountPct}
						class="min-w-0 flex-1 rounded-xl border border-rose-100 bg-rose-50/50 px-3 py-2 text-sm outline-none focus:border-rose-300 focus:ring-4 focus:ring-rose-400/20"
					/>
				</div>
				<div class="flex min-w-0 items-center gap-2">
					<label class="w-[4.25rem] shrink-0 text-xs text-zinc-500 sm:w-[4.5rem]" for="cs-batch">Batch qty</label>
					<input
						id="cs-batch"
						type="number"
						min="1"
						step="1"
						bind:value={costingSettings.batchSize}
						class="min-w-0 flex-1 rounded-xl border border-zinc-200/90 bg-white/90 px-3 py-2 text-sm outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-500/15"
					/>
				</div>
			</div>
		</div>

		<div
			class="flex h-full min-h-[300px] min-w-0 flex-col rounded-3xl border border-white/80 bg-white/65 p-5 shadow-sm backdrop-blur-md"
		>
			<h3 class="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">Quick summary</h3>
			<div class="mt-4 flex min-h-0 flex-1 flex-col">
				<dl class="space-y-2.5 text-sm">
					<div class="flex justify-between gap-3">
						<dt class="text-zinc-500">COGS</dt>
						<dd class="font-medium tabular-nums text-zinc-900">{fmt(cogs)}</dd>
					</div>
					<div class="flex justify-between gap-3">
						<dt class="text-zinc-500">VAT</dt>
						<dd class="font-medium tabular-nums text-zinc-900">{fmt(sheet.perOrder.vatAmount)}</dd>
					</div>
					<div class="flex justify-between gap-3">
						<dt class="text-zinc-500">Discount</dt>
						<dd class="font-medium tabular-nums text-rose-700">{fmt(sheet.discount.discountAmount)}</dd>
					</div>
					<div class="flex justify-between gap-3 border-t border-zinc-100 pt-3">
						<dt class="text-zinc-700">Final profit</dt>
						<dd class="font-semibold tabular-nums text-emerald-700">{fmt(finalProfit)}</dd>
					</div>
				</dl>
				<p class="mt-auto pt-6 text-[11px] leading-snug text-zinc-400">
					Pricing saves automatically — adjust costs or margin and channels stay aligned.
				</p>
			</div>
		</div>
	</div>

	<!-- Batch economics (compact, light) -->
	<div class="rounded-3xl border border-zinc-100 bg-gradient-to-br from-zinc-50/90 to-white p-4 shadow-sm">
		<h3 class="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">Batch · order economics</h3>
		<div class="mt-3 grid gap-3 sm:grid-cols-2">
			<dl class="space-y-1.5 text-xs">
				<div class="flex justify-between gap-2 text-zinc-600">
					<dt>Ingredients (batch)</dt>
					<dd class="tabular-nums">{fmt(sheet.perBatch.subtotalIngredients)}</dd>
				</div>
				<div class="flex justify-between gap-2 text-zinc-600">
					<dt>Others (batch)</dt>
					<dd class="tabular-nums">{fmt(sheet.perBatch.otherCosts)}</dd>
				</div>
				<div class="flex justify-between gap-2 font-medium text-zinc-900">
					<dt>Batch total</dt>
					<dd class="tabular-nums">{fmt(sheet.perBatch.totalCost)}</dd>
				</div>
			</dl>
			<dl class="space-y-1.5 text-xs">
				<div class="flex justify-between gap-2 text-zinc-600">
					<dt>Ingredients / order</dt>
					<dd class="tabular-nums">{fmt(sheet.perOrder.subtotalIngredients)}</dd>
				</div>
				<div class="flex justify-between gap-2 text-zinc-600">
					<dt>Others / order</dt>
					<dd class="tabular-nums">{fmt(sheet.perOrder.otherCosts)}</dd>
				</div>
				<div class="flex justify-between gap-2 text-zinc-500">
					<dt>Pre-VAT</dt>
					<dd class="tabular-nums">{fmt(sheet.perOrder.priceBeforeVAT)}</dd>
				</div>
			</dl>
		</div>
	</div>

	<!-- Channels -->
	<div class="rounded-3xl border border-white/80 bg-white/70 p-4 shadow-sm backdrop-blur-md">
		<h3 class="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">Channel pricing</h3>
		<p class="mt-1 text-xs text-zinc-500">
			<strong class="text-zinc-700">Local</strong> uses your catalog COGS and margin settings.
			<strong class="text-zinc-700">Shopee</strong> and <strong class="text-zinc-700">Lazada</strong> list prices unlock when every recipe line is priced for
			that channel: landed package in the catalog (same base qty as the marketplace tab), or mark a SKU as local-only.
		</p>
		<ul class="mt-3 space-y-2">
			{#each channels as row}
				<li
					class="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-gradient-to-r from-zinc-50/90 to-white px-4 py-3 ring-1 ring-zinc-100/80"
				>
					<div>
						<p class="text-sm font-semibold text-zinc-900">{row.label}</p>
						<p class="text-[11px] text-zinc-400">{row.hint}</p>
					</div>
					<div class="text-right">
						{#if row.key === 'local'}
							<p class="text-base font-semibold tabular-nums text-zinc-900">{fmt(sell)}</p>
							<p class="text-[11px] text-zinc-500">
								<span class="tabular-nums">{formatPercent1(marginPct)}</span> margin · +{fmt(profitBeforeDiscount)}
							</p>
						{:else if row.key === 'shopee'}
							{#if autoPricing.shopee > 0 && autoPricing.cogsShopee !== null}
								{@const mpS = marginPercentAtPrice(autoPricing.shopee, autoPricing.cogsShopee)}
								{@const profS = autoPricing.shopee - autoPricing.cogsShopee}
								<p class="text-base font-semibold tabular-nums text-zinc-900">{fmt(autoPricing.shopee)}</p>
								<p class="text-[11px] text-zinc-500">
									<span class="tabular-nums">{formatPercent1(mpS)}</span> margin · +{fmt(profS)}
								</p>
							{:else}
								<p class="text-base font-semibold text-zinc-400">—</p>
								<p class="text-[11px] text-zinc-400">Complete Shopee pricing for all lines</p>
							{/if}
						{:else}
							{#if autoPricing.lazada > 0 && autoPricing.cogsLazada !== null}
								{@const mpL = marginPercentAtPrice(autoPricing.lazada, autoPricing.cogsLazada)}
								{@const profL = autoPricing.lazada - autoPricing.cogsLazada}
								<p class="text-base font-semibold tabular-nums text-zinc-900">{fmt(autoPricing.lazada)}</p>
								<p class="text-[11px] text-zinc-500">
									<span class="tabular-nums">{formatPercent1(mpL)}</span> margin · +{fmt(profL)}
								</p>
							{:else}
								<p class="text-base font-semibold text-zinc-400">—</p>
								<p class="text-[11px] text-zinc-400">Complete Lazada pricing for all lines</p>
							{/if}
						{/if}
					</div>
				</li>
			{/each}
		</ul>
	</div>

	<!-- Analytics -->
	<div class="rounded-3xl border border-white/80 bg-white/70 p-4 shadow-sm backdrop-blur-md">
		<h3 class="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">Profit analytics</h3>
		<div class="mt-3 flex items-center gap-2 text-sm">
			<span aria-hidden="true">{healthCopy.dot}</span>
			<span class="font-semibold text-zinc-800">{healthCopy.label}</span>
			<span class="text-zinc-400">·</span>
			<span class="tabular-nums text-zinc-600">{formatPercent1(marginPct)} margin</span>
		</div>
		<p class="mt-1 text-xs text-zinc-500">{healthCopy.sub}</p>

		<div class="mt-4">
			<div class="mb-1 flex justify-between text-[11px] font-medium text-zinc-500">
				<span>Profit meter</span>
				<span class="tabular-nums">{formatPercent1(marginPct)}</span>
			</div>
			<div class="h-2.5 overflow-hidden rounded-full bg-zinc-100">
				<div
					class="h-full rounded-full bg-gradient-to-r {meterTint} transition-all duration-500 ease-out"
					style={`width: ${Math.min(100, Math.max(0, marginPct)).toFixed(2)}%`}
				></div>
			</div>
		</div>

		<div class="mt-5">
			<p class="mb-2 text-[11px] font-medium uppercase tracking-wide text-zinc-400">Revenue vs cost</p>
			<div class="flex h-28 gap-3">
				<div class="flex flex-1 flex-col justify-end rounded-2xl bg-zinc-100/80 p-3 ring-1 ring-zinc-100">
					<span class="text-[10px] font-semibold uppercase text-zinc-400">Cost</span>
					<div class="mt-2 flex flex-1 flex-col justify-end overflow-hidden rounded-lg bg-white/60">
						<div
							class="w-full rounded-t-lg bg-gradient-to-t from-slate-600 to-slate-400 transition-all duration-500"
							style={`height: ${chartCostPct.toFixed(1)}%`}
						></div>
					</div>
					<span class="mt-2 text-xs font-semibold tabular-nums text-zinc-700">{fmt(cogs)}</span>
				</div>
				<div class="flex flex-1 flex-col justify-end rounded-2xl bg-emerald-50/50 p-3 ring-1 ring-emerald-100">
					<span class="text-[10px] font-semibold uppercase text-emerald-700/80">Revenue</span>
					<div class="mt-2 flex flex-1 flex-col justify-end overflow-hidden rounded-lg bg-white/60">
						<div class="h-full rounded-t-lg bg-gradient-to-t from-emerald-600 to-teal-400"></div>
					</div>
					<span class="mt-2 text-xs font-semibold tabular-nums text-emerald-900">{fmt(sell)}</span>
				</div>
			</div>
		</div>
	</div>
</div>
