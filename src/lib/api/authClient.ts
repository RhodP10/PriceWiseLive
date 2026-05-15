import { API_BASE } from '$lib/api/apiBase';

export async function changePassword(
	token: string,
	currentPassword: string,
	newPassword: string
): Promise<void> {
	const res = await fetch(`${API_BASE}/auth/me/password`, {
		method: 'PATCH',
		headers: {
			Authorization: `Bearer ${token}`,
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({
			current_password: currentPassword,
			new_password: newPassword
		})
	});
	if (!res.ok) {
		const text = await res.text();
		let msg = text || `Password change failed (${res.status})`;
		try {
			const j = JSON.parse(text) as { detail?: unknown };
			if (typeof j.detail === 'string') msg = j.detail;
		} catch {
			/* keep msg */
		}
		throw new Error(msg);
	}
}
