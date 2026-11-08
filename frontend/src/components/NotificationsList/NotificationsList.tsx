import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from '../../context/AuthContext'; // 请确保路径正确

export interface AppNotification {
    id: string;
    type: string;
    payload: {
        filmTitle: string;
        cinemaName: string;
        [key: string]: string;
    };
    createdAt?: string;
}

export function NotificationsList() {
    const [notifications, setNotifications] = useState<AppNotification[]>([]);
    const { apiFetch } = useAuth();

    useEffect(() => {
        // 1. 页面一加载，先通过 API 获取历史通知列表
        async function loadNotifications() {
            try {
                const res = await apiFetch('/api/notifications');
                if (res.ok) {
                    const data = await res.json();
                    setNotifications(data);
                }
            } catch (err) {
                console.error("Failed to fetch notifications:", err);
            }
        }
        loadNotifications();

        // 2. 建立 Socket.io 实时监听
        const socket = io('/activity'); // 对应后端命名空间

        socket.on('notification', (n: AppNotification) => {
            // 收到新通知时，自动加到列表最顶部
            setNotifications(prev => [n, ...prev]);
        });

        // 3. 组件卸载时断开连接，防止内存泄漏
        return () => {
            socket.disconnect();
        };
    }, [apiFetch]);

    return (
        <ul className="space-y-3">
            {notifications.length === 0 ? (
                <p className="text-gray-500">No notifications yet.</p>
            ) : (
                notifications.map((n, index) => {
                    const label = n.type === 'CLUB_PICK' ? 'New club pick' : 'Pick removed';
                    return (
                        <li key={n.id || index} className="p-4 rounded-lg border bg-white shadow-sm">
                            <p className="font-medium">
                                <span className="text-blue-600 font-semibold">{label}:</span> {n.payload?.filmTitle} 
                                <span className="text-gray-500"> at {n.payload?.cinemaName}</span>
                            </p>
                            <span className="text-xs text-gray-400 block mt-1">
                                {n.createdAt ? new Date(n.createdAt).toLocaleString() : ''}
                            </span>
                        </li>
                    );
                })
            )}
        </ul>
    );
}