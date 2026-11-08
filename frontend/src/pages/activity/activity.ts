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
            
            // 💡 核心过滤：
            // 1. 排除自己发出的 (actor.id === user.id)
            // 2. 只有当 readAt 为空（未读）时，才展示在列表和红点里！
            const unreadOnly = list.filter((n: AppNotification) => {
                const senderId = n.actor?.id || n.actorId;
                if (user && senderId && String(senderId) === String(user.id)) {
                    return false; // 排除自己
                }
                if (n.readAt) {
                    return false; // 排除已读的（看过后就不要再显示了）
                }
                return true;
            });

            setNotifications(unreadOnly);
        } catch (err) {
            console.error("Failed to fetch activity history:", err);
        }
    };

    useEffect(() => {
        fetchHistory();

        refetchListeners.push(fetchHistory);
        return () => {
            refetchListeners = refetchListeners.filter(l => l !== fetchHistory);
        };
    }, [apiFetch, user]);

    useEffect(() => {
        const socket = io('/activity');
        socket.on('notification', (n: AppNotification) => {
            const senderId = n.actor?.id || n.actorId;
            if (user && senderId && String(senderId) === String(user.id)) {
                return; // 自己发的不弹实时推送
            }
            setNotifications(prev => [n, ...prev]);
        });

        return () => {
            socket.disconnect();
        };
    }, [user]);

    return notifications;
}