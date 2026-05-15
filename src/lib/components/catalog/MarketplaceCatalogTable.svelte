<script lang="ts">
	import type { ChannelMarketplace, IngredientMasterDTO, OtherItemMasterDTO } from '$lib/types/recipe';
	import {
		canMarkScrapeComplete,
		channelLandedPackagePeso,
		channelUnitCostFromLanded,
		resolvedMarketplaceListingColumns,
		showMarketplaceLandedPrice
	} from '$lib/utils/channelCatalogDisplay';
	import { formatRelativeTime, marketplaceStatusPresentation } from '$lib/utils/marketplaceCatalogUi';
	import { formatPhp } from '$lib/utils/numberFormat';

	type Row = IngredientMasterDTO | OtherItemMasterDTO;

	const {
		rows,
		channel,
		channelLabel,
		itemHeader = 'Item',
		accent = 'emerald',
		onHelpScrape,
		onMarkDone,
		onDelete
	}: {
		rows: Row[];
		channel: ChannelMarketplace;
		channelLabel: string;
		itemHeader?: string;
		accent?: 'emerald' | 'sky';
		onHelpScrape: (row: Row) => void;
		onMarkDone: (row: Row) => void;
		onDelete: (row: Row) => void;
	} = $props();

	const linkMark = $derived(
		accent === 'sky'
			? 'text-teal-700 hover:underline'
			: 'text-teal-700 hover:underline'
	);
	const btnHelp = $derived(
		accent === 'sky'
			? 'border-sky-200 text-sky-800 hover:bg-sky-50'
			: 'border-emerald-200 text-emerald-800 hover:bg-emerald-50'
	);
</script>

<div class="glass animate-in overflow-hidden rounded-3xl shadow-xl transition-all">
	<div class="overflow-x-auto">
		<table class="w-full min-w-[1200px] text-left text-sm">
			<thead>
				<tr class="border-b border-zinc-200/50 bg-zinc-50/50 text-[11px] font-bold uppercase tracking-wider text-zinc-500">
					<th class="px-6 py-4">{itemHeader}</th>
					<th class="px-6 py-4">Scrape Status</th>
					<th class="px-6 py-4 text-right">{channelLabel} Pkg ₱</th>
					<th class="px-6 py-4 text-right">Size</th>
					<th class="px-6 py-4">Unit</th>
					<th class="px-6 py-4 text-right">Shipping fee</th>
					<th class="px-6 py-4 text-right">Base Qty</th>
					<th class="px-6 py-4">Base Unit</th>
					<th class="px-6 py-4 text-right">{channelLabel} Unit ₱</th>
					<th class="px-6 py-4 text-center">Help Scrape</th>
					<th class="px-6 py-4 text-right">Actions</th>
				</tr>
			</thead>
			<tbody class="divide-y divide-zinc-100/50">
				{#each rows as row (row.id)}
					{@const ui = marketplaceStatusPresentation(row, channel)}
					{@const pkg = channelLandedPackagePeso(row, channel)}
					{@const chUnit = channelUnitCostFromLanded(row, channel)}
					{@const dims = resolvedMarketplaceListingColumns(row, channel)}
					{@const meta = row.channelScrape?.[channel]}
					{@const updatedLine = meta?.updatedAt ? formatRelativeTime(meta.updatedAt) : ''}
					<tr class="group transition-colors hover:bg-zinc-50/50">
						<td class="px-6 py-4">
							<span class="font-semibold text-zinc-900">{row.name}</span>
						</td>
						<td class="px-6 py-4">
							<div class="flex max-w-[200px] flex-col gap-1">
								<span
									class="inline-flex w-fit items-center rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ring-1 {ui.badgeClass}"
								>
									{ui.shortLabel}
								</span>
								<span class="text-[11px] leading-snug text-zinc-500">{ui.description}</span>
								{#if updatedLine}
									<span class="text-[10px] text-zinc-400">{updatedLine}</span>
								{/if}
							</div>
						</td>
						<td class="px-6 py-4 text-right font-medium tabular-nums text-zinc-900">
							{#if showMarketplaceLandedPrice(row, channel) && pkg !== null}
								{formatPhp(pkg)}
							{:else}
								<span class="text-zinc-300">—</span>
							{/if}
						</td>
						<td class="px-6 py-4 text-right tabular-nums text-zinc-600">
							{#if dims}{dims.packageSize}{:else}<span class="text-zinc-300">—</span>{/if}
						</td>
						<td class="px-6 py-4 text-xs font-bold uppercase text-zinc-400">
							{#if dims}{dims.packageUnit}{:else}<span class="text-zinc-300">—</span>{/if}
						</td>
						<td class="px-6 py-4 text-right tabular-nums text-zinc-500">
							{#if dims}{formatPhp(dims.shippingFee)}{:else}<span class="text-zinc-300">—</span>{/if}
						</td>
						<td class="px-6 py-4 text-right tabular-nums text-zinc-600">
							{#if dims}{dims.baseQuantity}{:else}<span class="text-zinc-300">—</span>{/if}
						</td>
						<td class="px-6 py-4 text-xs font-bold uppercase text-zinc-400">
							{#if dims}{dims.baseUnit}{:else}<span class="text-zinc-300">—</span>{/if}
						</td>
						<td class="px-6 py-4 text-right">
							{#if showMarketplaceLandedPrice(row, channel) && chUnit !== null}
								<div class="flex flex-col items-end">
									<span class="font-bold text-emerald-700">{formatPhp(chUnit)}</span>
									<span class="text-[10px] text-zinc-400">per {row.baseUnit}</span>
								</div>
							{:else}
								<span class="text-zinc-300">—</span>
							{/if}
						</td>
						<td class="px-6 py-4 text-center">
							<button
								type="button"
								class="inline-flex rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 shadow-sm transition-all hover:bg-emerald-100"
								onclick={() => onHelpScrape(row)}
							>
								Help Scrape
							</button>
						</td>
						<td class="px-6 py-4 text-right">
							<div class="flex flex-col items-end gap-1">
								{#if canMarkScrapeComplete(row, channel)}
									<button
										type="button"
										class="text-xs font-bold text-emerald-600 hover:text-emerald-700 transition-colors"
										onclick={() => onMarkDone(row)}
									>
										Mark Done
									</button>
								{/if}
								<button
									type="button"
									class="text-xs font-bold text-red-400 hover:text-red-600 transition-colors"
									onclick={() => onDelete(row)}
								>
									Delete
								</button>
							</div>
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
	{#if rows.length === 0}
		<div class="flex flex-col items-center justify-center py-20 text-center">
			<p class="text-sm text-zinc-500">No items found for this marketplace view.</p>
		</div>
	{/if}
</div>
