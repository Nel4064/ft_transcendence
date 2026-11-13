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

    // ✨ 拆分 1：负责拉取数据的普通函数（不再用 useCallback 绕来绕去）
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

    // ✨ 拆分 2：只负责【初始加载】和【本地接受/拒绝点击】的更新
    useEffect(() => {
        if (!user?.id) return;
        
        fetchCounts(); // 初始加载

        const handleLocalUpdate = () => {
            console.log('🔄 Navbar 监听到本地数据变化，正在刷新红点...');
            fetchCounts();
        };
        
        window.addEventListener('update_navbar', handleLocalUpdate);
        return () => window.removeEventListener('update_navbar', handleLocalUpdate);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user?.id]); // ⚠️ 故意不写 fetchCount 和 apiFetch，防止死循环

    // ✨ 拆分 3：只负责【WebSocket】监听
    useEffect(() => {
        if (!user?.id) return;

        console.log('🔌 Navbar 正在连接 WebSocket...');
        const socket = io('/notifications', { transports: ['websocket'] });

        socket.on('connect', () => {
            console.log('✅ Navbar WebSocket 连接成功! ID:', socket.id);
        });

        socket.on('notification', () => {
            fetchCounts();
        });


        return () => {
            console.log('❌ Navbar WebSocket 断开连接');
            socket.disconnect();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user?.id]); // ⚠️ 绝对不能把 apiFetch 放进这里，否则会无限断开重连！

    return (
        <nav className="flex items-center py-[18px] px-10 bg-surface border-b border-border shadow-card">
            <div className="mr-auto">
                <Logo />
            </div>
            {user && (
                <div className="flex gap-10">
                    {user.role === 'ADMIN' && (
                        <NavLink to="/select-movies" className={linkClassAdmin}>Select Movies</NavLink>
                    )}
                    {user.role === 'ADMIN' && (
                        <NavLink to="/manage-members" className={linkClassAdmin}>Manage Members</NavLink>
                    )}
                    <NavLink to="/screenings" className={linkClass}>Screenings</NavLink>
                    <NavLink to="/reminders" className={linkClass}>Reminders</NavLink>
                    
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

            {user ? (
                <NavLink to="/profile" className="ml-7 ">
                    <Avatar src={user?.avatarUrl ? user.avatarUrl : undefined} size={70} />
                </NavLink>
            ) : (
                <NavLink to="/signin" className={buttonClass("primary", "md", "ml-7")}>Login</NavLink>
            )}
        </nav>
    );
}

export default Navbar;