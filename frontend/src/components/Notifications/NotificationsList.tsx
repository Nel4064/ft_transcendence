import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
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
	const { t } = useTranslation()
	const { apiFetch } = useAuth()
	const [notifications, setNotifications] = useState<NotificationItem[]>([])
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)
	const [, setNow] = useState(Date.now())

	useEffect(() => {
		const timer = setInterval(() => setNow(Date.now()), 60 * 1000)
		return () => clearInterval(timer)
	}, [])

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
		const socket = io('/notifications')
		socket.on('notification', load)

		return () => { socket.disconnect() }
	}, [apiFetch])

	if (loading)
		return <Loader />
	if (error)
		return <p className={errorClass}>{error}</p>
	if (notifications.length === 0)
		return <EmptyState message={t('notifications.empty')} />

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