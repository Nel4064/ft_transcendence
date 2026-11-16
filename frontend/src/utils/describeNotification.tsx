import type { NotificationItem } from '../api/notifications'
import { formatDateTime } from './formatDateTime'

// Turns the type + payload sent by the backend into the sentence shown on the card
export function describeNotification(n: NotificationItem) {
	const actorName = n.actor?.displayName ?? 'CineClub'
	const { filmTitle, startsAt } = n.payload

	switch (n.type) {
		case 'CLUB_PICK':
			return <><strong>{actorName}</strong> picked <strong>{filmTitle}</strong> ({formatDateTime(startsAt)})</>
		case 'CLUB_PICK_REMOVED':
			return <><strong>{actorName}</strong> unpicked <strong>{filmTitle}</strong> ({formatDateTime(startsAt)})</>
		case 'FRIEND_REQUEST':
			return <><strong>{actorName}</strong> sent you a friend request</>
		case 'FRIEND_ACCEPTED':
			return <><strong>{actorName}</strong> accepted your friend request</>
		case 'FRIEND_RSVP':
			return <><strong>{actorName}</strong> is going to <strong>{filmTitle}</strong> ({formatDateTime(startsAt)})</>
		default:
			return 'New unknown notification'
	}
}
