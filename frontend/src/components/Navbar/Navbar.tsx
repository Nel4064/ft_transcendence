import { NavLink } from 'react-router-dom'
import Logo from '../Logo/Logo'
import { useAuth } from '../../context/AuthContext'
import Avatar from '../Avatar/Avatar'

const linkClass = "text-[18px] text-text-muted hover:text-text [&.active]:text-text transition-colors duration-300"
const linkClassAdmin = "text-[18px] text-text-admin-muted hover:text-admin [&.active]:text-admin transition-colors duration-300"

function Navbar() {
    const { user } = useAuth()
    
    return (
        <nav className="flex items-center py-[18px] px-10 bg-surface border-b border-border shadow-card">
            <div className="mr-auto">
                <Logo/>
            </div>
            { user && (
                <div className="flex gap-10">
                    {user.role === 'ADMIN' && (
                        <NavLink to="/search-movies" className={linkClassAdmin}>
                            Search movies
                        </NavLink>
                    )}
                    <NavLink to="/calendar" className={linkClass}>
                        Calendar
                    </NavLink>
                    <NavLink to="/activity" className={linkClass}>
                        Activity
                    </NavLink>
                </div>
            )}

            {user ? (
                    /* 💡 修复：把 user.avatarUrl 传给 Avatar，并加上路径补全（如果需要的话） */
                    <NavLink to="/profile" className="ml-7 ">
                        <Avatar 
                            src={user?.avatarUrl ? (user.avatarUrl.startsWith('http') ? user.avatarUrl : `http://localhost:3000${user.avatarUrl}`) : undefined} 
                            size={70} 
                        /> 
                    </NavLink>
            ) : (
                    <NavLink to="/signin" className="ml-7 py-2 px-4 rounded-md bg-brand hover:bg-brand-hover text-white text-base font-bold transition-colors">Login</NavLink>
            )}
        </nav>
    )
}

export default Navbar