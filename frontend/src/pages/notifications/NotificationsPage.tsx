import NotificationsList from '../../components/Notifications/NotificationsList'
import Heading from '../../components/Heading/Heading'
import { useTranslation } from 'react-i18next'

function NotificationsPage() {
	const { t } = useTranslation()
	return (
		<main className="max-w-[800px] mx-auto py-12 px-4">
			<Heading className="mb-5">{t('notifications.heading')}</Heading>
			<NotificationsList />
		</main>
	)
}

export default NotificationsPage

