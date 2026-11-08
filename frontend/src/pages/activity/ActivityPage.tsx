import { useEffect, useState } from 'react';
import { useActivityFeed, triggerActivityRefetch } from './activity.ts';
import { useAuth } from '../../context/AuthContext';

function ActivityPage() {
    const notifications = useActivityFeed();
    const { apiFetch } = useAuth();
    
    // 用本地状态接住当前拉到的通知，防止在标记已读的瞬间页面突然闪烁变空
    const [displayList, setDisplayList] = useState<any[]>([]);

    useEffect(() => {
        if (notifications.length > 0) {
            setDisplayList(notifications);
        }
    }, [notifications]);

    useEffect(() => {
        async function markAsRead() {
            try {
                // 1. 进页面后立刻在后端将它们全部标为已读
                await apiFetch('/api/activity/read-all', { method: 'PATCH' });
                // 2. 强力通知 Navbar 重新拉取数据，红点数字瞬间归零！
                triggerActivityRefetch();
            } catch (err) {
                console.error("Failed to mark as read", err);
            }
        }
        markAsRead();
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