<script lang="ts">
	import { browser } from '$app/environment';
	import StatisticsCharts from '$lib/components/statistics/StatisticsCharts.svelte';
	import TypeToConfirmDeleteModal from '$lib/components/TypeToConfirmDeleteModal.svelte';
	import { costingSettings } from '$lib/state/costingSettings.svelte';
	import { ingredientCatalog } from '$lib/state/ingredientCatalog.svelte';
	import { monthlySummaryStore, deleteMonthlySnapshot } from '$lib/state/monthlySummaryStore.svelte';
	import { otherCatalog } from '$lib/state/otherCatalog.svelte';
	import { recipeStore } from '$lib/state/recipes.svelte';
	import { authState } from '$lib/state/auth.svelte';
	import { deleteMonthlySummaryOnServer } from '$lib/api/monthlySummariesClient';
	import type { MonthlyFinancialSnapshot } from '$lib/types/statistics';
	import {
		averageChannelPrice,
		averageSuggestedPrice,
		computeLiveMonthKpis
	} from '$lib/utils/dashboardFinance';
	import { buildMonthlySeries, pctChange } from '$lib/utils/dashboardSeries';
	import {
		addCalendarMonths,
		kpisFromSnapshotRow,
		latestSnapshotForYearMonth,
		rollupYearFromSummaries
	} from '$lib/utils/summaryPeriodKpis';
	import {
		avgLandedByChannel,
		avgPctCheaperThan,
		bestSupplierLabel,
		buildIngredientSupplierCompares,
		supplierWinCounts
	} from '$lib/utils/supplierAnalytics';
	import { formatPhp, formatPercent1, formatPercent1Signed } from '$lib/utils/numberFormat';

	const ingredientMasters = $derived(ingredientCatalog.items);
	const otherMasters = $derived(otherCatalog.items);
	const recipes = $derived(recipeStore.recipes);

	const costingInput = $derived({
		vatRegistered: costingSettings.vatRegistered,
		vatPct: costingSettings.vatPct,
		batchSize: costingSettings.batchSize,
		targetMarginPct: costingSettings.targetMarginPct,
		discountPct: costingSettings.discountPct
	});

	const live = $derived(computeLiveMonthKpis(recipes, ingredientMasters, otherMasters));
	const series = $derived(buildMonthlySeries(monthlySummaryStore.rows, live, 6));
	const compares = $derived(buildIngredientSupplierCompares(ingredientMasters));
	const supplierCounts = $derived(supplierWinCounts(ingredientMasters));
	const avgLanded = $derived(avgLandedByChannel(compares));
	const bestSup = $derived(bestSupplierLabel(ingredientMasters));

	const shopeeVsLazada = $derived(avgPctCheaperThan(ingredientMasters, 'shopee', 'lazada'));
	const localVsLazada = $derived(avgPctCheaperThan(ingredientMasters, 'local', 'lazada'));

	const avgSuggest = $derived(averageSuggestedPrice(recipes, ingredientMasters, otherMasters, costingInput));
	const avgLocal = $derived(averageChannelPrice(recipes, 'local'));
	const avgShopee = $derived(averageChannelPrice(recipes, 'shopee'));
	const avgLazada = $derived(averageChannelPrice(recipes, 'lazada'));

	const costTrendPct = $derived.by(() => {
		const pts = series;
		if (pts.length < 2) return null;
		const a = pts[pts.length - 2]!.revenue - pts[pts.length - 2]!.netProfit;
		const b = pts[pts.length - 1]!.revenue - pts[pts.length - 1]!.netProfit;
		return pctChange(a, b);
	});

	let kpiScope = $state<'monthly' | 'yearly'>('monthly');
	let kpiYearMonth = $state('');
	let kpiYear = $state('');

	const defaultKpiYearMonth = $derived.by(() => {
		const rows = monthlySummaryStore.rows;
		if (rows.length === 0) return live.yearMonth;
		return [...rows].sort((a, b) => b.yearMonth.localeCompare(a.yearMonth))[0]!.yearMonth;
	});

	const defaultKpiYear = $derived.by(() => {
		const rows = monthlySummaryStore.rows;
		if (rows.length === 0) return live.yearMonth.slice(0, 4);
		return [...rows].sort((a, b) => b.yearMonth.localeCompare(a.yearMonth))[0]!.yearMonth.slice(0, 4);
	});

	const effectiveKpiYearMonth = $derived(kpiYearMonth.trim() || defaultKpiYearMonth);
	const effectiveKpiYear = $derived(kpiYear.trim() || defaultKpiYear);

	const summaryKpis = $derived.by(() => {
		const rows = monthlySummaryStore.rows;
		if (kpiScope === 'monthly') {
			return kpisFromSnapshotRow(latestSnapshotForYearMonth(rows, effectiveKpiYearMonth));
		}
		return rollupYearFromSummaries(rows, effectiveKpiYear);
	});

	const kpiMonthOptions = $derived.by(() => {
		const seen = new Set<string>();
		const list: string[] = [];
		for (const r of monthlySummaryStore.rows) {
			if (!seen.has(r.yearMonth)) {
				seen.add(r.yearMonth);
				list.push(r.yearMonth);
			}
		}
		return list.sort((a, b) => b.localeCompare(a));
	});

	const kpiYearOptions = $derived.by(() => {
		const ys = new Set<string>();
		for (const r of monthlySummaryStore.rows) ys.add(r.yearMonth.slice(0, 4));
		ys.add(live.yearMonth.slice(0, 4));
		return [...ys].sort((a, b) => b.localeCompare(a));
	});

	const summaryMomNet = $derived.by(() => {
		if (kpiScope !== 'monthly') return null;
		const rows = monthlySummaryStore.rows;
		const prevYm = addCalendarMonths(effectiveKpiYearMonth, -1);
		const cur = latestSnapshotForYearMonth(rows, effectiveKpiYearMonth);
		const prev = latestSnapshotForYearMonth(rows, prevYm);
		if (!cur || !prev) return null;
		return pctChange(prev.netProfit, cur.netProfit);
	});

	const summaryMomRev = $derived.by(() => {
		if (kpiScope !== 'monthly') return null;
		const rows = monthlySummaryStore.rows;
		const prevYm = addCalendarMonths(effectiveKpiYearMonth, -1);
		const cur = latestSnapshotForYearMonth(rows, effectiveKpiYearMonth);
		const prev = latestSnapshotForYearMonth(rows, prevYm);
		if (!cur || !prev) return null;
		return pctChange(prev.totalRevenue, cur.totalRevenue);
	});

	const summaryYoyNet = $derived.by(() => {
		if (kpiScope !== 'yearly') return null;
		const rows = monthlySummaryStore.rows;
		const prevY = String(Number(effectiveKpiYear) - 1);
		const cur = rollupYearFromSummaries(rows, effectiveKpiYear);
		const prev = rollupYearFromSummaries(rows, prevY);
		if (!cur.hasData || !prev.hasData) return null;
		return pctChange(prev.netProfit, cur.netProfit);
	});

	const summaryYoyRev = $derived.by(() => {
		if (kpiScope !== 'yearly') return null;
		const rows = monthlySummaryStore.rows;
		const prevY = String(Number(effectiveKpiYear) - 1);
		const cur = rollupYearFromSummaries(rows, effectiveKpiYear);
		const prev = rollupYearFromSummaries(rows, prevY);
		if (!cur.hasData || !prev.hasData) return null;
		return pctChange(prev.totalRevenue, cur.totalRevenue);
	});

	let search = $state('');
	let filterYear = $state('');
	let filterMonth = $state('');
	let detail: MonthlyFinancialSnapshot | null = $state(null);

	let deleteSnapshotTarget = $state<{ id: string; label: string } | null>(null);

	/** Keep the detail modal in sync when the store updates (e.g. after Summary save + navigation). */
	$effect(() => {
		const rows = monthlySummaryStore.rows;
		const d = detail;
		if (!d) return;
		const next = rows.find((r) => r.id === d.id);
		if (next) detail = next;
		else detail = null;
	});

	function requestDeleteSnapshot(r: MonthlyFinancialSnapshot): void {
		deleteSnapshotTarget = {
			id: r.id,
			label: `${r.yearMonth} · ${new Date(r.generatedAt).toLocaleString()}`
		};
	}

	async function executeDeleteSnapshot(): Promise<void> {
		const t = deleteSnapshotTarget;
		if (!t) return;
		const token = authState.token;
		if (!token) {
			alert('You must be logged in to delete saved statistics.');
			return;
		}
		try {
			await deleteMonthlySummaryOnServer(token, t.id);
			deleteMonthlySnapshot(t.id);
		} catch {
			alert('Could not delete on the server. Check that the backend is running and try again.');
		}
	}

	const tableRows = $derived(
		[...monthlySummaryStore.rows].sort((a, b) => {
			const ym = b.yearMonth.localeCompare(a.yearMonth);
			if (ym !== 0) return ym;
			return b.generatedAt.localeCompare(a.generatedAt);
		})
	);

	const filteredRows = $derived.by(() => {
		let list = tableRows;
		const q = search.trim().toLowerCase();
		if (q) {
			list = list.filter(
				(r) =>
					r.yearMonth.includes(q) ||
					r.bestSupplier.toLowerCase().includes(q) ||
					r.generatedAt.toLowerCase().includes(q)
			);
		}
		if (filterYear) list = list.filter((r) => r.yearMonth.startsWith(filterYear));
		if (filterMonth) list = list.filter((r) => r.yearMonth.endsWith(`-${filterMonth}`));
		return list;
	});

	const yearOptions = $derived.by(() => {
		const ys = new Set<string>();
		for (const r of monthlySummaryStore.rows) ys.add(r.yearMonth.slice(0, 4));
		return [...ys].sort((a, b) => b.localeCompare(a));
	});

	function fmt(n: number): string {
		return formatPhp(n);
	}

	function fmtNumOrDash(n: number | null): string {
		return n === null ? '—' : fmt(n);
	}

	function snapshotTotalOrders(d: MonthlyFinancialSnapshot): number {
		return (d.recipeBreakdown ?? []).reduce((s, x) => s + x.orders, 0);
	}

	function snapshotCogs(d: MonthlyFinancialSnapshot): number {
		return d.totalRevenue - d.grossProfit;
	}

	function snapshotGrossMarginPct(d: MonthlyFinancialSnapshot): string {
		if (d.totalRevenue <= 0) return '—';
		return formatPercent1((d.grossProfit / d.totalRevenue) * 100);
	}

	function snapshotOpexPctOfRevenue(d: MonthlyFinancialSnapshot): string {
		if (d.totalRevenue <= 0) return '—';
		return formatPercent1((d.totalOpex / d.totalRevenue) * 100);
	}

	function csvEscape(s: string): string {
		if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
		return s;
	}

	function exportCsv(): void {
		const headers = [
			'Month',
			'Total OPEX',
			'Total Revenue',
			'Gross Profit',
			'Net Profit',
			'Profit Margin %',
			'Best Supplier',
			'Generated'
		];
		const lines = [headers.join(',')];
		for (const r of filteredRows) {
			lines.push(
				[
					r.yearMonth,
					r.totalOpex.toFixed(2),
					r.totalRevenue.toFixed(2),
					r.grossProfit.toFixed(2),
					r.netProfit.toFixed(2),
					r.profitMarginPct.toFixed(2),
					csvEscape(r.bestSupplier),
					csvEscape(r.generatedAt)
				].join(',')
			);
		}
		const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' });
		const a = document.createElement('a');
		a.href = URL.createObjectURL(blob);
		a.download = `pricewise-statistics-${live.yearMonth}.csv`;
		a.click();
		URL.revokeObjectURL(a.href);
	}

	function exportJsonSummary(): void {
		const payload = {
			generatedAt: new Date().toISOString(),
			liveMonth: live,
			supplierWins: supplierCounts,
			avgLanded,
			insights: {
				shopeeVsLazadaPct: shopeeVsLazada,
				localVsLazadaPct: localVsLazada,
				avgSuggestedPrice: avgSuggest,
				avgLocalSelling: avgLocal ?? 0
			},
			monthlySummaries: filteredRows
		};
		const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
		const a = document.createElement('a');
		a.href = URL.createObjectURL(blob);
		a.download = `pricewise-analytics-${live.yearMonth}.json`;
		a.click();
		URL.revokeObjectURL(a.href);
	}

	function printReport(): void {
		window.print();
	}
