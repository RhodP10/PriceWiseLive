/** Client preferences (not synced to workspace DB). */
const LS_DISPLAY = 'pricewise_display_name';
const LS_THEME = 'pricewise_theme';
const LS_NOTIFY_EMAIL = 'pricewise_notify_email';
const LS_NOTIFY_PRICE = 'pricewise_notify_price';
const LS_EXPORT = 'pricewise_default_export';

export type ExportFormat = 'csv' | 'json';

export const userPrefs = $state({
	displayName: '',
	darkMode: false,
	notifyEmailDigest: false,
	notifyPriceAlerts: false,
	defaultExportFormat: 'csv' as ExportFormat
});

let hydrated = false;

function applyDarkClass(): void {
	if (typeof document === 'undefined') return;
	document.documentElement.classList.toggle('dark', userPrefs.darkMode);
}

export function hydrateUserPrefs(): void {
	if (typeof localStorage === 'undefined') return;
	if (!hydrated) {
		hydrated = true;
		userPrefs.displayName = localStorage.getItem(LS_DISPLAY) ?? '';
		userPrefs.darkMode = localStorage.getItem(LS_THEME) === 'dark';
		userPrefs.notifyEmailDigest = localStorage.getItem(LS_NOTIFY_EMAIL) === '1';
		userPrefs.notifyPriceAlerts = localStorage.getItem(LS_NOTIFY_PRICE) === '1';
		const ex = localStorage.getItem(LS_EXPORT);
		userPrefs.defaultExportFormat = ex === 'json' ? 'json' : 'csv';
	}
	applyDarkClass();
}

export function persistUserPrefs(): void {
	if (typeof localStorage === 'undefined') return;
	localStorage.setItem(LS_DISPLAY, userPrefs.displayName.trim());
	localStorage.setItem(LS_THEME, userPrefs.darkMode ? 'dark' : 'light');
	localStorage.setItem(LS_NOTIFY_EMAIL, userPrefs.notifyEmailDigest ? '1' : '0');
	localStorage.setItem(LS_NOTIFY_PRICE, userPrefs.notifyPriceAlerts ? '1' : '0');
	localStorage.setItem(LS_EXPORT, userPrefs.defaultExportFormat);
	applyDarkClass();
}
