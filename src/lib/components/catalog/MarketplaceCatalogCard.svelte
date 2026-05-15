<script lang="ts">
	import type { ChannelMarketplace } from '$lib/types/recipe';
	import type { IngredientMasterDTO, OtherItemMasterDTO } from '$lib/types/recipe';
	import {
		canMarkScrapeComplete,
		channelLandedPackagePeso,
		channelUnitCostFromLanded,
		showMarketplaceLandedPrice
	} from '$lib/utils/channelCatalogDisplay';
	import {
		formatRelativeTime,
		marketplaceStatusPresentation,
		marketplaceVsLocalMarginPct
	} from '$lib/utils/marketplaceCatalogUi';
	import { formatPhp, formatPercent1Signed } from '$lib/utils/numberFormat';

	type Row = IngredientMasterDTO | OtherItemMasterDTO;

	const {
		row,
		channel,
		onHelpScrape,
		onMarkDone,
		onEdit,
		onDelete,
		accent = 'emerald'
	}: {
		row: Row;
		channel: ChannelMarketplace;
		onHelpScrape: (row: Row) => void;
		onMarkDone: (row: Row) => void;
		onEdit?: (row: Row) => void;
		onDelete?: (row: Row) => void;
		accent?: 'emerald' | 'sky';
	} = $props();

	const ui = $derived(marketplaceStatusPresentation(row, channel));
	const pkg = $derived(channelLandedPackagePeso(row, channel));
	const unit = $derived(channelUnitCostFromLanded(row, channel));
	const marginVsLocal = $derived(marketplaceVsLocalMarginPct(row, channel));
	const meta = $derived(row.channelScrape?.[channel]);
	const updatedLine = $derived(
		meta?.updatedAt ? formatRelativeTime(meta.updatedAt) : ''
	);

	const btnPrimary = $derived(
		accent === 'sky'
			? 'ring-sky-200 text-sky-800 hover:bg-sky-50 dark:ring-sky-600 dark:text-sky-100 dark:hover:bg-sky-950/50'
			: 'ring-emerald-200 text-emerald-800 hover:bg-emerald-50 dark:ring-emerald-600 dark:text-emerald-100 dark:hover:bg-emerald-950/50'
	);
</script>

<article
	class="group relative flex flex-col overflow-hidden rounded-3xl border border-white/80 bg-white/75 p-5 shadow-md backdrop-blur-md transition hover:shadow-lg dark:border-zinc-700 dark:bg-zinc-900/80 {ui.glowClass}"
>
	{#if ui.shimmer}
		<div
			class="pointer-events-none absolute inset-0 -translate-x-full animate-[shimmer_1.8s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-white/50 to-transparent dark:via-white/5"
			aria-hidden="true"
		></div>
	{/if}

	<div class="relative flex flex-1 flex-col gap-3">
		<div class="flex items-start justify-between gap-2">
			<div class="min-w-0">
				<h3 class="truncate text-base font-semibold tracking-tight text-zinc-900 dark:text-white">{row.name}</h3>
				<p class="mt-0.5 text-[11px] text-zinc-500 dark:text-zinc-400">Catalog item · marketplace economics</p>
			</div>
			<span
				class="inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 {ui.badgeClass} {ui.pulse
					? 'animate-pulse'
					: ''}"
			>
				{ui.shortLabel}
			</span>
		</div>

		<div class="grid grid-cols-2 gap-3 rounded-2xl bg-zinc-50/90 px-3 py-3 dark:bg-zinc-800/60">
			<div>
				<p class="text-[10px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
					Pkg landed
				</p>
				<p class="mt-0.5 text-lg font-semibold tabular-nums text-zinc-900 dark:text-white">
					{#if showMarketplaceLandedPrice(row, channel) && pkg !== null}
						{formatPhp(pkg)}
					{:else}
						<span class="text-zinc-400">—</span>
					{/if}
				</p>
			</div>
			<div>
				<p class="text-[10px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
					vs local unit
				</p>
				<p
					class="mt-0.5 text-lg font-semibold tabular-nums"
					class:text-emerald-700={marginVsLocal !== null && marginVsLocal <= 0}
					class:text-amber-700={marginVsLocal !== null && marginVsLocal > 0}
					class:text-zinc-400={marginVsLocal === null}
				>
					{#if marginVsLocal !== null}
						{formatPercent1Signed(marginVsLocal)}
					{:else}
						—
					{/if}
				</p>
			</div>
		</div>

		<p class="text-xs leading-snug text-zinc-600 dark:text-zinc-300">{ui.description}</p>

		<div class="mt-auto space-y-2 border-t border-zinc-100 pt-3 dark:border-zinc-700">
			<p class="text-[11px] text-zinc-500 dark:text-zinc-400">
				{#if unit !== null && showMarketplaceLandedPrice(row, channel)}
					Marketplace unit {formatPhp(unit)} · local catalog ref {formatPhp(row.unitCost)}
				{:else}
					Local catalog ref {formatPhp(row.unitCost)} · unlock after sync
				{/if}
			</p>
			<p class="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
				{updatedLine || 'No sync timestamp yet'}
			</p>
			<div class="flex flex-wrap gap-2">
				<button
					type="button"
					class="rounded-xl bg-white px-3 py-1.5 text-xs font-semibold ring-1 {btnPrimary}"
					onclick={() => onHelpScrape(row)}
				>
					Help scrape
				</button>
				{#if canMarkScrapeComplete(row, channel)}
					<button
						type="button"
						class="rounded-xl px-3 py-1.5 text-xs font-semibold text-teal-800 ring-1 ring-teal-200 hover:bg-teal-50 dark:text-teal-100 dark:ring-teal-700 dark:hover:bg-teal-950/40"
						onclick={() => onMarkDone(row)}
					>
						Mark scrape done
					</button>
				{/if}
			</div>
			{#if onEdit && onDelete}
				<div class="flex flex-wrap justify-end gap-2 border-t border-zinc-100 pt-3 dark:border-zinc-700">
					<button
						type="button"
						class="text-xs font-medium text-emerald-700 hover:underline dark:text-emerald-400"
						onclick={() => onEdit(row)}
					>
						Edit catalog (local)
					</button>
					<button
						type="button"
						class="text-xs font-medium text-red-600 hover:underline dark:text-red-400"
						onclick={() => onDelete(row)}
					>
						Delete
					</button>
				</div>
			{/if}
		</div>
	</div>
</article>

<style>
	@keyframes shimmer {
		100% {
			transform: translateX(100%);
		}
	}
</style>
