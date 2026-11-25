export type MessageItem = {
	id: string;
	senderId: string;
	createdAt: string;
	[key: string]: any;
};

export function isSameDate(date1: Date, date2: Date): boolean {
	return date1.toDateString() === date2.toDateString();
}

export function formatMessageTime(dateString: string): string {
	const targetDate = new Date(dateString);
	const timeStr = targetDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
	const dateStr = targetDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
	const today = new Date();
	const yesterday = new Date(today);
	yesterday.setDate(today.getDate() - 1);
	
	if (isSameDate(targetDate, today))
		return timeStr;
	else if (isSameDate(targetDate, yesterday))
		return `yesterday ${timeStr}`;
	else
		return `${dateStr} ${timeStr}`;
}

export function getMessageDateLabel(dateString: string): string {
	const date = new Date(dateString);
	const today = new Date();
	if (isSameDate(date, today)) return 'Today';

	const yesterday = new Date(today);
	yesterday.setDate(yesterday.getDate() - 1);
	if (isSameDate(date, yesterday)) return 'Yesterday';

	return date.toLocaleDateString('en-US', {
		year: 'numeric',
		month: 'long',
		day: 'numeric',
	});
}

