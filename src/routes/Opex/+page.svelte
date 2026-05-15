<script lang="ts">
	import TypeToConfirmDeleteModal from '$lib/components/TypeToConfirmDeleteModal.svelte';
	import {
		addOpexLine,
		deleteOpexLine,
		monthlyOpexTotal,
		opexStore,
		updateOpexLine
	} from '$lib/state/opexStore.svelte';
	import { formatPhp } from '$lib/utils/numberFormat';

	let labelDraft = $state('');
	let amountDraft = $state(0);

	let editingId = $state<string | null>(null);
	let editLabel = $state('');
	let editAmount = $state(0);

	const monthly = $derived(monthlyOpexTotal());

	function submit(e: Event): void {
		e.preventDefault();
		if (!labelDraft.trim()) return;
		addOpexLine(labelDraft.trim(), amountDraft);
		labelDraft = '';
		amountDraft = 0;
	}

	function startEdit(row: (typeof opexStore.lines)[number]): void {
		editingId = row.id;
		editLabel = row.label;
		editAmount = row.amountPerMonth;
	}

	function saveEdit(): void {
		if (!editingId) return;
		updateOpexLine(editingId, { label: editLabel, amountPerMonth: editAmount });
		editingId = null;
	}

	function cancelEdit(): void {
		editingId = null;
	}

	let deleteTarget = $state<{ id: string; label: string } | null>(null);

	function requestDelete(row: (typeof opexStore.lines)[number]): void {
		deleteTarget = { id: row.id, label: row.label };
	}

	function executeDelete(): void {
		if (deleteTarget) deleteOpexLine(deleteTarget.id);
		deleteTarget = null;
	}
</script>

