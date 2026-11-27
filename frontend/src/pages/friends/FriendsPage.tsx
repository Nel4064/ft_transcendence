import FriendsManager from '../../components/Friends/FriendsManager';
import Heading from '../../components/Heading/Heading';
import { useTranslation } from 'react-i18next'

export default function FriendsPage() {
    const { t } = useTranslation()
    return (
        <main className="max-w-[800px] mx-auto py-12 px-4">
            <Heading level="title" className="mb-5">{t('friends.pageTitle')}</Heading>
            <FriendsManager />
        </main>
    );
}