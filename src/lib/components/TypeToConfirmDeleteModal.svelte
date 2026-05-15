<script lang="ts">
	const {
		open,
		title,
		description,
		confirmPhrase = 'confirm',
		onClose,
		onConfirm
	}: {
		open: boolean;
		title: string;
		description: string;
		confirmPhrase?: string;
		onClose: () => void;
		onConfirm: () => void;
	} = $props();

	let backdrop: HTMLDivElement | undefined = $state();
	let typed = $state('');
	let shake = $state(false);

	$effect(() => {
		if (open) typed = '';
	});

	const canSubmit = $derived(typed.trim().toLowerCase() === confirmPhrase.trim().toLowerCase());

	function close(): void {
		typed = '';
		onClose();
	}

	function onBackdropMouseDown(e: MouseEvent): void {
		if (e.target === backdrop) close();
	}

	function submit(e: Event): void {
		e.preventDefault();
		if (!canSubmit) {
			shake = true;
			setTimeout(() => (shake = false), 400);
			return;
		}
		onConfirm();
		close();
	}
</script>

{#if open}
	<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
	<div
		bind:this={backdrop}
		class="fixed inset-0 z-[80] flex items-center justify-center bg-zinc-950/45 p-4 backdrop-blur-sm"
		onmousedown={onBackdropMouseDown}
		role="dialog"
		aria-modal="true"
		aria-labelledby="confirm-del-title"
		tabindex="-1"
	>
		<form
			class="w-full max-w-md rounded-3xl border border-white/70 bg-white p-6 shadow-2xl {shake ? 'animate-shake' : ''}"
			onsubmit={submit}
		>
			<h2 id="confirm-del-title" class="text-lg font-semibold text-zinc-900">{title}</h2>
			<p class="mt-2 text-sm text-zinc-600">{description}</p>
			<p class="mt-4 text-xs font-medium text-zinc-500">
				Type <span class="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-zinc-800">{confirmPhrase}</span> to confirm.
			</p>
			<input
				type="text"
				bind:value={typed}
				autocomplete="off"
				class="mt-2 w-full rounded-xl border border-zinc-200 px-3 py-2.5 text-sm outline-none focus:border-red-400 focus:ring-4 focus:ring-red-500/15"
				placeholder={confirmPhrase}
				aria-invalid={typed.length > 0 && !canSubmit}
			/>

			<div class="mt-6 flex justify-end gap-2">
				<button
					type="button"
					class="rounded-xl px-4 py-2.5 text-sm font-medium text-zinc-600 hover:bg-zinc-100"
					onclick={close}
				>
					Cancel
				</button>
				<button
					type="submit"
					disabled={!canSubmit}
					class="rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-40"
				>
					Delete
				</button>
			</div>
		</form>
	</div>
{/if}

<style>
	@keyframes shake {
		0%,
		100% {
			transform: translateX(0);
		}
		20%,
		60% {
			transform: translateX(-6px);
		}
		40%,
		80% {
			transform: translateX(6px);
		}
	}
	:global(.animate-shake) {
		animation: shake 0.35s ease-in-out;
	}
</style>
