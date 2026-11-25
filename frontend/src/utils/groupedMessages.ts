import type { MessageItem } from './formatMessageTime'
import { isSameDate } from './formatMessageTime'

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

export function shouldGroupMessage(previousMessage: MessageItem | undefined, message: MessageItem): boolean {
	if (!previousMessage || previousMessage.senderId !== message.senderId) return false;
	if (!isSameDate(new Date(previousMessage.createdAt), new Date(message.createdAt))) return false;

	const elapsed = new Date(message.createdAt).getTime() - new Date(previousMessage.createdAt).getTime();
	return elapsed >= 0 && elapsed <= 5 * 60 * 1000;
}