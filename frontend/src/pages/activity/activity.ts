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
}

let refetchListeners: (() => void)[] = [];
export function triggerActivityRefetch() {
    refetchListeners.forEach(listener => listener());
}

export function useActivityFeed() {
    const [notifications, setNotifications] = useState<AppNotification[]>([]);
    const { apiFetch } = useAuth();

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
            
            // 💡 核心：只把未读的（readAt 为空）拿来展示。
            // 只要在页面里调用了 read-all，它们的 readAt 就会有值，
            // 这样无论你怎么离开、怎么刷新，只要再次拉取，它们就永远不会再出现了！
            const unreadOnly = list.filter((n: AppNotification) => !n.readAt);
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
    }, [apiFetch]);

    useEffect(() => {
        const socket = io('/activity');
        socket.on('notification', (n: AppNotification) => {
            setNotifications(prev => [n, ...prev]);
        });

        return () => {
            socket.disconnect();
        };
    }, []);

    return notifications;
}