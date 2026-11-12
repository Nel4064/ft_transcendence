import { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import Logo from '../Logo/Logo';
import { useAuth } from '../../context/AuthContext';
import Avatar from '../Avatar/Avatar';
import { buttonClass } from '../button/Button';
import { getPendingRequests } from '../../api/friends';
import { io } from 'socket.io-client';

const linkClass = "text-nav font-bold text-text-muted hover:text-text [&.active]:text-text transition-colors duration-300";
const linkClassAdmin = "text-nav font-bold text-text-admin-muted hover:text-admin [&.active]:text-admin transition-colors duration-300";

function Navbar() {
    const { user, apiFetch } = useAuth();
    const [pendingCount, setPendingCount] = useState(0);

    // 负责拉取数据的普通函数
    const fetchCount = async () => {
        if (!user?.id) return;
        try {
            const data = await getPendingRequests(apiFetch);
            if (Array.isArray(data)) {
                setPendingCount(data.length);
            }
        } catch (err) {
            console.error('Failed to fetch friend requests count', err);
        }
    };

    // 只负责【初始加载】和【本地接受/拒绝点击】的更新
    useEffect(() => {
        if (!user?.id) return;
        
        fetchCount(); // 初始加载

        const handleLocalUpdate = () => {
            console.log('🔄 Navbar 监听到本地数据变化，正在刷新红点...');
            fetchCount();
        };
        
        window.addEventListener('update_friend_requests', handleLocalUpdate);
        return () => window.removeEventListener('update_friend_requests', handleLocalUpdate);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user?.id]);

    // ✨✨✨ 改动点：连接到专属的 /friends WebSocket 命名空间，并传入 userId ✨✨✨
    useEffect(() => {
        if (!user?.id) return;

        console.log('🔌 Navbar 正在连接 /friends WebSocket...');
        const socket = io('/friends', {
            query: { userId: user.id }, // 传递 userId，让后端将其加入专属房间
            transports: ['websocket'],
        });

        socket.on('connect', () => {
            console.log('✅ Navbar /friends WebSocket 连接成功! ID:', socket.id);
        });

        // 监听后端 FriendGateway 推送的 friendRequest 事件
        socket.on('friendRequest', (notification: { type: string; payload: Record<string, any> }) => {
            console.log('📩 Navbar 收到好友实时通知:', notification);
            
            if (notification.type === 'FRIEND_REQUEST') {
                console.log('🔔 收到新的好友邀请，正在刷新 Navbar 红点!');
                fetchCount();
            }
        });

        return () => {
            console.log('❌ Navbar /friends WebSocket 断开连接');
            socket.disconnect();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user?.id]);

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
                    <NavLink to="/calendar" className={linkClass}>Calendar</NavLink>

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
                    <Avatar src={user?.avatarUrl ? user.avatarUrl : undefined} size={70} />
                </NavLink>
            ) : (
                <NavLink to="/signin" className={buttonClass("primary", "md", "ml-7")}>Login</NavLink>
            )}
        </nav>
    );
}

export default Navbar;