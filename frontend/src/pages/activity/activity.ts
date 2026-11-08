import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from '../../context/AuthContext';

export interface AppNotification {
    id: string;
    userId: string;
    actorId?: string;
    type: string;
    payload: {
        filmTitle: string;
        cinemaName: string;
        [key: string]: string;
    };
    readAt?: string | null;
    createdAt?: string;
    actor?: {
        id: string;
        displayName: string;
        avatarUrl?: string;
    };
}

let refetchListeners: (() => void)[] = [];
export function triggerActivityRefetch() {
    refetchListeners.forEach(listener => listener());
}

export function useActivityFeed() {
    const [notifications, setNotifications] = useState<AppNotification[]>([]);
    const { apiFetch, user } = useAuth();

    const fetchHistory = async () => {
        // 💡 如果用户没登录，直接清空列表返回，避免请求报错
        if (!user) {
            setNotifications([]);
            return;
        }

        try {
            const data = await apiFetch('/api/activity');
            let list = [];
            if (Array.isArray(data)) {
                list = data;
            } else if (data && Array.isArray(data.notifications)) {
                list = data.notifications;
            } else if (data && Array.isArray(data.data)) {
                list = data.data;
            }
            
            // 过滤掉自己发出的和已读的
            const unreadOnly = list.filter((n: AppNotification) => {
                const senderId = n.actor?.id || n.actorId;
                if (user && senderId && String(senderId) === String(user.id)) {
                    return false; 
                }
                if (n.readAt) {
                    return false; 
                }
                return true;
            });

            setNotifications(unreadOnly);
        } catch (err) {
            console.error("Failed to fetch activity history:", err);
        }
    };

    // 💡 关键：把 user 放在依赖项里！
    // 这样当用户一登录（user 从 null 变成有具体对象），或者切换账号时，
    // 它会【立刻、自动】去后端重新拉取最新的未读通知，Navbar 的红点瞬间就会亮起！
    useEffect(() => {
        fetchHistory();

        refetchListeners.push(fetchHistory);
        return () => {
            refetchListeners = refetchListeners.filter(l => l !== fetchHistory);
        };
    }, [apiFetch, user?.id]); // 依赖 user.id，确保登录状态一变就重新拉取

    useEffect(() => {
        if (!user) return;

        const socket = io('/activity');
        socket.on('notification', (n: AppNotification) => {
            const senderId = n.actor?.id || n.actorId;
            if (user && senderId && String(senderId) === String(user.id)) {
                return;
            }
            setNotifications(prev => [n, ...prev]);
        });

        return () => {
            socket.disconnect();
        };
    }, [user]);

    return notifications;
}