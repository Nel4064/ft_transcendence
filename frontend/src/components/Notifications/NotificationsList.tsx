import { useEffect, useState } from 'react'
import { io } from 'socket.io-client'
import NotificationsCard from './NotificationsCard'
import { useAuth } from '../../context/AuthContext'
import { getNotifications, markAllNotificationsRead, type NotificationItem } from '../../api/notifications'
import { describeNotification } from '../../utils/describeNotification'
import { formatRelativeTime } from '../../utils/formatRelativeTime'
import Loader from '../Loader/Loader'
import EmptyState from '../EmptyState/EmptyState'

const listClass = "flex flex-col gap-2.5"
const errorClass = "text-body text-danger"

function NotificationsList() {
	const { apiFetch } = useAuth()
	const [notifications, setNotifications] = useState<NotificationItem[]>([])
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)
	const [, setNow] = useState(Date.now())
	useEffect(() => {
		const timer = setInterval(() => setNow(Date.now()), 60 * 1000)
		return () => clearInterval(timer)
	}, [])

	// Fetch on mount and on every pushed notification; show the list as received
	useEffect(() => {

		function markAllRead() {
			markAllNotificationsRead(apiFetch)
				.then(() => window.dispatchEvent(new Event('update_navbar')))
				.catch((err: Error) => setError(err.message))
		}

		function load() {
			getNotifications(apiFetch)
				.then((list) => {
					setNotifications(list)
					if (list.some((n) => n.readAt === null)) markAllRead()
					})
				.catch((err: Error) => setError(err.message))
				.finally(() => setLoading(false))
		}

		load()
		const socket = io('/notifications')   // nginx forwards /socket.io/ to the backend
		socket.on('notification', load)

		// Cleanup: runs when the component leaves the screen
		return () => { socket.disconnect() }
	}, [apiFetch])

	if (loading)
		return <Loader />
	if (error)
		return <p className={errorClass}>{error}</p>
	if (notifications.length === 0)
		return <EmptyState message="No notifications yet." />

	return (
		<div className={listClass}>
			{notifications.map((n) => (
				<NotificationsCard
					key={n.id}
					message={describeNotification(n)}
					time={formatRelativeTime(n.createdAt)}
					actor={n.actor}
					unread={n.readAt === null}
				/>
			))}
		</div>
	)
}

export default NotificationsList
