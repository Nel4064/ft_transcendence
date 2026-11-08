import { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import Logo from '../Logo/Logo';
import { useAuth } from '../../context/AuthContext';
import Avatar from '../Avatar/Avatar';
import { buttonClass } from '../button/Button';
import { getPendingRequests } from '../../api/friends';
import { useActivityFeed } from '../../pages/activity/activity.ts';

const linkClassAdmin = "text-nav font-bold text-text-admin-muted hover:text-admin [&.active]:text-admin transition-colors duration-300";

function Navbar() {
    const { user, apiFetch } = useAuth();
    const [pendingCount, setPendingCount] = useState(0);

    const notifications = useActivityFeed();

    // 💡 核心：用正确的 n.actor?.id 和当前登录用户的 id 做比对
    const unreadNotifications = notifications.filter(n => {
        if (!user) return false;

        // 获取通知的发起者 ID（对应后端 include 的 actor.id）
        const senderId = n.actorId || (n as any).actorId;

        // 如果是自己触发的，直接拦截，绝不显示红点
        if (senderId && String(senderId) === String(user.id)) {
            return false;
        }

        // 拦截已读的
        if (n.readAt) {
            return false;
        }

        return true;
    });

    const count = unreadNotifications.length;

    const linkClass = "text-foreground hover:text-primary transition-colors";

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

                    <NavLink to="/activity" className={`${linkClass} relative flex items-center`}>
                        Activities
                        {count > 0 && (
                            <span className="ml-1.5 px-2 py-0.5 text-xs font-bold text-white bg-red-500 rounded-full">
                                {count}
                            </span>
                        )}
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