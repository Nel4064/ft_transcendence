import { NavLink } from 'react-router-dom'
import Logo from '../Logo/Logo'
import { useAuth } from '../../context/AuthContext'
import Avatar from '../Avatar/Avatar'
import { buttonClass } from '../button/Button'

const linkClass = "text-nav font-bold text-text-muted hover:text-text [&.active]:text-text transition-colors duration-300"
const linkClassAdmin = "text-nav font-bold text-text-admin-muted hover:text-admin [&.active]:text-admin transition-colors duration-300"

function Navbar() {
    const { user } = useAuth()

    return (
        <nav className="flex items-center py-[18px] px-10 bg-surface border-b border-border shadow-card">
            <div className="mr-auto">
                <Logo />
            </div>
            {user && (
                <div className="flex gap-10">
                    {user.role === 'ADMIN' && (
                        <NavLink to="/select-movies" className={linkClassAdmin}>
                            Select Movies
                        </NavLink>
                    )}
                    {user.role === 'ADMIN' && (
                        <NavLink to="/manage-members" className={linkClassAdmin}>
                            Manage Members
                        </NavLink>
                    )}
                    <NavLink to="/screenings" className={linkClass}>
                        Screenings
                    </NavLink>
                    <NavLink to="/reminders" className={linkClass}>
                        Reminders
                    </NavLink>
                    <NavLink to="/friends" className={linkClass}>
                        Friends
                    </NavLink>
                    <NavLink to="/activity" className={linkClass}>
                        Activities
                    </NavLink>
                    <NavLink to="/friends" className={linkClass}>
                        Friends
                    </NavLink>
                </div>
            )}

            {user ? (
                /* 💡 修复：把 user.avatarUrl 传给 Avatar，并加上路径补全（如果需要的话） */
                <NavLink to="/profile" className="ml-7 ">
                    <Avatar
                        src={user?.avatarUrl ? (user.avatarUrl.startsWith('http') ? user.avatarUrl : user.avatarUrl) : undefined}
                        size={70}
                    />
                </NavLink>
            ) : (
                <NavLink to="/signin" className={buttonClass("primary", "md", "ml-7")}>Login</NavLink>
            )}
        </nav>
    )
}

export default Navbar