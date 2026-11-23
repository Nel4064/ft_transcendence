const LOCALE_MAP: Record<string, string> = {
	en: 'en-GB',
	fr: 'fr-FR',
	zh: 'zh-CN',
	ch: 'zh-CN',
}

export function formatRelativeTime(dateInput: string | Date, locale = 'en'): string {
	const normalizedKey = locale.toLowerCase().slice(0, 2)
	const safeLocale = LOCALE_MAP[normalizedKey] || 'en-GB'

	const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput
	const diffSeconds = Math.round((date.getTime() - Date.now()) / 1000)
	const absSeconds = Math.abs(diffSeconds)

	const rtf = new Intl.RelativeTimeFormat(safeLocale, { numeric: 'auto' })

	if (absSeconds < 60) {
		return rtf.format(diffSeconds, 'second')
	}
	const diffMinutes = Math.round(diffSeconds / 60)
	if (Math.abs(diffMinutes) < 60) {
		return rtf.format(diffMinutes, 'minute')
	}
	const diffHours = Math.round(diffMinutes / 60)
	if (Math.abs(diffHours) < 24) {
		return rtf.format(diffHours, 'hour')
	}
	const diffDays = Math.round(diffHours / 24)
	if (Math.abs(diffDays) < 30) {
		return rtf.format(diffDays, 'day')
	}
	const diffMonths = Math.round(diffDays / 30)
	if (Math.abs(diffMonths) < 12) {
		return rtf.format(diffMonths, 'month')
	}
	const diffYears = Math.round(diffDays / 365)
	return rtf.format(diffYears, 'year')
}