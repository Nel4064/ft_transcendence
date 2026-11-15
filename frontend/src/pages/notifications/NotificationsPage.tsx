import NotificationsList from '../../components/Notifications/NotificationsList'
import Heading from '../../components/Heading/Heading'

function NotificationsPage() {
	return (
		<main className="max-w-[800px] mx-auto py-12 px-4">
			<Heading className="mb-5">Notifications</Heading>
			<NotificationsList />
		</main>
	)
}

export default NotificationsPage

