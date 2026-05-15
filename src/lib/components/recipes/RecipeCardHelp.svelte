<script lang="ts">
	import type { Snippet } from 'svelte';

	const {
		expanded,
		onToggle,
		label,
		title,
		children
	}: {
		expanded: boolean;
		onToggle: (e: MouseEvent) => void;
		/** Short label for aria on the ? control */
		label: string;
		/** Section heading (e.g. “Suggested selling price”) — stays on one row with ? */
		title: Snippet;
		/** Help copy — full width below the heading row when open */
		children: Snippet;
	} = $props();
</script>

<div class="flex w-full min-w-0 flex-col gap-2">
	<div class="flex min-w-0 flex-wrap items-center gap-1.5">
		{@render title()}
		<button
			type="button"
			class="flex h-5 w-5 shrink-0 items-center justify-center rounded border border-zinc-300/90 bg-white text-[11px] font-bold leading-none text-zinc-600 shadow-sm ring-zinc-200/80 transition hover:border-zinc-400 hover:bg-zinc-50 hover:text-zinc-900"
			aria-expanded={expanded}
			aria-label={`Help: ${label}`}
			onclick={(e) => {
				e.stopPropagation();
				e.preventDefault();
				onToggle(e);
			}}
		>
			?
		</button>
	</div>
	{#if expanded}
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
		<div
			role="note"
			class="w-full max-w-full rounded-lg border border-zinc-200/90 bg-white px-2.5 py-2.5 text-left text-[11px] leading-relaxed text-zinc-600 shadow-lg ring-1 ring-zinc-200/60"
			onclick={(e) => e.stopPropagation()}
		>
			{@render children()}
		</div>
	{/if}
</div>
