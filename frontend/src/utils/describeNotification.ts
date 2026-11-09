import type { NotificationItem } from '../api/notifications'
import { formatDateTime } from './formatDateTime'

// Turns the type + payload sent by the backend into the sentence shown on the card
export function describeNotification(n: NotificationItem) {
	const actorName = n.actor?.displayName ?? 'CineClub'
	const { filmTitle, startsAt } = n.payload

	switch (n.type) {
		case 'CLUB_PICK':
			return `${actorName} picked ${filmTitle} (${formatDateTime(startsAt)})`
		case 'CLUB_PICK_REMOVED':
			return `${actorName} unpicked ${filmTitle} (${formatDateTime(startsAt)})`
		case 'FRIEND_REQUEST':
			return `${actorName} sent you a friend request`
		case 'FRIEND_ACCEPTED':
			return `${actorName} accepted your friend request`
		default:
			return 'New unknown notification'
	}
}
