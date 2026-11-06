import { useEffect, useState } from 'react'
import { io } from 'socket.io-client'
import NotificationsCard from './NotificationsCard'
import { useAuth } from '../../context/AuthContext'
import { getNotifications, markNotificationRead, type NotificationItem } from '../../api/notifications'
import { describeNotification } from '../../utils/describeNotification'
import { formatRelativeTime } from '../../utils/formatRelativeTime'

const listClass = "flex flex-col gap-2.5"
const statusClass = "text-body text-text-muted"
const errorClass = "text-body text-danger"

function NotificationsList() {
	const { apiFetch } = useAuth()
	const [notifications, setNotifications] = useState<NotificationItem[]>([])
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)

	// Fetch once on mount, then again whenever the backend pushes a notification
	useEffect(() => {
		function load() {
			getNotifications(apiFetch)
				.then(setNotifications)
				.catch((err: Error) => setError(err.message))
				.finally(() => setLoading(false))
		}

		load()
		const socket = io('/notifications')   // nginx forwards /socket.io/ to the backend
		socket.on('notification', load)

		// Cleanup: runs when the component leaves the screen
		return () => { socket.disconnect() }
	}, [apiFetch])

    function handleRead(id: string) {
		const now = new Date().toISOString()
		// Build a NEW array where only that notification gets a readAt
		setNotifications((list) =>
			list.map((n) => (n.id === id && n.readAt === null ? { ...n, readAt: now } : n)))
		markNotificationRead(apiFetch, id).catch((err: Error) => setError(err.message))
	}

	if (loading)
		return <p className={statusClass}>Loading…</p>
	if (error)
		return <p className={errorClass}>{error}</p>
	if (notifications.length === 0)
		return <p className={statusClass}>No notifications yet.</p>

	return (
		<div className={listClass}>
			{notifications.map((n) => (
				<NotificationsCard
					key={n.id}
					message={describeNotification(n)}
					time={formatRelativeTime(n.createdAt)}
					actor={n.actor}
					unread={n.readAt === null}
                    onClick={() => handleRead(n.id)}
				/>
			))}
		</div>
	)
}

export default NotificationsList
