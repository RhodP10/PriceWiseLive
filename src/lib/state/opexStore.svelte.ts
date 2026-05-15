import type { OpexLineDTO } from '$lib/types/recipe';

export const opexStore = $state({
	lines: [] as OpexLineDTO[]
});

function newId(): string {
	if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
	return `opex_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function addOpexLine(label: string, amountPerMonth: number): void {
	const row: OpexLineDTO = {
		id: newId(),
		label: label.trim(),
		amountPerMonth
	};
	opexStore.lines = [...opexStore.lines, row];
}

export function updateOpexLine(id: string, patch: Partial<Pick<OpexLineDTO, 'label' | 'amountPerMonth'>>): void {
	opexStore.lines = opexStore.lines.map((l) =>
		l.id === id
			? {
					...l,
					...patch,
					...(patch.label !== undefined ? { label: patch.label.trim() } : {})
				}
			: l
	);
}

export function deleteOpexLine(id: string): void {
	opexStore.lines = opexStore.lines.filter((l) => l.id !== id);
}

export function monthlyOpexTotal(): number {
	return opexStore.lines.reduce((s, l) => s + l.amountPerMonth, 0);
}

export function resetOpexStore(): void {
	opexStore.lines = [];
}

export function replaceOpexLines(next: OpexLineDTO[]): void {
	opexStore.lines = structuredClone(next);
}