</script>

<svelte:head>
	<title>Statistics — Pricewise</title>
</svelte:head>

<section class="statistics-print animate-in space-y-8 print:max-w-none">
	<div class="relative overflow-hidden rounded-3xl bg-zinc-900 p-8 text-white shadow-2xl lg:p-12">
		<div class="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-violet-500/20 blur-3xl"></div>
		<div class="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-violet-500/10 blur-3xl"></div>

		<div class="relative z-10 flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
			<div class="max-w-3xl space-y-2">
				<h1 class="text-4xl font-bold tracking-tight sm:text-5xl">
					Statistics <span class="text-violet-400">Analytics</span>
				</h1>
				<p class="text-lg text-zinc-400">
					Financial KPIs from saved Summary snapshots (with month vs year roll-ups), supplier channel mix on
					ingredients, and full save history — including multiple saves per month (use Generated to tell them apart).
				</p>
			</div>
			<div class="flex flex-wrap gap-2 print:hidden">
				<button
					type="button"
					class="rounded-2xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10"
					onclick={exportCsv}
				>
					Export CSV
				</button>
				<button
					type="button"
					class="rounded-2xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10"
					onclick={exportJsonSummary}
				>
					Analytics JSON
				</button>
				<button
					type="button"
					class="rounded-2xl bg-violet-600 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-violet-900/30 transition hover:bg-violet-500"
					onclick={printReport}
				>
					Print / PDF
				</button>
			</div>
		</div>
	</div>

	<div class="glass overflow-hidden rounded-3xl shadow-xl">
		<div class="border-b border-zinc-200/60 bg-zinc-50/50 px-4 py-3 sm:px-6 print:hidden">
			<div class="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
				<div class="flex flex-wrap items-center gap-2">
					<span class="text-[10px] font-bold uppercase tracking-wider text-zinc-500">KPI period</span>
					<div class="flex rounded-lg bg-zinc-200/80 p-0.5 ring-1 ring-zinc-200/60">
						<button
							type="button"
							class="rounded-md px-3 py-1.5 text-xs font-bold transition {kpiScope === 'monthly'
								? 'bg-white text-violet-900 shadow-sm'
								: 'text-zinc-600 hover:text-zinc-900'}"
							onclick={() => (kpiScope = 'monthly')}
						>
							Month
						</button>
						<button
							type="button"
							class="rounded-md px-3 py-1.5 text-xs font-bold transition {kpiScope === 'yearly'
								? 'bg-white text-violet-900 shadow-sm'
								: 'text-zinc-600 hover:text-zinc-900'}"
							onclick={() => (kpiScope = 'yearly')}
						>
							Year
						</button>
					</div>
				</div>
				{#if kpiScope === 'monthly'}
					<label class="flex flex-wrap items-center gap-2 text-sm text-zinc-700">
						<span class="font-medium">Calendar month</span>
						<select
							bind:value={kpiYearMonth}
							class="min-w-[10rem] rounded-lg border border-zinc-200 bg-white px-2 py-1.5 text-sm shadow-sm focus:border-violet-500 focus:ring-2 focus:ring-violet-500/15"
						>
							<option value="">Latest (auto)</option>
							{#each kpiMonthOptions as ym (ym)}
								<option value={ym}>{ym}</option>
							{/each}
						</select>
					</label>
				{:else}
					<label class="flex flex-wrap items-center gap-2 text-sm text-zinc-700">
						<span class="font-medium">Calendar year</span>
						<select
							bind:value={kpiYear}
							class="min-w-[8rem] rounded-lg border border-zinc-200 bg-white px-2 py-1.5 text-sm shadow-sm focus:border-violet-500 focus:ring-2 focus:ring-violet-500/15"
						>
							<option value="">Latest (auto)</option>
							{#each kpiYearOptions as y (y)}
								<option value={y}>{y}</option>
							{/each}
						</select>
					</label>
				{/if}
			</div>
			<p class="mt-2 text-[11px] leading-relaxed text-zinc-600">
				<strong class="text-zinc-800">Month</strong> uses the latest Summary save for that month (duplicates share the
				same month label — check <strong class="text-zinc-800">Generated</strong> in the table).
				<strong class="text-zinc-800">Year</strong> sums those “latest per month” values across all months in that
				calendar year.
			</p>
		</div>
		<div class="grid divide-y divide-zinc-200/50 sm:grid-cols-2 lg:grid-cols-5 lg:divide-x lg:divide-y-0">
			<div class="px-5 py-5 sm:px-6">
				<p class="text-[11px] font-bold uppercase tracking-wider text-zinc-500">
					{kpiScope === 'monthly' ? 'OPEX' : 'OPEX (year)'}
				</p>
				<p class="mt-0.5 text-[10px] font-medium text-zinc-400">
					{kpiScope === 'monthly' ? effectiveKpiYearMonth : effectiveKpiYear}
				</p>
				<p class="mt-1 text-xl font-bold tabular-nums text-zinc-900">{fmt(summaryKpis.totalOpex)}</p>
			</div>
			<div class="px-5 py-5 sm:px-6">
				<p class="text-[11px] font-bold uppercase tracking-wider text-zinc-500">
					{kpiScope === 'monthly' ? 'Revenue' : 'Revenue (year)'}
				</p>
				<p class="mt-0.5 text-[10px] font-medium text-zinc-400">
					{kpiScope === 'monthly' ? effectiveKpiYearMonth : effectiveKpiYear}
				</p>
				<p class="mt-1 text-xl font-bold tabular-nums text-zinc-900">{fmt(summaryKpis.totalRevenue)}</p>
				{#if kpiScope === 'monthly' && summaryMomRev !== null}
					<p
						class="mt-1 text-xs font-medium tabular-nums"
						class:text-emerald-700={summaryMomRev >= 0}
						class:text-red-600={summaryMomRev < 0}
					>
						{summaryMomRev >= 0 ? '▲' : '▼'} {formatPercent1(Math.abs(summaryMomRev))} vs prior month
					</p>
				{:else if kpiScope === 'yearly' && summaryYoyRev !== null}
					<p
						class="mt-1 text-xs font-medium tabular-nums"
						class:text-emerald-700={summaryYoyRev >= 0}
						class:text-red-600={summaryYoyRev < 0}
					>
						{summaryYoyRev >= 0 ? '▲' : '▼'} {formatPercent1(Math.abs(summaryYoyRev))} vs prior year
					</p>
				{/if}
			</div>
			<div class="px-5 py-5 sm:px-6">
				<p class="text-[11px] font-bold uppercase tracking-wider text-zinc-500">
					{kpiScope === 'monthly' ? 'Gross profit' : 'Gross profit (year)'}
				</p>
				<p class="mt-0.5 text-[10px] font-medium text-zinc-400">
					{kpiScope === 'monthly' ? effectiveKpiYearMonth : effectiveKpiYear}
				</p>
				<p class="mt-1 text-xl font-bold tabular-nums text-emerald-800">{fmt(summaryKpis.grossProfit)}</p>
			</div>
			<div class="bg-emerald-50/50 px-5 py-5 sm:px-6">
				<p class="text-[11px] font-bold uppercase tracking-wider text-emerald-900">
					{kpiScope === 'monthly' ? 'Net profit' : 'Net profit (year)'}
				</p>
				<p class="mt-0.5 text-[10px] font-medium text-emerald-800/80">
					{kpiScope === 'monthly' ? effectiveKpiYearMonth : effectiveKpiYear}
				</p>
				<p
					class="mt-1 text-xl font-bold tabular-nums"
					class:text-red-700={summaryKpis.netProfit < 0}
					class:text-emerald-900={summaryKpis.netProfit >= 0}
				>
					{fmt(summaryKpis.netProfit)}
				</p>
				{#if kpiScope === 'monthly' && summaryMomNet !== null}
					<p
						class="mt-1 text-xs font-medium tabular-nums"
						class:text-emerald-700={summaryMomNet >= 0}
						class:text-red-600={summaryMomNet < 0}
					>
						{summaryMomNet >= 0 ? '▲' : '▼'} {formatPercent1(Math.abs(summaryMomNet))} vs prior month
					</p>
				{:else if kpiScope === 'yearly' && summaryYoyNet !== null}
					<p
						class="mt-1 text-xs font-medium tabular-nums"
						class:text-emerald-700={summaryYoyNet >= 0}
						class:text-red-600={summaryYoyNet < 0}
					>
						{summaryYoyNet >= 0 ? '▲' : '▼'} {formatPercent1(Math.abs(summaryYoyNet))} vs prior year
					</p>
				{/if}
			</div>
			<div class="px-5 py-5 sm:px-6 sm:col-span-2 lg:col-span-1">
				<p class="text-[11px] font-bold uppercase tracking-wider text-zinc-500">Profit margin</p>
				<p class="mt-0.5 text-[10px] font-medium text-zinc-400">
					{kpiScope === 'monthly' ? effectiveKpiYearMonth : `${effectiveKpiYear} roll-up`}
				</p>
				<p
					class="mt-1 text-xl font-bold tabular-nums"
					class:text-red-700={summaryKpis.profitMarginPct < 0}
					class:text-emerald-900={summaryKpis.profitMarginPct >= 0}
				>
					{summaryKpis.hasData ? formatPercent1(summaryKpis.profitMarginPct) : '—'}
				</p>
			</div>
		</div>
	</div>

	{#if browser}
		<StatisticsCharts {series} supplierCounts={supplierCounts} avgLanded={avgLanded} />
	{:else}
		<p class="text-sm text-zinc-500">Charts load in the browser.</p>
	{/if}

	<div class="grid gap-6 lg:grid-cols-3">
		<div
			class="glass overflow-hidden rounded-3xl border border-emerald-200/50 bg-gradient-to-br from-emerald-50/90 to-white p-6 shadow-xl lg:col-span-1"
		>
			<p class="text-[11px] font-bold uppercase tracking-wider text-emerald-800">Best supplier (SKUs)</p>
			<p class="mt-2 text-2xl font-bold text-emerald-950">{bestSup}</p>
			<p class="mt-3 text-xs leading-relaxed text-emerald-900/85">
				Per ingredient SKU: lowest landed cost wins. Lazada and Shopee count only when you enter marketplace landed prices;
				otherwise only your local catalog package cost is compared.
			</p>
		</div>
		<div class="glass overflow-hidden rounded-3xl p-6 shadow-xl lg:col-span-2">
			<h2 class="text-[11px] font-bold uppercase tracking-wider text-zinc-500">Channel insights</h2>
			<ul class="mt-4 space-y-3 text-sm leading-relaxed text-zinc-700">
				<li class="rounded-2xl bg-zinc-50/80 px-4 py-3">
					{#if shopeeVsLazada !== null}
						<strong class="text-zinc-900">Shopee</strong> averages <span class="font-semibold text-emerald-700">{formatPercent1(shopeeVsLazada)}</span>
						cheaper than <strong class="text-zinc-900">Lazada</strong> on comparable SKUs (where Shopee wins on price).
					{:else}
						Not enough Shopee vs Lazada pairs to compare averages yet.
					{/if}
				</li>
				<li class="rounded-2xl bg-zinc-50/80 px-4 py-3">
					{#if localVsLazada !== null}
						<strong class="text-zinc-900">Local</strong> averages <span class="font-semibold text-emerald-700">{formatPercent1(localVsLazada)}</span>
						cheaper than <strong class="text-zinc-900">Lazada</strong> where Local undercuts Lazada.
					{:else}
						Local vs Lazada comparison needs more SKU spread.
					{/if}
				</li>
				<li class="rounded-2xl bg-zinc-50/80 px-4 py-3">
					Average savings vs most expensive channel per SKU:
					<strong class="tabular-nums text-zinc-900">{formatPercent1(compares.reduce((s, c) => s + c.savingsVsWorstPct, 0) / Math.max(1, compares.length))}</strong>.
				</li>
			</ul>
		</div>
	</div>

	<div class="glass overflow-hidden rounded-3xl p-6 shadow-xl sm:p-8">
		<h2 class="text-[11px] font-bold uppercase tracking-wider text-zinc-500">Recommendation analytics</h2>
		<div class="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
			<div class="rounded-2xl border border-zinc-100 bg-white/60 p-4">
				<p class="text-xs text-zinc-500">Avg suggested price</p>
				<p class="mt-1 text-lg font-bold tabular-nums text-zinc-900">{fmt(avgSuggest)}</p>
				<p class="mt-1 text-[10px] text-zinc-400">From costing (margin / VAT / batch)</p>
			</div>
			<div class="rounded-2xl border border-zinc-100 bg-white/60 p-4">
				<p class="text-xs text-zinc-500">Avg Local list price</p>
				<p class="mt-1 text-lg font-bold tabular-nums text-zinc-900">{fmtNumOrDash(avgLocal)}</p>
			</div>
			<div class="rounded-2xl border border-zinc-100 bg-white/60 p-4">
				<p class="text-xs text-zinc-500">Target markup (setting)</p>
				<p class="mt-1 text-lg font-bold tabular-nums text-zinc-900">{costingSettings.targetMarginPct}%</p>
			</div>
			<div class="rounded-2xl border border-zinc-100 bg-white/60 p-4">
				<p class="text-xs text-zinc-500">Cost pressure (est.)</p>
				<p class="mt-1 text-lg font-bold tabular-nums text-zinc-900">
					{#if costTrendPct !== null}
						<span class:text-red-600={costTrendPct > 0} class:text-emerald-700={costTrendPct <= 0}>
							{formatPercent1Signed(costTrendPct)}
						</span>
					{:else}
						—
					{/if}
				</p>
				<p class="mt-1 text-[10px] text-zinc-400">MoM implied COGS from chart series</p>
			</div>
		</div>
		<p class="mt-6 text-xs leading-relaxed text-zinc-500">
			<strong class="text-zinc-700">Competitive pricing:</strong> compare avg Local ({fmtNumOrDash(avgLocal)}) to Shopee ({fmtNumOrDash(
				avgShopee
			)}) and Lazada ({fmtNumOrDash(avgLazada)}) recipe list prices — Shopee/Lazada averages count only recipes with those
			channels priced from marketplace landed costs.
		</p>
		{#if costTrendPct !== null && costTrendPct > 2}
			<p class="mt-3 rounded-xl bg-amber-50 px-4 py-2 text-xs font-medium text-amber-900 ring-1 ring-amber-100">
				Costs in the trend series are rising — consider refreshing supplier quotes or menu prices.
			</p>
		{/if}
	</div>

	<div class="glass overflow-hidden rounded-3xl shadow-xl">
		<div class="border-b border-zinc-200/50 bg-zinc-50/50 px-6 py-5">
			<div class="flex flex-wrap items-end justify-between gap-4">
				<h2 class="text-[11px] font-bold uppercase tracking-wider text-zinc-500">Monthly summary history</h2>
				<div class="flex flex-wrap gap-2 print:hidden">
					<div class="relative">
						<div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-zinc-400">
							<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
						</div>
						<input
							bind:value={search}
							placeholder="Search month, supplier…"
							class="w-full min-w-[200px] rounded-xl border border-zinc-200 bg-white py-2 pl-9 pr-3 text-sm shadow-sm focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10"
						/>
					</div>
					<select
						bind:value={filterYear}
						class="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-violet-500"
					>
						<option value="">All years</option>
						{#each yearOptions as y}
							<option value={y}>{y}</option>
						{/each}
					</select>
					<select
						bind:value={filterMonth}
						class="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-violet-500"
					>
						<option value="">All months</option>
						{#each ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'] as m}
							<option value={m}>{m}</option>
						{/each}
					</select>
				</div>
			</div>
		</div>

		<div class="overflow-x-auto">
			<table class="w-full min-w-[960px] text-left text-sm">
				<thead>
					<tr class="border-b border-zinc-200/50 text-[11px] font-bold uppercase tracking-wider text-zinc-500">
						<th class="px-6 py-4">Month</th>
						<th class="px-6 py-4 text-right">OPEX</th>
						<th class="px-6 py-4 text-right">Revenue</th>
						<th class="px-6 py-4 text-right">Gross</th>
						<th class="px-6 py-4 text-right">Net</th>
						<th class="px-6 py-4 text-right">Margin %</th>
						<th class="px-6 py-4">Best supplier</th>
						<th class="px-6 py-4">Generated</th>
						<th class="w-28 px-6 py-4 print:hidden"></th>
					</tr>
				</thead>
				<tbody class="divide-y divide-zinc-100/50">
					{#each filteredRows as r (r.id)}
						<tr class="transition-colors hover:bg-zinc-50/50">
							<td class="px-6 py-3.5 font-semibold text-zinc-900">{r.yearMonth}</td>
							<td class="px-6 py-3.5 text-right tabular-nums text-zinc-700">{fmt(r.totalOpex)}</td>
							<td class="px-6 py-3.5 text-right tabular-nums text-zinc-700">{fmt(r.totalRevenue)}</td>
							<td class="px-6 py-3.5 text-right tabular-nums text-emerald-800">{fmt(r.grossProfit)}</td>
							<td
								class="px-6 py-3.5 text-right tabular-nums font-semibold"
								class:text-red-600={r.netProfit < 0}
								class:text-emerald-800={r.netProfit >= 0}
							>
								{fmt(r.netProfit)}
							</td>
							<td class="px-6 py-3.5 text-right tabular-nums">{formatPercent1(r.profitMarginPct)}</td>
							<td class="px-6 py-3.5 text-zinc-700">{r.bestSupplier}</td>
							<td class="px-6 py-3.5 text-xs text-zinc-500">{new Date(r.generatedAt).toLocaleString()}</td>
							<td class="px-6 py-3.5 print:hidden">
								<div class="flex flex-col items-end gap-1">
									<button
										type="button"
										class="text-xs font-semibold text-violet-700 hover:underline"
										onclick={() => (detail = r)}
									>
										View
									</button>
									<button
										type="button"
										class="text-xs font-semibold text-red-600 hover:underline"
										onclick={() => requestDeleteSnapshot(r)}
									>
										Delete
									</button>
								</div>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
			{#if filteredRows.length === 0}
				<div class="flex flex-col items-center justify-center py-16 text-center">
					<p class="text-sm font-medium text-zinc-700">No saved rows match.</p>
					<p class="mt-1 text-sm text-zinc-500">
						Use <strong class="text-zinc-800">Save Summary to Statistics</strong> on the Summary page to add a month.
					</p>
				</div>
			{/if}
		</div>
	</div>
</section>

{#if detail}
	<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/40 p-4 print:hidden"
		role="dialog"
		aria-modal="true"
		tabindex="-1"
		onmousedown={(e) => e.target === e.currentTarget && (detail = null)}
	>
		<div
			class="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl border border-zinc-200/80 bg-white p-6 shadow-2xl ring-1 ring-black/5 sm:max-w-2xl sm:p-8"
		>
			<div class="flex items-start justify-between gap-2">
				<h3 class="text-lg font-semibold text-zinc-900">Month {detail.yearMonth}</h3>
				<button type="button" class="text-zinc-500 hover:text-zinc-800" onclick={() => (detail = null)} aria-label="Close"
					>×</button
				>
			</div>
			<p class="mt-2 text-xs leading-relaxed text-zinc-500">
				Financial figures are the saved snapshot for <strong class="text-zinc-700">{detail.yearMonth}</strong>. “Best supplier”
				below matches your <strong class="text-zinc-700">current</strong> ingredient catalog (same logic as Analytics — Lazada/Shopee
				only when those landed prices exist).
			</p>
			<div class="mt-6 grid gap-x-8 gap-y-1 sm:grid-cols-2">
				<dl class="space-y-2 text-sm">
					<div class="flex justify-between gap-4">
						<dt class="text-zinc-500">OPEX</dt>
						<dd class="tabular-nums font-medium text-zinc-900">{fmt(detail.totalOpex)}</dd>
					</div>
					<div class="flex justify-between gap-4">
						<dt class="text-zinc-500">Revenue</dt>
						<dd class="tabular-nums font-medium text-zinc-900">{fmt(detail.totalRevenue)}</dd>
					</div>
					<div class="flex justify-between gap-4">
						<dt class="text-zinc-500">COGS (est.)</dt>
						<dd class="tabular-nums text-zinc-800">{fmt(snapshotCogs(detail))}</dd>
					</div>
					<div class="flex justify-between gap-4">
						<dt class="text-zinc-500">Gross profit</dt>
						<dd class="tabular-nums text-emerald-800">{fmt(detail.grossProfit)}</dd>
					</div>
					<div class="flex justify-between gap-4">
						<dt class="text-zinc-500">Net profit</dt>
						<dd
							class="tabular-nums font-semibold"
							class:text-red-600={detail.netProfit < 0}
							class:text-emerald-800={detail.netProfit >= 0}
						>
							{fmt(detail.netProfit)}
						</dd>
					</div>
				</dl>
				<dl class="space-y-2 text-sm">
					<div class="flex justify-between gap-4">
						<dt class="text-zinc-500">Gross margin</dt>
						<dd class="tabular-nums">{snapshotGrossMarginPct(detail)}</dd>
					</div>
					<div class="flex justify-between gap-4">
						<dt class="text-zinc-500">Net margin (saved)</dt>
						<dd class="tabular-nums">{formatPercent1(detail.profitMarginPct)}</dd>
					</div>
					<div class="flex justify-between gap-4">
						<dt class="text-zinc-500">OPEX ÷ revenue</dt>
						<dd class="tabular-nums">{snapshotOpexPctOfRevenue(detail)}</dd>
					</div>
					<div class="flex justify-between gap-4">
						<dt class="text-zinc-500">Total orders (saved)</dt>
						<dd class="tabular-nums">{snapshotTotalOrders(detail)}</dd>
					</div>
					<div class="flex justify-between gap-4">
						<dt class="text-zinc-500">Recipes w/ orders</dt>
						<dd class="tabular-nums">{detail.recipeBreakdown?.length ?? 0}</dd>
					</div>
				</dl>
			</div>
			<div class="mt-4 flex justify-between gap-4 border-t border-zinc-100 pt-4 text-sm">
				<span class="text-zinc-500">Best supplier (catalog)</span>
				<span class="text-right font-medium text-zinc-900">{bestSup}</span>
			</div>
			{#if detail.bestSupplier !== bestSup}
				<p class="mt-1 text-[10px] leading-relaxed text-zinc-400">
					Label stored with this snapshot: {detail.bestSupplier} (re-save from Summary to update the stored label).
				</p>
			{/if}
			<div class="mt-2 flex justify-between gap-4 text-xs text-zinc-500">
				<span>Generated</span>
				<span class="text-right">{new Date(detail.generatedAt).toLocaleString()}</span>
			</div>
			{#if detail.recipeBreakdown && detail.recipeBreakdown.length > 0}
				<div class="mt-6 border-t border-zinc-100 pt-4">
					<h4 class="text-xs font-semibold uppercase tracking-wide text-zinc-500">Per-recipe performance (saved)</h4>
					<ul class="mt-3 max-h-56 space-y-2 overflow-y-auto text-sm">
						{#each detail.recipeBreakdown as line}
							<li class="rounded-xl border border-zinc-100 bg-zinc-50/80 px-3 py-2.5">
								<div class="flex flex-wrap items-baseline justify-between gap-2">
									<span class="font-semibold text-zinc-900">{line.recipeName}</span>
									<span class="tabular-nums text-xs font-medium text-violet-700">{line.orders} orders</span>
								</div>
								<div class="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-600">
									<span>Revenue <span class="font-medium text-zinc-800">{fmt(line.revenue)}</span></span>
									<span>Profit <span class="font-medium text-zinc-800">{fmt(line.profit)}</span></span>
									{#if line.orders > 0}
										<span
											>Avg / order <span class="font-medium text-zinc-800">{fmt(line.revenue / line.orders)}</span></span
										>
									{/if}
								</div>
							</li>
						{/each}
					</ul>
				</div>
			{:else}
				<div class="mt-6 border-t border-zinc-100 pt-4">
					<h4 class="text-xs font-semibold uppercase tracking-wide text-zinc-500">Per-recipe performance</h4>
					<p class="mt-2 text-sm text-zinc-600">
						No per-recipe rows were stored (all monthly orders were zero or the snapshot predates recipe breakdown). Revenue
						and COGS lines still reflect the saved totals above.
					</p>
				</div>
			{/if}
		</div>
	</div>
{/if}

<TypeToConfirmDeleteModal
	open={deleteSnapshotTarget !== null}
	title="Delete saved month?"
	description={deleteSnapshotTarget
		? `Remove the statistics snapshot for ${deleteSnapshotTarget.label}. This cannot be undone.`
		: ''}
	onClose={() => (deleteSnapshotTarget = null)}
	onConfirm={executeDeleteSnapshot}
/>

<style>
	@media print {
		:global(header),
		:global(nav) {
			display: none !important;
		}
	}
</style>
