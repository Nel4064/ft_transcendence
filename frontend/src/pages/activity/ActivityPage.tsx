import { useEffect } from 'react';
import { useActivityFeed } from './activity.ts';
import { useAuth } from '../../context/AuthContext';

function ActivityPage() {
    const notifications = useActivityFeed();
    const { apiFetch } = useAuth();

    // 💡 核心实现：当用户离开（卸载）这个页面时，自动向后端请求删除/清空通知
    useEffect(() => {
        return () => {
            // 离开页面时触发清理请求
            async function clearNotifications() {
                try {
                    // 请根据你们后端实际的清空/删除路由修改路径
                    // 例如：await apiFetch('/api/activity', { method: 'DELETE' });
                    // 或者如果你的路由是 read-all：
                    await apiFetch('/api/activity/read-all', { method: 'PATCH' });
                    console.log("🧹 离开页面，通知已自动清除");
                } catch (err) {
                    console.error("Failed to clear notifications on leave", err);
                }
            }
            clearNotifications();
        };
    }, [apiFetch]);

    return (
        <main className="max-w-[1200px] mx-auto py-12 px-10">
            <section>
                <h1 className="text-title font-bold mb-6">Activity</h1>
                
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
            </section>
        </main>
    );
}

export default ActivityPage;