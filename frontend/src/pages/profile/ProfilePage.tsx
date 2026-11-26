import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../context/AuthContext'
import Button, { buttonClass } from '../../components/button/Button'
import ProfileSummary from '../../components/Profile/ProfileSummary'

function ProfilePage() {
	const { user, logout } = useAuth()
	const { t } = useTranslation()
	const navigate = useNavigate()

	const settingsLinks = [
		{ to: '/profile/edit', label: t('profile.links.edit', 'Edit profile') },
		{ to: '/profile/security', label: t('profile.links.security', 'Manage two-factor authentication') },
		{ to: '/profile/privacy', label: t('profile.links.privacy', 'Download or delete my data (GDPR)') },
	]

	function handleLogout() {
		logout()
		navigate('/signin')
	}

	if (!user) return null

	return (
		<main>
			<div className="flex flex-col gap-6 max-w-[600px] mx-auto my-[60px]">
				<ProfileSummary profile={user}>
					<div className="flex flex-col gap-3">
						{settingsLinks.map((link) => (
							<Link key={link.to} to={link.to} className={buttonClass('primary', 'lg', 'w-full')}>
								{link.label}
							</Link>
						))}
					</div>

					<Button variant="danger" className="self-end" onClick={handleLogout}>
						{t('profile.logoutButton')}
					</Button>
				</ProfileSummary>
			</div>
		</main>
	)
}

export default ProfilePage