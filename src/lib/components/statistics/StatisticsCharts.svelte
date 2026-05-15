<script lang="ts">
	import { onMount } from 'svelte';
	import Chart from 'chart.js/auto';
	import type { MonthlySeriesPoint } from '$lib/utils/dashboardSeries';
	import { formatPhp } from '$lib/utils/numberFormat';

	const {
		series,
		supplierCounts,
		avgLanded
	}: {
		series: MonthlySeriesPoint[];
		supplierCounts: Record<string, number>;
		avgLanded: { lazada: number | null; shopee: number | null; local: number | null };
	} = $props();

	function fmtAvg(v: number | null): string {
		return v === null ? '—' : formatPhp(v);
	}

	let lineCanvas = $state<HTMLCanvasElement | null>(null);
	let doughnutCanvas = $state<HTMLCanvasElement | null>(null);
	let lineChart: Chart | null = null;
	let doughnutChart: Chart | null = null;

	function destroyCharts(): void {
		lineChart?.destroy();
		doughnutChart?.destroy();
		lineChart = null;
		doughnutChart = null;
	}

	onMount(() => () => destroyCharts());

	$effect(() => {
		if (!lineCanvas || !doughnutCanvas) return;
		destroyCharts();

		const labels =
			series.length > 0 ? series.map((p) => p.yearMonth) : ['No data'];
		const revenue = series.length > 0 ? series.map((p) => p.revenue) : [0];
		const netProfit = series.length > 0 ? series.map((p) => p.netProfit) : [0];

		lineChart = new Chart(lineCanvas, {
			type: 'line',
			data: {
				labels,
				datasets: [
					{
						label: 'Revenue',
						data: revenue,
						borderColor: 'rgb(5 150 105)',
						backgroundColor: 'rgba(5 150 105 / 0.08)',
						fill: true,
						tension: 0.25
					},
					{
						label: 'Net profit',
						data: netProfit,
						borderColor: 'rgb(37 99 235)',
						backgroundColor: 'rgba(37 99 235 / 0.06)',
						fill: true,
						tension: 0.25
					}
				]
			},
			options: {
				responsive: true,
				maintainAspectRatio: false,
				plugins: {
					legend: { position: 'bottom' },
					title: { display: true, text: 'Monthly trend (saved months + live)' }
				},
				scales: {
					y: {
						ticks: {
							callback: (tickValue) => {
								const n = typeof tickValue === 'number' ? tickValue : Number(tickValue);
								return Number.isFinite(n) ? formatPhp(n) : String(tickValue);
							}
						}
					}
				}
			}
		});

		const lz = supplierCounts.lazada ?? 0;
		const sh = supplierCounts.shopee ?? 0;
		const loc = supplierCounts.local ?? 0;
		const sum = lz + sh + loc;
		const sliceDefs = [
			{ label: 'Lazada', value: lz, color: '#0ea5e9' },
			{ label: 'Shopee', value: sh, color: '#ea580c' },
			{ label: 'Local', value: loc, color: '#059669' }
		].filter((s) => s.value > 1e-6);
		const doughLabels = sum < 1e-6 ? ['No wins yet'] : sliceDefs.map((s) => s.label);
		const doughData = sum < 1e-6 ? [1] : sliceDefs.map((s) => s.value);
		const doughColors = sum < 1e-6 ? ['#e4e4e7'] : sliceDefs.map((s) => s.color);

		doughnutChart = new Chart(doughnutCanvas, {
			type: 'doughnut',
			data: {
				labels: doughLabels,
				datasets: [
					{
						data: doughData,
						backgroundColor: doughColors,
						borderWidth: 0
					}
				]
			},
			options: {
				responsive: true,
				maintainAspectRatio: false,
				plugins: {
					legend: { position: 'bottom' },
					title: { display: true, text: 'Cheapest channel (per SKU)' }
				}
			}
		});
	});
</script>

<div class="glass overflow-hidden rounded-3xl shadow-xl">
	<div class="grid divide-y divide-zinc-200/50 lg:grid-cols-3 lg:divide-x lg:divide-y-0">
		<div class="p-5 sm:p-6 lg:col-span-2">
			<p class="mb-3 text-[11px] font-bold uppercase tracking-wider text-zinc-500">Monthly trend</p>
			<div class="h-72 w-full min-h-[18rem]">
				<canvas bind:this={lineCanvas} class="max-h-72"></canvas>
			</div>
		</div>
		<div class="flex flex-col divide-y divide-zinc-200/50">
			<div class="p-5 sm:p-6">
				<p class="mb-3 text-[11px] font-bold uppercase tracking-wider text-zinc-500">Channel wins</p>
				<div class="mx-auto h-52 w-full max-w-[220px]">
					<canvas bind:this={doughnutCanvas} class="max-h-52"></canvas>
				</div>
			</div>
			<div class="bg-zinc-50/60 p-5 sm:p-6 text-sm">
				<p class="text-[11px] font-bold uppercase tracking-wider text-zinc-500">Avg landed package</p>
				<dl class="mt-3 space-y-2.5 tabular-nums text-zinc-800">
					<div class="flex justify-between gap-2">
						<dt class="text-zinc-600">Lazada</dt>
						<dd class="font-semibold text-sky-700">{fmtAvg(avgLanded.lazada)}</dd>
					</div>
					<div class="flex justify-between gap-2">
						<dt class="text-zinc-600">Shopee</dt>
						<dd class="font-semibold text-orange-700">{fmtAvg(avgLanded.shopee)}</dd>
					</div>
					<div class="flex justify-between gap-2">
						<dt class="text-zinc-600">Local</dt>
						<dd class="font-semibold text-emerald-700">{fmtAvg(avgLanded.local)}</dd>
					</div>
				</dl>
				<p class="mt-3 text-[10px] leading-snug text-zinc-500">
					Averages include only SKUs with an explicit landed price for that channel (see channel wins).
				</p>
			</div>
		</div>
	</div>
</div>