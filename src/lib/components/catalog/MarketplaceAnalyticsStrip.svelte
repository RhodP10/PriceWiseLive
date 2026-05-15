<script lang="ts">
	import type { ChannelMarketplace } from '$lib/types/recipe';
	import type { CatalogRow } from '$lib/utils/marketplaceCatalogUi';
	import {
		aggregateMarketplacePrices,
		listingAvailabilityPct
	} from '$lib/utils/marketplaceCatalogUi';
	import { formatPhp } from '$lib/utils/numberFormat';

	const {
		items,
		channel,
		channelLabel,
		accent = 'emerald'
	}: {
		items: CatalogRow[];
		channel: ChannelMarketplace;
		channelLabel: string;
		accent?: 'emerald' | 'sky';
	} = $props();

	const agg = $derived(aggregateMarketplacePrices(items, channel));
	const availPct = $derived(listingAvailabilityPct(items, channel));

	const ring = $derived(
		accent === 'sky'
			? 'ring-sky-200/60 dark:ring-sky-500/30'
			: 'ring-emerald-200/60 dark:ring-emerald-500/30'
	);
	const tile = $derived(
		accent === 'sky'
			? 'from-sky-50/90 to-white dark:from-sky-950/40 dark:to-zinc-900'
			: 'from-emerald-50/90 to-white dark:from-emerald-950/40 dark:to-zinc-900'
	);
</script>

<div
	class="rounded-3xl border border-white/70 bg-white/70 p-5 shadow-sm backdrop-blur-md dark:border-zinc-700 dark:bg-zinc-900/70 {ring} ring-1"
>
	<div class="flex flex-wrap items-center justify-between gap-3">
		<div>
			<h2 class="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
				Marketplace intelligence · {channelLabel}
			</h2>
			<p class="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
				Aggregated landed prices · listing coverage · no supplier names on surface
			</p>
		</div>
		<div
			class="rounded-2xl bg-gradient-to-br px-4 py-2 text-center text-xs font-semibold {tile} dark:text-zinc-100"
		>
			<span class="text-zinc-500 dark:text-zinc-400">Availability</span>
			<p class="text-lg tabular-nums text-zinc-900 dark:text-white">{availPct}%</p>
		</div>
	</div>

	<div class="mt-4 grid gap-3 sm:grid-cols-3">
		<div class="rounded-2xl border border-zinc-100 bg-zinc-50/80 px-4 py-3 dark:border-zinc-700 dark:bg-zinc-800/80">
			<p class="text-[11px] font-medium uppercase text-zinc-500 dark:text-zinc-400">Avg landed pkg</p>
			<p class="mt-1 text-xl font-semibold tabular-nums text-zinc-900 dark:text-white">
				{#if agg.avg !== null}
					{formatPhp(agg.avg)}
				{:else}
					<span class="text-zinc-400">—</span>
				{/if}
			</p>
		</div>
		<div class="rounded-2xl border border-zinc-100 bg-zinc-50/80 px-4 py-3 dark:border-zinc-700 dark:bg-zinc-800/80">
			<p class="text-[11px] font-medium uppercase text-zinc-500 dark:text-zinc-400">Low / High</p>
			<p class="mt-1 text-sm font-semibold tabular-nums text-zinc-900 dark:text-white">
				{#if agg.min !== null && agg.max !== null}
					{formatPhp(agg.min)} · {formatPhp(agg.max)}
				{:else}
					<span class="text-zinc-400">—</span>
				{/if}
			</p>
		</div>
		<div class="rounded-2xl border border-zinc-100 bg-zinc-50/80 px-4 py-3 dark:border-zinc-700 dark:bg-zinc-800/80">
			<p class="text-[11px] font-medium uppercase text-zinc-500 dark:text-zinc-400">Synced listings</p>
			<p class="mt-1 text-xl font-semibold tabular-nums text-zinc-900 dark:text-white">
				{agg.withData}<span class="text-sm font-normal text-zinc-500">/{items.length}</span>
			</p>
		</div>
	</div>
</div>
