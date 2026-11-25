import { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Logo from '../Logo/Logo';
import { useAuth } from '../../context/AuthContext';
import Avatar from '../Avatar/Avatar';
import { buttonClass } from '../button/Button';
import { getPendingRequests } from '../../api/friends';
import { io } from 'socket.io-client';
import Alert from '../Alert/Alert';
import { getNotifications } from '../../api/notifications';

const linkClass = "whitespace-nowrap text-nav font-bold text-text-muted hover:text-text [&.active]:text-text transition-colors duration-300";
const linkClassAdmin = "whitespace-nowrap text-nav font-bold text-text-admin-muted hover:text-admin [&.active]:text-admin transition-colors duration-300";

function Navbar() {
    const { t } = useTranslation();
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
            <div className="flex items-center justify-between py-3 sm:py-[18px] px-4 sm:px-6 xl:px-10">
                <div className="mr-auto shrink-0" onClick={closeMenu}>
                    <Logo />
                </div>

                {/* desktop */}
                {user && (
                    <div className="hidden xl:flex items-center gap-6 2xl:gap-10">
                        {user.role === 'ADMIN' && (
                            <NavLink to="/select-movies" className={linkClassAdmin}>
                                {t('navbar.selectMovies')}
                            </NavLink>
                        )}
                        {user.role === 'ADMIN' && (
                            <NavLink to="/admin" className={linkClassAdmin}>
                                {t('navbar.manageMembers')}
                            </NavLink>
                        )}
                        <NavLink to="/screenings" className={linkClass}>
                            {t('navbar.screenings')}
                        </NavLink>
                        <NavLink to="/calendar" className={linkClass}>
                            {t('navbar.calendar')}
                        </NavLink>

                        <NavLink to="/friends" className={`${linkClass} relative`}>
                            {t('navbar.friends')}
                            <Alert show={pendingCount > 0} />
                        </NavLink>
                        <NavLink to="/notifications" className={`${linkClass} relative`}>
                            {t('navbar.notifications')}
                            <Alert show={unreadCount > 0} />
                        </NavLink>
                    </div>
                )}

                {/* Right actions: mobile hamburger button + avatar / login button */}
                <div className="flex items-center gap-3 sm:gap-5 xl:ml-7 shrink-0">
                    {user && (
                        <button
                            type="button"
                            onClick={() => setIsMobileMenuOpen((prev) => !prev)}
                            aria-label={t('navbar.toggleMenu')}
                            aria-expanded={isMobileMenuOpen}
                            className="xl:hidden relative p-2 rounded-md text-text-muted hover:text-text hover:bg-bg transition-colors"
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
                            {!isMobileMenuOpen && <Alert show={hasAnyAlert} />}
                        </button>
                    )}

                    {user ? (
                        <NavLink to="/profile" onClick={closeMenu} className="shrink-0">
                            <Avatar src={user?.avatarUrl ? user.avatarUrl : undefined} size={56} />
                        </NavLink>
                    ) : (
                        <NavLink to="/signin" className={buttonClass("primary", "md")}>
                            {t('navbar.login')}
                        </NavLink>
                    )}
                </div>
            </div>

            {/* Collapsible menu for mobile / tablet */}
            {user && isMobileMenuOpen && (
                <div className="xl:hidden flex flex-col gap-4 px-4 sm:px-6 pt-3 pb-5 bg-surface border-t border-border">
                    {user.role === 'ADMIN' && (
                        <NavLink to="/select-movies" onClick={closeMenu} className={`${linkClassAdmin} py-1`}>
                            {t('navbar.selectMovies')}
                        </NavLink>
                    )}
                    {user.role === 'ADMIN' && (
                        <NavLink to="/admin" onClick={closeMenu} className={`${linkClassAdmin} py-1`}>
                            {t('navbar.manageMembers')}
                        </NavLink>
                    )}
                    <NavLink to="/screenings" onClick={closeMenu} className={`${linkClass} py-1`}>
                        {t('navbar.screenings')}
                    </NavLink>
                    <NavLink to="/calendar" onClick={closeMenu} className={`${linkClass} py-1`}>
                        {t('navbar.calendar')}
                    </NavLink>
                    <NavLink to="/friends" onClick={closeMenu} className={`${linkClass} py-1 flex items-center justify-between`}>
                        <span>{t('navbar.friends')}</span>
                        {pendingCount > 0 && (
                            <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-red-500 text-white">
                                {pendingCount}
                            </span>
                        )}
                    </NavLink>
                    <NavLink to="/notifications" onClick={closeMenu} className={`${linkClass} py-1 flex items-center justify-between`}>
                        <span>{t('navbar.notifications')}</span>
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