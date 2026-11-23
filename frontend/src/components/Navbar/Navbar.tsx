import { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import Logo from '../Logo/Logo';
import { useAuth } from '../../context/AuthContext';
import Avatar from '../Avatar/Avatar';
import { buttonClass } from '../button/Button';
import { getPendingRequests } from '../../api/friends';
import { io } from 'socket.io-client';
import Alert from '../Alert/Alert';
import { getNotifications } from '../../api/notifications';

const linkClass = "text-nav font-bold text-text-muted hover:text-text [&.active]:text-text transition-colors duration-300";
const linkClassAdmin = "text-nav font-bold text-text-admin-muted hover:text-admin [&.active]:text-admin transition-colors duration-300";

function Navbar() {
    const { user, apiFetch } = useAuth();
    const [pendingCount, setPendingCount] = useState(0);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const fetchCounts = async () => {
        if (!user?.id) return;
        try {
            const [requests, notifications] = await Promise.all([
                getPendingRequests(apiFetch),
                getNotifications(apiFetch),
            ]);
            if (Array.isArray(requests)) setPendingCount(requests.length);
            setUnreadCount(notifications.filter((n) => n.readAt === null).length);
        } catch (err) {
            console.error('Failed to fetch navbar counts', err);
        }
    };

    useEffect(() => {
        if (!user?.id) return;

        fetchCounts();

        const handleLocalUpdate = () => {
            fetchCounts();
        };

        window.addEventListener('update_navbar', handleLocalUpdate);
        return () => window.removeEventListener('update_navbar', handleLocalUpdate);
    }, [user?.id]);

    useEffect(() => {
        if (!user?.id) return;
        const socket = io('/notifications', { transports: ['websocket'] });

        socket.on('connect', () => {
            console.log('✅ Navbar WebSocket connection success! ID:', socket.id);
        });

        socket.on('notification', () => {
            fetchCounts();
        });

        return () => {
            console.log('❌ Navbar WebSocket disconnect');
            socket.disconnect();
        };
    }, [user?.id]);

    const closeMenu = () => setIsMobileMenuOpen(false);
    const hasAnyAlert = pendingCount > 0 || unreadCount > 0;

    return (
        <nav className="relative bg-surface border-b border-border shadow-card">
            <div className="flex items-center justify-between py-3 sm:py-[18px] px-4 sm:px-6 lg:px-10">
                <div className="mr-auto" onClick={closeMenu}>
                    <Logo />
                </div>

                {/* desktop */}
                {user && (
                    <div className="hidden lg:flex items-center gap-6 xl:gap-10">
                        {user.role === 'ADMIN' && (
                            <NavLink to="/select-movies" className={linkClassAdmin}>Select Movies</NavLink>
                        )}
                        {user.role === 'ADMIN' && (
                            <NavLink to="/admin" className={linkClassAdmin}>Manage Members</NavLink>
                        )}
                        <NavLink to="/screenings" className={linkClass}>Screenings</NavLink>
                        <NavLink to="/calendar" className={linkClass}>Calendar</NavLink>

                        <NavLink to="/friends" className={`${linkClass} relative`}>
                            Friends
                            <Alert show={pendingCount > 0} />
                        </NavLink>
                        <NavLink to="/notifications" className={`${linkClass} relative`}>
                            Notifications
                            <Alert show={unreadCount > 0} />
                        </NavLink>
                    </div>
                )}

                {/* Right actions: mobile hamburger button + avatar / login button */}
                <div className="flex items-center gap-3 sm:gap-5 lg:ml-7">
                    {user && (
                        <button
                            type="button"
                            onClick={() => setIsMobileMenuOpen((prev) => !prev)}
                            aria-label="Toggle navigation menu"
                            aria-expanded={isMobileMenuOpen}
                            className="lg:hidden relative p-2 rounded-md text-text-muted hover:text-text hover:bg-bg transition-colors"
                        >
                            {isMobileMenuOpen ? (
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            ) : (
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                                </svg>
                            )}
                            {/* When the menu is collapsed, show a red dot on the top-right corner of the hamburger icon if there are unread messages or friend requests */}
                            {!isMobileMenuOpen && <Alert show={hasAnyAlert} />}
                        </button>
                    )}

                    {user ? (
                        <NavLink to="/profile" onClick={closeMenu} className="shrink-0">
                            <Avatar src={user?.avatarUrl ? user.avatarUrl : undefined} size={56} />
                        </NavLink>
                    ) : (
                        <NavLink to="/signin" className={buttonClass("primary", "md")}>Login</NavLink>
                    )}
                </div>
            </div>

            {/* Collapsible menu for mobile / tablet */}
            {user && isMobileMenuOpen && (
                <div className="lg:hidden flex flex-col gap-4 px-4 sm:px-6 pt-3 pb-5 bg-surface border-t border-border">
                    {user.role === 'ADMIN' && (
                        <NavLink to="/select-movies" onClick={closeMenu} className={`${linkClassAdmin} py-1`}>
                            Select Movies
                        </NavLink>
                    )}
                    {user.role === 'ADMIN' && (
                        <NavLink to="/admin" onClick={closeMenu} className={`${linkClassAdmin} py-1`}>
                            Manage Members
                        </NavLink>
                    )}
                    <NavLink to="/screenings" onClick={closeMenu} className={`${linkClass} py-1`}>
                        Screenings
                    </NavLink>
                    <NavLink to="/calendar" onClick={closeMenu} className={`${linkClass} py-1`}>
                        Calendar
                    </NavLink>
                    <NavLink to="/friends" onClick={closeMenu} className={`${linkClass} py-1 flex items-center justify-between`}>
                        <span>Friends</span>
                        {pendingCount > 0 && (
                            <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-red-500 text-white">
                                {pendingCount}
                            </span>
                        )}
                    </NavLink>
                    <NavLink to="/notifications" onClick={closeMenu} className={`${linkClass} py-1 flex items-center justify-between`}>
                        <span>Notifications</span>
                        {unreadCount > 0 && (
                            <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-red-500 text-white">
                                {unreadCount}
                            </span>
                        )}
                    </NavLink>
                </div>
            )}
        </nav>
    );
}

export default Navbar;