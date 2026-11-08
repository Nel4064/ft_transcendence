import { useEffect, useState, useRef } from 'react';
import { useActivityFeed, triggerActivityRefetch } from './activity.ts';
import { useAuth } from '../../context/AuthContext';

function ActivityPage() {
    const notifications = useActivityFeed();
    const { apiFetch } = useAuth();
    
    const [displayList, setDisplayList] = useState<any[]>([]);
    
    // 用一个 ref 记录当前页面是否有未读通知需要被清理
    const hasUnread = notifications.length > 0;
    const hasUnreadRef = useRef(hasUnread);
    hasUnreadRef.current = hasUnread;

    // 1. 进页面时，正常展示未读通知，你可以看个清清楚楚
    useEffect(() => {
        setDisplayList(notifications);
    }, [notifications]);

    // 2. 💡 核心大招：当组件即将卸载（也就是你点击导航栏离开这个页面时），触发已读和 Navbar 归零！
    useEffect(() => {
        return () => {
            // 只有当离开时确实还有未读内容，才去调接口标记已读
            if (hasUnreadRef.current) {
                apiFetch('/api/activity/read-all', { method: 'PATCH' })
                    .then(() => {
                        triggerActivityRefetch(); // 通知 Navbar 瞬间归零
                    })
                    .catch(err => {
                        console.error("Failed to mark as read on leave", err);
                    });
            }
        };
    }, [apiFetch]);

    return (
        <main className="max-w-[1200px] mx-auto py-12 px-10">
            <section>
                <h1 className="text-title font-bold mb-6">Activity</h1>
                
                <ul className="space-y-3">
                    {displayList.length === 0 ? (
                        <p className="text-gray-500">No notifications yet.</p>
                    ) : (
                        displayList.map((n, index) => {
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
            </section>
        </main>
    );
}

export default ActivityPage;