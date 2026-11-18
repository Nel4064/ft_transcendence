import { useState, useEffect } from 'react';
import { Search, Shield, Ban, Film, CalendarClock, Trash2, ShieldAlert } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

// --- 类型定义 ---
type Role = 'ADMIN' | 'MEMBER';

interface UserStat {
    id: string;
    username: string;
    handle: string;
    avatar: string;
    role: Role;
    joinedDate: string;
    rsvps: {
        attended: number;
        upcoming: number;
    };
}

export default function AdminDashboard() {
    // 🌟 1. 状态管理升级：加入 loading 状态，默认用户列表为空
    const [users, setUsers] = useState<UserStat[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [roleFilter, setRoleFilter] = useState<'ALL' | Role>('ALL');

    // 🌟 2. 假设你有一个全局的 Auth 钩子来获取当前登录的管理员 ID
    const { user } = useAuth();
    const CURRENT_USER_ID = user?.id;


    // 🌟 3. 接入刚才写的 NestJS 后端接口
    useEffect(() => {
        const fetchMembers = async () => {
            try {
                const response = await fetch('/api/users/admin/manage-members', { // 确认路径是否带 /api
                    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
                });
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                const data = await response.json();
                setUsers(data);
            } catch (error) {
                console.error("Failed to fetch members", error);
            } finally {
                // 🌟 关键：放在 finally 里，无论成功失败都会关闭 Loading
                setIsLoading(false);
            }
        };
        fetchMembers();
    }, []);

    // --- 真实操作函数 (接入 API) ---
    const handleMakeAdmin = async (id: string) => {
        if (!window.confirm('Are you sure you want to promote this user to Admin?')) return;

        // 🌟 发送请求给后端
        await fetch(`api/users/admin/${id}/role`, { method: 'PATCH', body: JSON.stringify({ role: 'ADMIN' }) });

        setUsers(users.map(u => u.id === id ? { ...u, role: 'ADMIN' } : u));
    };

    const handleRemove = async (id: string) => {
        if (!window.confirm('Are you sure you want to remove this user from the club?')) return;
        await fetch(`api/users/admin/${id}`, { method: 'DELETE' });
        setUsers(users.filter(u => u.id !== id));
    };

    const handleBan = async (id: string) => {
        if (!window.confirm('Are you sure you want to ban this user?')) return;
        await fetch(`api/users/admin/${id}/ban`, { method: 'POST' });
        setUsers(users.filter(u => u.id !== id));
    };

    // 🌟 4. 新增：辞职（自我降级）与最后一名管理员保护逻辑
    const handleResign = async (id: string) => {
        const adminCount = users.filter(u => u.role === 'ADMIN').length;

        // 最后一名管理员保护
        if (adminCount <= 1) {
            alert("⚠️ You are the last admin in the club! Please promote another member to Admin before resigning.");
            return;
        }

        if (!window.confirm('Are you sure you want to remove your own Admin rights? You will lose access to this dashboard.')) return;

        await fetch(`api/users/admin/${id}/resign`, { method: 'POST' });
        setUsers(users.map(u => u.id === id ? { ...u, role: 'MEMBER' } : u));
    };

    // --- 过滤逻辑 ---
    const filteredUsers = users.filter(user => {
        const matchesSearch = user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
            user.handle.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesRole = roleFilter === 'ALL' || user.role === roleFilter;
        return matchesSearch && matchesRole;
    });

    if (isLoading) {
        return <div className="min-h-screen flex items-center justify-center text-stone-500">Loading members...</div>;
    }

    return (
        <div className="max-w-6xl mx-auto p-6 bg-stone-50 min-h-screen">
            {/* 头部区域 */}
            <div className="flex items-center justify-between mb-8">
                <h1 className="text-2xl font-bold text-stone-900 flex items-center gap-2">
                    <ShieldAlert className="w-7 h-7 text-stone-700" />
                    Club Administration
                </h1>
                <span className="text-sm font-medium text-stone-500 bg-stone-200 px-3 py-1 rounded-full">
                    Admin Only
                </span>
            </div>

            {/* 搜索与筛选 */}
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
                {/* ... (此处保持你的原生代码不变) ... */}
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
                    <input
                        type="text"
                        placeholder="Search user by name or handle..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-400 bg-white"
                    />
                </div>
                <select
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value as 'ALL' | Role)}
                    className="py-2 px-4 border border-stone-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-stone-400 text-stone-700"
                >
                    <option value="ALL">All Roles</option>
                    <option value="ADMIN">Admins Only</option>
                    <option value="MEMBER">Members Only</option>
                </select>
            </div>

            {/* 用户列表表格 */}
            <div className="bg-white border border-stone-200 rounded-xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-stone-100/50 border-b border-stone-200 text-sm text-stone-500">
                                <th className="py-4 px-6 font-medium">USER INFO</th>
                                <th className="py-4 px-6 font-medium">ROLE</th>
                                <th className="py-4 px-6 font-medium">JOINED DATE</th>
                                <th className="py-4 px-6 font-medium">ACTIVITY (RSVPs)</th>
                                <th className="py-4 px-6 font-medium text-right">ACTIONS</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-100">
                            {filteredUsers.map((user) => (
                                <tr key={user.id} className="hover:bg-stone-50/50 transition-colors">

                                    {/* 用户信息 */}
                                    <td className="py-4 px-6">
                                        <div className="flex items-center gap-3">
                                            <img src={user.avatar} alt={user.username} className="w-10 h-10 rounded-full object-cover bg-stone-200" />
                                            <div>
                                                <p className="font-semibold text-stone-900">{user.username}</p>
                                                <p className="text-sm text-stone-500">{user.handle}</p>
                                            </div>
                                        </div>
                                    </td>

                                    {/* 角色 */}
                                    <td className="py-4 px-6">
                                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${user.role === 'ADMIN' ? 'bg-amber-100 text-amber-800' : 'bg-stone-100 text-stone-700'
                                            }`}>
                                            {user.role === 'ADMIN' && <Shield className="w-3.5 h-3.5" />}
                                            {user.role === 'ADMIN' ? 'Admin' : 'Member'}
                                        </span>
                                    </td>

                                    {/* 加入时间 */}
                                    <td className="py-4 px-6 text-sm text-stone-600">
                                        {user.joinedDate}
                                    </td>

                                    {/* 活跃度 (RSVPs) */}
                                    <td className="py-4 px-6">
                                        <div className="flex flex-col gap-1 text-sm">
                                            <span className="flex items-center gap-1.5 text-stone-700">
                                                <Film className="w-4 h-4 text-stone-400" />
                                                {user.rsvps.attended} Attended
                                            </span>
                                            <span className="flex items-center gap-1.5 text-stone-500">
                                                <CalendarClock className="w-4 h-4 text-stone-400" />
                                                {user.rsvps.upcoming} Upcoming
                                            </span>
                                        </div>
                                    </td>

                                    {/* 操作按钮组 */}
                                    <td className="py-4 px-6">
                                        <div className="flex items-center justify-end gap-2">
                                            {user.role === 'ADMIN' ? (
                                                user.id === CURRENT_USER_ID ? (
                                                    // 🌟 5. 绑定新的 handleResign 事件
                                                    <button
                                                        onClick={() => handleResign(user.id)}
                                                        className="text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg transition-colors"
                                                    >
                                                        Resign (Remove my Admin)
                                                    </button>
                                                ) : (
                                                    <span className="text-xs text-stone-400 italic px-3 py-1.5">Cannot edit co-admin</span>
                                                )
                                            ) : (
                                                <>
                                                    <button
                                                        onClick={() => handleMakeAdmin(user.id)}
                                                        className="text-stone-600 hover:text-stone-900 bg-stone-100 hover:bg-stone-200 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
                                                    >
                                                        Make Admin
                                                    </button>
                                                    <button
                                                        onClick={() => handleBan(user.id)}
                                                        className="p-1.5 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                        title="Ban User"
                                                    >
                                                        <Ban className="w-5 h-5" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleRemove(user.id)}
                                                        className="p-1.5 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                        title="Remove User"
                                                    >
                                                        <Trash2 className="w-5 h-5" />
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </td>

                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {/* 空状态处理 */}
                    {filteredUsers.length === 0 && (
                        <div className="text-center py-12 text-stone-500">
                            No users found matching your criteria.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}