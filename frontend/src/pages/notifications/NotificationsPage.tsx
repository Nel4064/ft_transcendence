import NotificationsList from '../../components/Notifications/NotificationsList'

function NotificationsPage() {
	return (
		<main className="max-w-[560px] mx-auto py-12 px-4">
			<h1 className="font-serif font-bold text-title text-text mb-5">Notifications</h1>
			<div className="flex flex-col gap-2.5">
				<NotificationsList />
		</main>
	)
}

export default NotificationsPage

