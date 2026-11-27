import { Trans } from 'react-i18next'
import type { NotificationItem } from '../api/notifications'
import { formatDateTime } from './formatDateTime'

// Turns the type + payload sent by the backend into the sentence shown on the card
export function describeNotification(n: NotificationItem) {
	const actorName = n.actor?.displayName ?? 'CineClub'
	const { filmTitle, startsAt } = n.payload
	const date = startsAt ? formatDateTime(startsAt) : ''

	switch (n.type) {
		case 'CLUB_PICK':
			return (
				<Trans
					i18nKey="notifications.types.clubPick"
					values={{ actor: actorName, film: filmTitle, date }}
					components={{ b: <strong /> }}
				/>
			)
		case 'CLUB_PICK_REMOVED':
			return (
				<Trans
					i18nKey="notifications.types.clubPickRemoved"
					values={{ actor: actorName, film: filmTitle, date }}
					components={{ b: <strong /> }}
				/>
			)
		case 'FRIEND_REQUEST':
			return (
				<Trans
					i18nKey="notifications.types.friendRequest"
					values={{ actor: actorName }}
					components={{ b: <strong /> }}
				/>
			)
		case 'FRIEND_ACCEPTED':
			return (
				<Trans
					i18nKey="notifications.types.friendAccepted"
					values={{ actor: actorName }}
					components={{ b: <strong /> }}
				/>
			)
		case 'FRIEND_RSVP':
			return (
				<Trans
					i18nKey="notifications.types.friendRsvp"
					values={{ actor: actorName, film: filmTitle, date }}
					components={{ b: <strong /> }}
				/>
			)
		default:
			return <Trans i18nKey="notifications.types.unknown" />
	}
}
