import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Shield, Ban, Film, CalendarClock, Trash2, ShieldAlert } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import Avatar from '../../components/Avatar/Avatar'; // 请确认 Avatar 组件的相对路径是否正确

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
    const navigate = useNavigate();
    const [users, setUsers] = useState<UserStat[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [roleFilter, setRoleFilter] = useState<'ALL' | Role>('ALL');

    const { user } = useAuth();
    const CURRENT_USER_ID = user?.id;

    // 统一请求头辅助函数
    const getAuthHeaders = (includeJson = false) => {
        const headers: Record<string, string> = {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
        };
        if (includeJson) {
            headers['Content-Type'] = 'application/json';
        }
        return headers;
    };

    // 拉取成员列表
    useEffect(() => {
        const fetchMembers = async () => {
            try {
                const response = await fetch('/api/users/admin/manage-members', {
                    headers: getAuthHeaders(),
                });
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                const data = await response.json();
                setUsers(data);
            } catch (error) {
                console.error('Failed to fetch members', error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchMembers();
    }, []);

    // --- 操作函数 ---
    const handleMakeAdmin = async (id: string) => {
        if (!window.confirm('Are you sure you want to promote this user to Admin?')) return;

        try {
            const response = await fetch(`/api/users/admin/${id}/role`, {
                method: 'PATCH',
                headers: getAuthHeaders(true),
                body: JSON.stringify({ role: 'ADMIN' }),
            });
            if (!response.ok) throw new Error('Failed to promote user');
            setUsers(users.map(u => (u.id === id ? { ...u, role: 'ADMIN' } : u)));
        } catch (error) {
            console.error(error);
            alert('Failed to promote user to Admin.');
        }
    };

    const handleRemove = async (id: string) => {
        if (!window.confirm('Are you sure you want to remove this user from the club?')) return;

        try {
            const response = await fetch(`/api/users/admin/${id}`, {
                method: 'DELETE',
                headers: getAuthHeaders(),
            });
            if (!response.ok) throw new Error('Failed to remove user');
            setUsers(users.filter(u => u.id !== id));
        } catch (error) {
            console.error(error);
            alert('Failed to remove user.');
        }
    };

    const handleBan = async (id: string) => {
        if (!window.confirm('Are you sure you want to ban this user?')) return;

        try {
            const response = await fetch(`/api/users/admin/${id}/ban`, {
                method: 'POST',
                headers: getAuthHeaders(),
            });
            if (!response.ok) throw new Error('Failed to ban user');
            setUsers(users.filter(u => u.id !== id));
        } catch (error) {
            console.error(error);
            alert('Failed to ban user.');
        }
    };

    // 辞职（自我降级）与最后一名管理员保护逻辑
    const handleResign = async (id: string) => {
        const adminCount = users.filter(u => u.role === 'ADMIN').length;

        if (adminCount <= 1) {
            alert('⚠️ You are the last admin in the club! Please promote another member to Admin before resigning.');
            return;
        }

        if (!window.confirm('Are you sure you want to remove your own Admin rights? You will lose access to this dashboard.')) return;

        try {
            const response = await fetch(`/api/users/admin/${id}/resign`, {
                method: 'POST',
                headers: getAuthHeaders(),
            });
            if (!response.ok) throw new Error('Failed to resign');
            setUsers(users.map(u => (u.id === id ? { ...u, role: 'MEMBER' } : u)));
        } catch (error) {
            console.error(error);
            alert('Failed to resign.');
        }
    };

    // --- 过滤逻辑 ---
    const filteredUsers = users.filter(u => {
        const matchesSearch =
            u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
            u.handle.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesRole = roleFilter === 'ALL' || u.role === roleFilter;
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
                            {filteredUsers.map((member) => (
                                <tr key={member.id} className="hover:bg-stone-50/50 transition-colors">
                                    {/* 用户信息（点击头像或用户名跳转 Profile） */}
                                    <td className="py-4 px-6">
                                        <div className="flex items-center gap-3">
                                            <div
                                                onClick={() => navigate(`/users/${member.id}`)}
                                                className="cursor-pointer hover:opacity-80 transition-opacity shrink-0"
                                                title="Click to view profile"
                                            >
                                                <Avatar src={member.avatar} name={member.username} size={40} />
                                            </div>
                                            <div>
                                                <p
                                                    onClick={() => navigate(`/users/${member.id}`)}
                                                    className="font-semibold text-stone-900 cursor-pointer hover:underline"
                                                    title="Click to view profile"
                                                >
                                                    {member.username}
                                                </p>
                                                <p className="text-sm text-stone-500">{member.handle}</p>
                                            </div>
                                        </div>
                                    </td>

                                    {/* 角色 */}
                                    <td className="py-4 px-6">
                                        <span
                                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                                                member.role === 'ADMIN'
                                                    ? 'bg-amber-100 text-amber-800'
                                                    : 'bg-stone-100 text-stone-700'
                                            }`}
                                        >
                                            {member.role === 'ADMIN' && <Shield className="w-3.5 h-3.5" />}
                                            {member.role === 'ADMIN' ? 'Admin' : 'Member'}
                                        </span>
                                    </td>

                                    {/* 加入时间 */}
                                    <td className="py-4 px-6 text-sm text-stone-600">
                                        {member.joinedDate}
                                    </td>

                                    {/* 活跃度 (RSVPs) */}
                                    <td className="py-4 px-6">
                                        <div className="flex flex-col gap-1 text-sm">
                                            <span className="flex items-center gap-1.5 text-stone-700">
                                                <Film className="w-4 h-4 text-stone-400" />
                                                {member.rsvps.attended} Attended
                                            </span>
                                            <span className="flex items-center gap-1.5 text-stone-500">
                                                <CalendarClock className="w-4 h-4 text-stone-400" />
                                                {member.rsvps.upcoming} Upcoming
                                            </span>
                                        </div>
                                    </td>

                                    {/* 操作按钮组 */}
                                    <td className="py-4 px-6">
                                        <div className="flex items-center justify-end gap-2">
                                            {member.role === 'ADMIN' ? (
                                                member.id === CURRENT_USER_ID ? (
                                                    <button
                                                        onClick={() => handleResign(member.id)}
                                                        className="text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg transition-colors"
                                                    >
                                                        Resign (Remove my Admin)
                                                    </button>
                                                ) : (
                                                    <span className="text-xs text-stone-400 italic px-3 py-1.5">
                                                        Cannot edit co-admin
                                                    </span>
                                                )
                                            ) : (
                                                <>
                                                    <button
                                                        onClick={() => handleMakeAdmin(member.id)}
                                                        className="text-stone-600 hover:text-stone-900 bg-stone-100 hover:bg-stone-200 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
                                                    >
                                                        Make Admin
                                                    </button>
                                                    <button
                                                        onClick={() => handleBan(member.id)}
                                                        className="p-1.5 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                        title="Ban User"
                                                    >
                                                        <Ban className="w-5 h-5" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleRemove(member.id)}
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