export type MessageItem = {
	id: string;
	senderId: string;
	createdAt: string;
	[key: string]: any;
};

function isSameDate(date1: Date, date2: Date): boolean {
	return (
		date1.getFullYear() === date2.getFullYear() &&
		date1.getMonth() === date2.getMonth() &&
		date1.getDate() === date2.getDate()
	);
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

export function getMessageDateKey(dateString: string): string {
	return new Date(dateString).toDateString();
}

export function getMessageDateLabel(dateString: string): string {
	const date = new Date(dateString);
	const dateKey = getMessageDateKey(dateString);
	const today = new Date();
	if (dateKey === today.toDateString()) return 'Today';

	const yesterday = new Date(today);
	yesterday.setDate(yesterday.getDate() - 1);
	if (dateKey === yesterday.toDateString()) return 'Yesterday';

	return date.toLocaleDateString('en-US', {
		year: 'numeric',
		month: 'long',
		day: 'numeric',
	});
}

export function shouldGroupMessage(previousMessage: MessageItem | undefined, message: MessageItem): boolean {
	if (!previousMessage || previousMessage.senderId !== message.senderId) return false;
	if (getMessageDateKey(previousMessage.createdAt) !== getMessageDateKey(message.createdAt)) return false;

	const elapsed = new Date(message.createdAt).getTime() - new Date(previousMessage.createdAt).getTime();
	return elapsed >= 0 && elapsed <= 5 * 60 * 1000;
}

export function getErrorMessage(error: unknown): string {
	return error instanceof Error ? error.message : '';
}

export function isConversationMissing(error: unknown): boolean {
	return /validation failed \(uuid is expected\)|invalid uuid|not found|404/i.test(getErrorMessage(error));
}

export function mergeMessages<T extends MessageItem>(currentMessages: T[], incomingMessages: T[]): T[] {
	const messagesById = new Map<string, T>();
	for (const message of currentMessages) {
		messagesById.set(message.id, message);
	}
	for (const message of incomingMessages) {
		messagesById.set(message.id, message);
	}
	return [...messagesById.values()].sort(
		(a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
	);
}
