<script lang="ts">
	import type { MeasureUnit } from '$lib/types/recipe';
	import {
		addIngredientMaster,
		computeCatalogUnitCost,
		MEASURE_UNIT_OPTIONS
	} from '$lib/state/ingredientCatalog.svelte';
	import { toBaseQuantity } from '$lib/utils/baseUnitCost';
	import { formatDecimal, formatPhp } from '$lib/utils/numberFormat';

	let {
		open = $bindable(false)
	}: {
		open?: boolean;
	} = $props();

	let name = $state('');
	let supplier = $state('');
	let packagePrice = $state(0);
	let packageSize = $state(1);
	let shippingFee = $state(0);
	let packageUnit = $state<MeasureUnit>('kg');
	let marketplaceSourcingLocalOnly = $state(false);

	let backdrop: HTMLDivElement | undefined = $state();

	const previewUnitCost = $derived(
		computeCatalogUnitCost({ packagePrice, packageSize, packageUnit, shippingFee })
	);
	const previewBase = $derived(toBaseQuantity(packageSize, packageUnit));

	function reset(): void {
		name = '';
		supplier = '';
		packagePrice = 0;
		packageSize = 1;
		shippingFee = 0;
		packageUnit = 'kg';
		marketplaceSourcingLocalOnly = false;
	}

	function submit(e: Event): void {
		e.preventDefault();
		if (!name.trim()) return;
		addIngredientMaster({
			name: name.trim(),
			supplier: supplier.trim(),
			packagePrice,
			packageSize,
			packageUnit,
			shippingFee,
			marketplaceSourcingLocalOnly
		});
		reset();
		open = false;
	}

	function onBackdropMouseDown(ev: MouseEvent): void {
		if (ev.target === backdrop) open = false;
	}

	function onKeydown(e: KeyboardEvent): void {
		if (e.key === 'Escape') open = false;
	}

	$effect(() => {
		if (open) reset();
	});
</script>

<svelte:window onkeydown={open ? onKeydown : undefined} />

{#if open}
	<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
	<div
		bind:this={backdrop}
		class="fixed inset-0 z-[60] flex items-center justify-center bg-zinc-950/50 p-4 backdrop-blur-sm"
		onmousedown={onBackdropMouseDown}
		role="dialog"
		aria-modal="true"
		aria-labelledby="add-ing-title"
		tabindex="-1"
	>
		<form
			class="max-h-[90vh] w-full max-w-lg overflow-hidden overflow-y-auto rounded-2xl border border-zinc-200 bg-white shadow-2xl"
			onsubmit={submit}
		>
			<div class="bg-zinc-900 px-5 pb-5 pt-5 text-white sm:px-6 sm:pb-6 sm:pt-6">
				<div class="flex items-start justify-between gap-4">
					<div class="min-w-0">
						<p class="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">Catalog</p>
						<h2 id="add-ing-title" class="mt-1 text-xl font-bold tracking-tight">Add ingredient</h2>
						<p class="mt-2 text-sm leading-relaxed text-zinc-400">
							Package price, size, shipping, and unit — same flow as adding a line on a recipe.
						</p>
					</div>
					<button
						type="button"
						class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-lg leading-none text-zinc-400 transition hover:bg-white/10 hover:text-white"
						onclick={() => (open = false)}
						aria-label="Close"
					>
						×
					</button>
				</div>
			</div>

			<div class="space-y-3 p-6">
				<div>
					<label class="text-xs font-semibold uppercase text-zinc-500" for="im-name">Ingredient</label>
					<input
						id="im-name"
						bind:value={name}
						required
						class="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm"
						placeholder="e.g. Matcha powder"
					/>
				</div>
				<div>
					<label class="text-xs font-semibold uppercase text-zinc-500" for="im-sup">Supplier</label>
					<input
						id="im-sup"
						bind:value={supplier}
						class="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm"
						placeholder="Supplier name"
					/>
				</div>
				<div class="grid gap-3 sm:grid-cols-2">
					<div>
						<label class="text-xs font-semibold uppercase text-zinc-500" for="im-packp">Package price (₱)</label>
						<input
							id="im-packp"
							type="number"
							min="0"
							step="any"
							bind:value={packagePrice}
							class="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm"
						/>
					</div>
					<div>
						<label class="text-xs font-semibold uppercase text-zinc-500" for="im-packq">Package size</label>
						<input
							id="im-packq"
							type="number"
							min="0"
							step="any"
							bind:value={packageSize}
							class="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm"
						/>
					</div>
				</div>
				<div class="grid gap-3 sm:grid-cols-2">
					<div>
						<label class="text-xs font-semibold uppercase text-zinc-500" for="im-ship">Shipping (₱)</label>
						<input
							id="im-ship"
							type="number"
							min="0"
							step="any"
							bind:value={shippingFee}
							class="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm"
						/>
					</div>
					<div>
						<label class="text-xs font-semibold uppercase text-zinc-500" for="im-unit">Package unit</label>
						<select
							id="im-unit"
							bind:value={packageUnit}
							class="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm"
						>
							{#each MEASURE_UNIT_OPTIONS as u}
								<option value={u.value}>{u.label}</option>
							{/each}
						</select>
					</div>
				</div>

				<label class="flex cursor-pointer items-start gap-3 rounded-xl border border-zinc-200 bg-zinc-50/80 px-3 py-2.5 text-sm">
					<input
						type="checkbox"
						bind:checked={marketplaceSourcingLocalOnly}
						class="mt-0.5 h-4 w-4 shrink-0 rounded border-zinc-300 text-orange-600 focus:ring-orange-500"
					/>
					<span>
						<span class="font-semibold text-zinc-800">Local-only SKU</span>
						<span class="mt-0.5 block text-xs leading-snug text-zinc-600">
							Use for ice, water, or anything you never buy on Lazada/Shopee. Recipe marketplace COGS uses your catalog unit cost; no listing required.
						</span>
					</span>
				</label>

				<div class="rounded-xl bg-emerald-50 px-4 py-3 text-sm">
					<div class="text-emerald-900">
						Base quantity: <strong>{formatDecimal(previewBase.quantity)}</strong> {previewBase.unit}
					</div>
					<span class="text-emerald-800">Computed unit cost:</span>
					<strong class="ml-2 tabular-nums text-emerald-950">{formatPhp(previewUnitCost)}</strong>
					<span class="text-emerald-700"> / base unit</span>
				</div>

				<div class="flex gap-2 border-t border-zinc-100 pt-5">
					<button
						type="button"
						class="flex-1 rounded-xl border border-zinc-200 bg-white py-2.5 text-sm font-semibold text-zinc-800 shadow-sm hover:bg-zinc-50"
						onclick={() => (open = false)}
					>
						Cancel
					</button>
					<button
						type="submit"
						class="flex-1 rounded-xl bg-orange-600 py-2.5 text-sm font-bold text-white shadow-md hover:bg-orange-500"
					>
						Save ingredient
					</button>
				</div>
			</div>
		</form>
	</div>
{/if}