<section class="animate-in space-y-8">
	<!-- Premium Header Section -->
	<div class="relative overflow-hidden rounded-3xl bg-zinc-900 p-8 text-white shadow-2xl lg:p-12">
		<div class="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-emerald-500/20 blur-3xl"></div>
		<div class="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-zinc-500/10 blur-3xl"></div>

		<div class="relative z-10 flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
			<div class="space-y-2">
				<h1 class="text-4xl font-bold tracking-tight sm:text-5xl">
					Operating <span class="text-emerald-400">Expenses</span>
				</h1>
				<p class="max-w-2xl text-lg text-zinc-400">
					Fixed monthly costs like rent, salaries, and utilities. These roll into your overall summary.
				</p>
			</div>

			<!-- Monthly Total Card inside Header -->
			<div class="glass-dark flex flex-col items-center justify-center rounded-2xl px-8 py-6 shadow-lg lg:min-w-[240px]">
				<p class="text-xs font-bold uppercase tracking-wider text-zinc-400">Monthly Total</p>
				<p class="mt-2 text-4xl font-bold tabular-nums text-emerald-400">{formatPhp(monthly)}</p>
			</div>
		</div>
	</div>

	<!-- Add OPEX Form -->
	<div class="glass overflow-hidden rounded-3xl p-6 shadow-xl">
		<h2 class="mb-4 text-sm font-bold uppercase tracking-wider text-zinc-500">Add New Expense</h2>
		<form
			class="flex flex-col gap-4 sm:flex-row sm:items-end"
			onsubmit={submit}
		>
			<div class="flex-1">
				<label class="mb-1 block text-xs font-bold text-zinc-500" for="ox-label">Item Label</label>
				<input
					id="ox-label"
					bind:value={labelDraft}
					placeholder="e.g. Rent, Electricity"
					class="w-full rounded-xl border-zinc-200 bg-white px-4 py-2.5 text-sm ring-offset-2 transition-all focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
				/>
			</div>
			<div class="w-full sm:w-48">
				<label class="mb-1 block text-xs font-bold text-zinc-500" for="ox-amt">Amount / month (₱)</label>
				<input
					id="ox-amt"
					type="number"
					step="any"
					bind:value={amountDraft}
					class="w-full rounded-xl border-zinc-200 bg-white px-4 py-2.5 text-right text-sm tabular-nums transition-all focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
				/>
			</div>
			<button
				type="submit"
				class="flex items-center justify-center gap-2 rounded-xl bg-zinc-900 px-8 py-2.5 text-sm font-bold text-white shadow-lg transition-transform hover:scale-[1.02] active:scale-[0.98]"
			>
				<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-plus"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
				Add OPEX
			</button>
		</form>
	</div>

	<!-- OPEX List Table -->
	<div class="glass overflow-hidden rounded-3xl shadow-xl transition-all">
		<div class="overflow-x-auto">
			<table class="w-full min-w-[600px] text-left text-sm">
				<thead>
					<tr class="border-b border-zinc-200/50 bg-zinc-50/50 text-[11px] font-bold uppercase tracking-wider text-zinc-500">
						<th class="px-6 py-4">Expense Item</th>
						<th class="px-6 py-4 text-right">Amount / Month</th>
						<th class="px-6 py-4 text-right">Actions</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-zinc-100/50">
					{#each opexStore.lines as row (row.id)}
						{#if editingId === row.id}
							<tr class="bg-emerald-50/30 transition-colors">
								<td class="px-6 py-4">
									<input bind:value={editLabel} class="w-full rounded-xl border-zinc-200 bg-white px-3 py-2 text-sm focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10" />
								</td>
								<td class="px-6 py-4">
									<input type="number" step="any" bind:value={editAmount} class="w-full rounded-xl border-zinc-200 bg-white px-3 py-2 text-right text-sm tabular-nums focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10" />
								</td>
								<td class="px-6 py-4 text-right">
									<div class="flex justify-end gap-2">
										<button onclick={saveEdit} class="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-500">Save</button>
										<button onclick={cancelEdit} class="rounded-lg bg-zinc-200 px-3 py-1.5 text-xs font-bold text-zinc-700 hover:bg-zinc-300">Cancel</button>
									</div>
								</td>
							</tr>
						{:else}
							<tr class="group transition-colors hover:bg-zinc-50/50">
								<td class="px-6 py-4">
									<div class="flex items-center gap-3">
										<div class="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-100 text-zinc-600">
											<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-receipt"><path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1-2-1Z"/><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"/><path d="M12 17.5V6.5"/></svg>
										</div>
										<span class="font-semibold text-zinc-900">{row.label}</span>
									</div>
								</td>
								<td class="px-6 py-4 text-right">
									<span class="font-bold tabular-nums text-zinc-900">{formatPhp(row.amountPerMonth)}</span>
								</td>
								<td class="px-6 py-4 text-right">
									<div class="flex justify-end gap-1">
										<button
											type="button"
											class="rounded-lg p-2 text-zinc-400 hover:bg-emerald-50 hover:text-emerald-600 transition-colors"
											onclick={() => startEdit(row)}
											title="Edit expense"
										>
											<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-edit-2"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>
										</button>
										<button
											type="button"
											class="rounded-lg p-2 text-zinc-400 hover:bg-red-50 hover:text-red-600 transition-colors"
											onclick={() => requestDelete(row)}
											title="Delete expense"
										>
											<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-trash-2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
										</button>
									</div>
								</td>
							</tr>
						{/if}
					{/each}
				</tbody>
			</table>
		</div>
		{#if opexStore.lines.length === 0}
			<div class="flex flex-col items-center justify-center py-20 text-center">
				<div class="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-zinc-50 shadow-inner">
					<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" class="text-zinc-300"><path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1-2-1Z"/><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"/><path d="M12 17.5V6.5"/></svg>
				</div>
				<h3 class="text-lg font-bold text-zinc-900">No expenses listed</h3>
				<p class="mt-1 text-sm text-zinc-500">Track your fixed monthly costs here.</p>
			</div>
		{/if}
	</div>
</section>

<TypeToConfirmDeleteModal
	open={deleteTarget !== null}
	title="Delete OPEX line?"
	description={deleteTarget
		? `Remove “${deleteTarget.label}” from monthly operating expenses.`
		: ''}
	onClose={() => (deleteTarget = null)}
	onConfirm={executeDelete}
/>
