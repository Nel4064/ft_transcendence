import { NavLink } from 'react-router-dom'

const navClass = "flex justify-around py-3 border-t border-border bg-surface"
const linkClass = "text-base text-text-muted transition-colors duration-300 [&.active]:text-brand [&.active]:font-bold"

function BottomNav() {
	return (
		<nav className={navClass}>
			<NavLink to="/privacypolicy" end className={linkClass}>Privacy Policy</NavLink>
			<NavLink to="/termsofservice" end className={linkClass}>Terms of Service</NavLink>
		</nav>
	)
}

export default BottomNav
