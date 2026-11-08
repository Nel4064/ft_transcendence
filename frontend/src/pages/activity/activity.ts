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

// 💡 用于跨组件通知刷新
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
            console.log("🔍 后端返回的原始 activity 数据:", data); // 👈 看这里打印的 readAt 是什么状态！

            let list = [];
            if (Array.isArray(data)) {
                list = data;
            } else if (data && Array.isArray(data.notifications)) {
                list = data.notifications;
            } else if (data && Array.isArray(data.data)) {
                list = data.data;
            }
            
            //  tạm时先不要过滤，看看所有的 readAt 是 null 还是都有时间
            setNotifications(list);
        } catch (err) {
            console.error("Failed to fetch activity history:", err);
        }
    };

  useEffect(() => {
    fetchHistory();

    // 注册全局刷新监听
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