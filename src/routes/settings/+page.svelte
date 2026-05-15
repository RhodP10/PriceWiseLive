<script lang="ts">
	import { browser } from '$app/environment';
	import { changePassword } from '$lib/api/authClient';
	import { authState } from '$lib/state/auth.svelte';
	import { hydrateUserPrefs, persistUserPrefs, userPrefs } from '$lib/state/userPrefs.svelte';

	let pwdCurrent = $state('');
	let pwdNew = $state('');
	let pwdConfirm = $state('');
	let pwdBusy = $state(false);
	let pwdMsg = $state<{ kind: 'ok' | 'err'; text: string } | null>(null);

	$effect(() => {
		if (!browser) return;
		hydrateUserPrefs();
	});

	function initialsFromEmail(email: string): string {
		const local = email.split('@')[0]?.trim() ?? '?';
		const parts = local.split(/[.\s_-]+/).filter(Boolean);
		if (parts.length >= 2) return (parts[0]![0] + parts[1]![0]).toUpperCase();
		return local.slice(0, 2).toUpperCase() || '?';
	}

	function saveProfile(): void {
		persistUserPrefs();
	}

	async function submitPasswordChange(e: Event): Promise<void> {
		e.preventDefault();
		pwdMsg = null;
		const tok = authState.token;
		if (!tok) {
			pwdMsg = { kind: 'err', text: 'You must be logged in.' };
			return;
		}
		if (pwdNew.length < 6) {
			pwdMsg = { kind: 'err', text: 'New password must be at least 6 characters.' };
			return;
		}
		if (pwdNew !== pwdConfirm) {
			pwdMsg = { kind: 'err', text: 'New password and confirmation do not match.' };
			return;
		}
		pwdBusy = true;
		try {
			await changePassword(tok, pwdCurrent, pwdNew);
			pwdCurrent = '';
			pwdNew = '';
			pwdConfirm = '';
			pwdMsg = { kind: 'ok', text: 'Password updated successfully.' };
		} catch (err) {
			pwdMsg = { kind: 'err', text: err instanceof Error ? err.message : 'Could not update password.' };
		} finally {
			pwdBusy = false;
		}
	}
</script>

<svelte:head>
	<title>User settings — Pricewise</title>
</svelte:head>

