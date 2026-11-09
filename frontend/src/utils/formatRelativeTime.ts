// Seconds in each unit, biggest first: the loop picks the first one that fits
const units: [Intl.RelativeTimeFormatUnit, number][] = [
	['year', 60 * 60 * 24 * 365],
	['month', 60 * 60 * 24 * 30],
	['week', 60 * 60 * 24 * 7],
	['day', 60 * 60 * 24],
	['hour', 60 * 60],
	['minute', 60],
]

// "yesterday" -> "Yesterday" (a string's first character is text[0], like a char* in C)
function capitalise(text: string) {
	return text.charAt(0).toUpperCase() + text.slice(1)
}

// "2026-11-06T13:05:00.000Z" -> "2 hours ago", "yesterday", "just now"...
export function formatRelativeTime(iso: string, locale = 'en') {
	const formatter = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' })
	const seconds = (new Date(iso).getTime() - Date.now()) / 1000

	for (const [unit, size] of units) {
		if (Math.abs(seconds) >= size)
			return capitalise(formatter.format(Math.trunc(seconds / size), unit))
	}
	return 'Just now'
}