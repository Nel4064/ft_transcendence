import { useState } from 'react';
// 建议安装 lucide-react 来使用这些极其干净的图标: npm install lucide-react
import { Search, Shield, Ban, Film, CalendarClock, Trash2, ShieldAlert } from 'lucide-react';

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

// --- 模拟数据 (替换为你的后端 API 请求) ---
const MOCK_USERS: UserStat[] = [
    {
        id: '1',
        username: 'Léa Martin',
        handle: '@leamartin',
        avatar: 'https://i.pravatar.cc/150?u=lea',
        role: 'ADMIN',
        joinedDate: 'Oct 2026',
        rsvps: { attended: 24, upcoming: 3 },
    },
    {
        id: '2',
        username: 'Thomas B.',
        handle: '@thomas_dev',
        avatar: 'https://i.pravatar.cc/150?u=thomas',
        role: 'MEMBER',
        joinedDate: 'Nov 2026',
        rsvps: { attended: 5, upcoming: 1 },
    },
    {
        id: '3',
        username: 'Ghost User',
        handle: '@inactive_user',
        avatar: 'https://i.pravatar.cc/150?u=ghost',
        role: 'MEMBER',
        joinedDate: 'Nov 2026',
        rsvps: { attended: 0, upcoming: 0 },
    },
];

// 假设这是当前登录的管理员 ID (用于判断是否是自己)
const CURRENT_USER_ID = '1';

export default function AdminDashboard() {
    const [users, setUsers] = useState<UserStat[]>(MOCK_USERS);
    const [searchQuery, setSearchQuery] = useState('');
    const [roleFilter, setRoleFilter] = useState<'ALL' | Role>('ALL');

    // --- 模拟操作函数 ---
    const handleMakeAdmin = (id: string) => {
        setUsers(users.map(u => u.id === id ? { ...u, role: 'ADMIN' } : u));
        console.log(`Promoted user ${id} to ADMIN`);
    };

    const handleRemove = (id: string) => {
        setUsers(users.filter(u => u.id !== id));
        console.log(`Removed user ${id}`);
    };

    const handleBan = (id: string) => {
        setUsers(users.filter(u => u.id !== id));
        console.log(`Banned user ${id}`);
    };

    // --- 过滤逻辑 ---
    const filteredUsers = users.filter(user => {
        const matchesSearch = user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
            user.handle.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesRole = roleFilter === 'ALL' || user.role === roleFilter;
        return matchesSearch && matchesRole;
    });

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
                                                // 🌟 核心逻辑：同级防互踢。如果是其他管理员，按钮禁用。如果是自己，可以辞职。
                                                user.id === CURRENT_USER_ID ? (
                                                    <button className="text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg transition-colors">
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