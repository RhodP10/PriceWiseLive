import { API_BASE } from '$lib/api/apiBase';

type AuthUser = { id: number; email: string } | null;

export const authState = $state({
	token: '',
	user: null as AuthUser
});

const TOKEN_KEY = 'pricewise_token';

export function hydrateAuthFromStorage(): void {
	if (typeof localStorage === 'undefined') return;
	authState.token = localStorage.getItem(TOKEN_KEY) ?? '';
}

export function saveToken(token: string): void {
	authState.token = token;
	if (typeof localStorage !== 'undefined') localStorage.setItem(TOKEN_KEY, token);
}

export function clearAuth(): void {
	authState.token = '';
	authState.user = null;
	if (typeof localStorage !== 'undefined') localStorage.removeItem(TOKEN_KEY);
}

export async function fetchMe(): Promise<void> {
	if (!authState.token) return;
	const res = await fetch(`${API_BASE}/auth/me`, {
		headers: { Authorization: `Bearer ${authState.token}` }
	});
	if (!res.ok) {
		clearAuth();
		return;
	}
	authState.user = await res.json();
}

export function isAuthenticated(): boolean {
	return Boolean(authState.token && authState.user);
}

