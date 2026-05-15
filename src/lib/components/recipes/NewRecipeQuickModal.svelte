<script lang="ts">
	let {
		open = false,
		onAdd,
		onClose
	}: {
		open: boolean;
		onAdd: (name: string) => void;
		onClose: () => void;
	} = $props();

	let draftName = $state('');

	$effect(() => {
		if (open) draftName = '';
	});

	function submit(): void {
		const name = draftName.trim();
		if (!name) return;
		onAdd(name);
		draftName = '';
	}
</script>

{#if open}
	<div
		class="fixed inset-0 z-40 flex items-center justify-center bg-zinc-950/45 p-4 backdrop-blur-[2px]"
		role="dialog"
		aria-modal="true"
		aria-labelledby="quick-recipe-title"
		tabindex="-1"
	>
		<div class="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl">
			<h2 id="quick-recipe-title" class="text-lg font-semibold text-zinc-900">New recipe</h2>
			<p class="mt-1 text-sm text-zinc-500">Only creates the recipe record. Add ingredients/costing in See details later.</p>

			<label class="mt-4 block text-xs font-semibold uppercase text-zinc-500" for="quick-recipe-name">Recipe name</label>
			<input
				id="quick-recipe-name"
				bind:value={draftName}
				class="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2.5 text-sm outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-500/15"
				autocomplete="off"
			/>

			<div class="mt-6 flex gap-2">
				<button
					type="button"
					class="w-full rounded-xl border border-zinc-200 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
					onclick={onClose}
				>
					Close
				</button>
				<button
					type="button"
					class="w-full rounded-xl bg-zinc-900 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60"
					onclick={submit}
					disabled={!draftName.trim()}
				>
					Add
				</button>
			</div>
		</div>
	</div>
{/if}
