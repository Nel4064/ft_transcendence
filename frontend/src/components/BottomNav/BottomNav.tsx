import { NavLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

const navClass = "flex justify-around py-3 border-t border-border bg-surface"
const linkClass = "text-control text-text-muted transition-colors duration-300 [&.active]:text-brand [&.active]:font-bold"

function BottomNav() {
	const { t } = useTranslation()

	return (
		<nav className={navClass}>
			<NavLink to="/privacypolicy" end className={linkClass}>
				{t('privacyPolicy.heading')}
			</NavLink>
			<NavLink to="/termsofservice" end className={linkClass}>
				{t('termsOfService.heading')}
			</NavLink>
		</nav>
	)
}

export default BottomNav