<section class="animate-in space-y-8 pb-12">
	<div class="relative overflow-hidden rounded-3xl bg-zinc-900 p-8 text-white shadow-2xl lg:p-10">
		<div class="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-violet-500/25 blur-3xl"></div>
		<div class="absolute -bottom-12 -left-12 h-48 w-48 rounded-full bg-fuchsia-500/10 blur-3xl"></div>
		<div class="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
			<div>
				<h1 class="text-3xl font-bold tracking-tight sm:text-4xl">
					Settings <span class="text-violet-400">Hub</span>
				</h1>
				<p class="mt-2 max-w-xl text-base text-zinc-400">
					Account, security, and preferences for your Pricewise workspace. Profile name and toggles are stored on
					this device; password changes are saved on the server.
				</p>
			</div>
		</div>
	</div>

	<div class="grid gap-6 lg:grid-cols-2">
		<!-- Profile -->
		<div class="glass overflow-hidden rounded-3xl p-6 shadow-xl sm:p-8">
			<h2 class="text-[11px] font-bold uppercase tracking-wider text-zinc-500">Profile</h2>
			<div class="mt-6 flex flex-col items-center gap-4 sm:flex-row sm:items-start">
				<div
					class="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-fuchsia-600 text-2xl font-bold text-white shadow-lg"
					aria-hidden="true"
				>
					{authState.user ? initialsFromEmail(authState.user.email) : '—'}
				</div>
				<div class="min-w-0 flex-1 space-y-4 text-center sm:text-left">
					<div>
						<label for="display-name" class="text-xs font-medium text-zinc-500">Display name</label>
						<input
							id="display-name"
							bind:value={userPrefs.displayName}
							onblur={saveProfile}
							placeholder="How we greet you in the app"
							class="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10"
						/>
					</div>
					<dl class="space-y-2 text-sm">
						<div>
							<dt class="text-xs font-medium text-zinc-500">Email</dt>
							<dd class="mt-0.5 font-semibold text-zinc-900">{authState.user?.email ?? '—'}</dd>
						</div>
						<div>
							<dt class="text-xs font-medium text-zinc-500">User ID</dt>
							<dd class="mt-0.5 tabular-nums text-zinc-700">{authState.user?.id ?? '—'}</dd>
						</div>
					</dl>
					<button
						type="button"
						class="rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white shadow-md transition hover:bg-violet-500"
						onclick={saveProfile}
					>
						Save profile
					</button>
				</div>
			</div>
		</div>

		<!-- Security -->
		<div class="glass overflow-hidden rounded-3xl p-6 shadow-xl sm:p-8">
			<h2 class="text-[11px] font-bold uppercase tracking-wider text-zinc-500">Security</h2>
			<form class="mt-6 space-y-4" onsubmit={submitPasswordChange}>
				<div>
					<label for="pwd-cur" class="text-xs font-medium text-zinc-500">Current password</label>
					<input
						id="pwd-cur"
						type="password"
						autocomplete="current-password"
						bind:value={pwdCurrent}
						class="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10"
					/>
				</div>
				<div>
					<label for="pwd-new" class="text-xs font-medium text-zinc-500">New password</label>
					<input
						id="pwd-new"
						type="password"
						autocomplete="new-password"
						bind:value={pwdNew}
						minlength="6"
						class="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10"
					/>
				</div>
				<div>
					<label for="pwd-confirm" class="text-xs font-medium text-zinc-500">Confirm new password</label>
					<input
						id="pwd-confirm"
						type="password"
						autocomplete="new-password"
						bind:value={pwdConfirm}
						class="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10"
					/>
				</div>
				{#if pwdMsg}
					<p
						class="rounded-lg px-3 py-2 text-sm font-medium"
						class:bg-emerald-50={pwdMsg.kind === 'ok'}
						class:text-emerald-800={pwdMsg.kind === 'ok'}
						class:bg-red-50={pwdMsg.kind === 'err'}
						class:text-red-800={pwdMsg.kind === 'err'}
					>
						{pwdMsg.text}
					</p>
				{/if}
				<button
					type="submit"
					disabled={pwdBusy}
					class="w-full rounded-xl bg-zinc-900 py-2.5 text-sm font-bold text-white shadow-lg transition hover:bg-black disabled:opacity-60"
				>
					{pwdBusy ? 'Updating…' : 'Update password'}
				</button>
			</form>
		</div>

		<!-- Preferences -->
		<div class="glass overflow-hidden rounded-3xl p-6 shadow-xl sm:p-8">
			<h2 class="text-[11px] font-bold uppercase tracking-wider text-zinc-500">Preferences</h2>
			<div class="mt-6 space-y-5">
				<label class="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-zinc-100 bg-zinc-50/80 px-4 py-3">
					<span class="text-sm font-medium text-zinc-800">Dark mode</span>
					<input
						type="checkbox"
						class="size-4 rounded border-zinc-300 text-violet-600 focus:ring-violet-500"
						checked={userPrefs.darkMode}
						onchange={(e) => {
							userPrefs.darkMode = (e.currentTarget as HTMLInputElement).checked;
							persistUserPrefs();
						}}
					/>
				</label>
				<label class="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-zinc-100 bg-zinc-50/80 px-4 py-3">
					<span class="text-sm font-medium text-zinc-800">Monthly summary email reminders</span>
					<input
						type="checkbox"
						class="size-4 rounded border-zinc-300 text-violet-600 focus:ring-violet-500"
						checked={userPrefs.notifyEmailDigest}
						onchange={(e) => {
							userPrefs.notifyEmailDigest = (e.currentTarget as HTMLInputElement).checked;
							persistUserPrefs();
						}}
					/>
				</label>
				<label class="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-zinc-100 bg-zinc-50/80 px-4 py-3">
					<span class="text-sm font-medium text-zinc-800">Notify when catalog costs change (future)</span>
					<input
						type="checkbox"
						class="size-4 rounded border-zinc-300 text-violet-600 focus:ring-violet-500"
						checked={userPrefs.notifyPriceAlerts}
						onchange={(e) => {
							userPrefs.notifyPriceAlerts = (e.currentTarget as HTMLInputElement).checked;
							persistUserPrefs();
						}}
					/>
				</label>
				<div>
					<label for="export-default" class="text-xs font-medium text-zinc-500">Default export format (Statistics)</label>
					<select
						id="export-default"
						class="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10"
						bind:value={userPrefs.defaultExportFormat}
						onchange={saveProfile}
					>
						<option value="csv">CSV</option>
						<option value="json">JSON</option>
					</select>
				</div>
			</div>
		</div>

		<!-- About -->
		<div class="glass overflow-hidden rounded-3xl p-6 shadow-xl sm:p-8">
			<h2 class="text-[11px] font-bold uppercase tracking-wider text-zinc-500">Data &amp; workspace</h2>
			<ul class="mt-4 list-inside list-disc space-y-2 text-sm leading-relaxed text-zinc-600">
				<li>Recipes, catalogs, and OPEX sync to your account on the server when you are logged in.</li>
				<li>Display name and preference toggles are stored in this browser only.</li>
				<li>Use <strong class="text-zinc-800">Logout</strong> in the header to end your session on this device.</li>
			</ul>
		</div>
	</div>
</section>
