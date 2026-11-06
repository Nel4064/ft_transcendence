// "2026-11-08T19:30:00.000Z" -> "Sun 8 Nov, 20:30" (in the viewer's time zone)
export function formatDateTime(date: string | Date) {
	return new Date(date).toLocaleString('en-GB', {
		weekday: 'short', day: 'numeric', month: 'short',
		hour: '2-digit', minute: '2-digit',
	})
}