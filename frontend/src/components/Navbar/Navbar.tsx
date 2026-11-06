import { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import Logo from '../Logo/Logo';
import { useAuth } from '../../context/AuthContext';
import Avatar from '../Avatar/Avatar';
import { buttonClass } from '../button/Button';
import { getPendingRequests } from '../../api/friends';

const linkClass = "text-nav font-bold text-text-muted hover:text-text [&.active]:text-text transition-colors duration-300";
const linkClassAdmin = "text-nav font-bold text-text-admin-muted hover:text-admin [&.active]:text-admin transition-colors duration-300";

function Navbar() {
    const { user, apiFetch } = useAuth();
    const [pendingCount, setPendingCount] = useState(0);

    useEffect(() => {
        if (!user) return;

        const fetchPendingCount = async () => {
            try {
                const data = await getPendingRequests(apiFetch);
                if (Array.isArray(data)) {
                    setPendingCount(data.length);
                }
            } catch (err) {
                console.error('Failed to fetch friend requests count', err);
            }
        };

        fetchPendingCount();
    }, [user, apiFetch]);

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
                    
                    <NavLink to="/friends" className={`${linkClass} relative`}>
                        Friends
                        {pendingCount > 0 && (
                            <span className="absolute -top-2 -right-3 bg-rose-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none">
                                {pendingCount}
                            </span>
                        )}
                    </NavLink>
                    <NavLink to="/notifications" className={linkClass}>
                        Notifications
                    </NavLink>
                </div>
            )}

            {user ? (
                <NavLink to="/profile" className="ml-7 ">
                    <Avatar
                        src={user?.avatarUrl ? user.avatarUrl : undefined}
                        size={70}
                    />
                </NavLink>
            ) : (
                <NavLink to="/signin" className={buttonClass("primary", "md", "ml-7")}>Login</NavLink>
            )}
        </nav>
    );
}

export default Navbar;