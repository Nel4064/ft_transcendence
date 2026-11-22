
function isSameDate(date1: Date, date2: Date): boolean {
	return (
		date1.getFullYear() === date2.getFullYear() &&
		date1.getMonth() === date2.getMonth() &&
		date1.getDate() === date2.getDate()
	);
}

export function formatMessageTime(dateString: string): string {
	const targetDate = new Date(dateString);
	const timeStr = targetDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false});
	const dateStr = targetDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
	const today = new Date();
	const yesterday = new Date(today);
	yesterday.setDate(today.getDate() - 1);
	
	if (isSameDate(targetDate, today))
		return (timeStr);
	else if (isSameDate(targetDate, yesterday))
		return (`yesterday ${timeStr}`);
	else
		return (`${dateStr} ${timeStr}`);
};
