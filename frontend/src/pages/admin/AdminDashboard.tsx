import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Search,
    Shield,
    Ban,
    Film,
    CalendarClock,
    Trash2,
    ShieldAlert,
    RotateCcw,
    ChevronLeft,
    ChevronRight,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import Avatar from '../../components/Avatar/Avatar';
import {
    getAdminMembers,
    updateMemberRole,
    removeMember,
    resignAdmin,
    banMember,
    unbanMember,
} from '../../api/admin'; // 如果你的文件名是 admin.ts，请改为 '../../api/admin'

// --- 类型定义（与 Prisma Schema 对齐） ---
type Role = 'ADMIN' | 'USER';

interface UserStat {
    id: string;
    username: string;
    handle: string;
    avatar: string | null;
    role: Role;
    isBanned: boolean;
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
    const [roleFilter, setRoleFilter] = useState<'ALL' | Role | 'BANNED'>('ALL');

    // 分页状态
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);

    const { user, apiFetch } = useAuth();
    const CURRENT_USER_ID = user?.id;

    // 拉取成员列表
    useEffect(() => {
        const fetchMembers = async () => {
            try {
                const data = await getAdminMembers(apiFetch);
                setUsers(data);
            } catch (error) {
                console.error('Failed to fetch members', error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchMembers();
    }, [apiFetch]);

    // 搜索条件、筛选角色或每页数量变化时，重置回第一页
    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery, roleFilter, pageSize]);

    // --- 操作函数 ---
    const handleMakeAdmin = async (id: string) => {
        if (!window.confirm('Are you sure you want to promote this user to Admin?')) return;

        try {
            await updateMemberRole(apiFetch, id, 'ADMIN');
            setUsers(users.map(u => (u.id === id ? { ...u, role: 'ADMIN' } : u)));
        } catch (error) {
            console.error(error);
            alert('Failed to promote user to Admin.');
        }
    };

    const handleRemove = async (id: string) => {
        if (!window.confirm('Are you sure you want to permanently remove this user from the club?')) return;

        try {
            await removeMember(apiFetch, id);
            setUsers(users.filter(u => u.id !== id));
        } catch (error) {
            console.error(error);
            alert('Failed to remove user.');
        }
    };

    const handleBan = async (id: string) => {
        if (!window.confirm('Are you sure you want to ban this user?')) return;

        try {
            await banMember(apiFetch, id);
            setUsers(users.map(u => (u.id === id ? { ...u, isBanned: true } : u)));
        } catch (error) {
            console.error(error);
            alert('Failed to ban user.');
        }
    };

    const handleUnban = async (id: string) => {
        if (!window.confirm('Are you sure you want to unban this user?')) return;

        try {
            await unbanMember(apiFetch, id);
            setUsers(users.map(u => (u.id === id ? { ...u, isBanned: false } : u)));
        } catch (error) {
            console.error(error);
            alert('Failed to unban user.');
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
            await resignAdmin(apiFetch, id);
            setUsers(users.map(u => (u.id === id ? { ...u, role: 'USER' } : u)));
            navigate('/');
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

        const matchesFilter =
            roleFilter === 'ALL'
                ? true
                : roleFilter === 'BANNED'
                ? u.isBanned
                : u.role === roleFilter;

        return matchesSearch && matchesFilter;
    });

    // --- 分页计算逻辑 ---
    const totalItems = filteredUsers.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
    const safeCurrentPage = Math.min(currentPage, totalPages);
    const startIndex = (safeCurrentPage - 1) * pageSize;
    const endIndex = Math.min(startIndex + pageSize, totalItems);
    const paginatedUsers = filteredUsers.slice(startIndex, endIndex);

    // 生成页码按钮列表（页数较多时自动折叠为省略号）
    const getPageNumbers = (): (number | '...')[] => {
        if (totalPages <= 7) {
            return Array.from({ length: totalPages }, (_, i) => i + 1);
        }
        if (safeCurrentPage <= 3) {
            return [1, 2, 3, 4, '...', totalPages];
        }
        if (safeCurrentPage >= totalPages - 2) {
            return [1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
        }
        return [1, '...', safeCurrentPage - 1, safeCurrentPage, safeCurrentPage + 1, '...', totalPages];
    };

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
                        placeholder="Search user by name..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-400 bg-white"
                    />
                </div>
                <select
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value as 'ALL' | Role | 'BANNED')}
                    className="py-2 px-4 border border-stone-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-stone-400 text-stone-700"
                >
                    <option value="ALL">All Users</option>
                    <option value="ADMIN">Admins Only</option>
                    <option value="USER">Members Only</option>
                    <option value="BANNED">Banned Only</option>
                </select>
            </div>

            {/* 用户列表表格 */}
            <div className="bg-white border border-stone-200 rounded-xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-stone-100/50 border-b border-stone-200 text-sm text-stone-500">
                                <th className="py-4 px-6 font-medium">USERS</th>
                                <th className="py-4 px-6 font-medium">ROLE</th>
                                <th className="py-4 px-6 font-medium">JOINED DATE</th>
                                <th className="py-4 px-6 font-medium">ACTIVITY (RSVPs)</th>
                                <th className="py-4 px-6 font-medium text-right">ACTIONS</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-100">
                            {paginatedUsers.map((member) => (
                                <tr
                                    key={member.id}
                                    className={
                                        member.isBanned
                                            ? 'bg-red-50/30 hover:bg-red-50/50 transition-colors'
                                            : 'hover:bg-stone-50/50 transition-colors'
                                    }
                                >
                                    {/* 用户信息 */}
                                    <td className="py-4 px-6">
                                        <div className="flex items-center gap-3">
                                            <div
                                                onClick={() => navigate(`/users/${member.id}`)}
                                                className="cursor-pointer hover:opacity-80 transition-opacity shrink-0"
                                                title="Click to view profile"
                                            >
                                                <Avatar src={member.avatar || undefined} name={member.username} size={40} />
                                            </div>
                                            <div>
                                                <p
                                                    onClick={() => navigate(`/users/${member.id}`)}
                                                    className={`font-semibold cursor-pointer hover:underline ${
                                                        member.isBanned ? 'text-stone-500 line-through' : 'text-stone-900'
                                                    }`}
                                                    title="Click to view profile"
                                                >
                                                    {member.username}
                                                </p>
                                                <p className="text-sm text-stone-500">{member.handle}</p>
                                            </div>
                                        </div>
                                    </td>

                                    {/* 角色与封禁状态 */}
                                    <td className="py-4 px-6">
                                        {member.isBanned ? (
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
                                                <Ban className="w-3.5 h-3.5" />
                                                Banned
                                            </span>
                                        ) : (
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
                                        )}
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
                                            ) : member.isBanned ? (
                                                <>
                                                    <button
                                                        onClick={() => handleUnban(member.id)}
                                                        className="inline-flex items-center gap-1.5 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
                                                    >
                                                        <RotateCcw className="w-4 h-4" />
                                                        Unban
                                                    </button>
                                                    <button
                                                        onClick={() => handleRemove(member.id)}
                                                        className="p-1.5 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                        title="Permanently Remove User"
                                                    >
                                                        <Trash2 className="w-5 h-5" />
                                                    </button>
                                                </>
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
                    {totalItems === 0 && (
                        <div className="text-center py-12 text-stone-500">
                            No users found matching your criteria.
                        </div>
                    )}
                </div>

                {/* 底部分页栏 */}
                {totalItems > 0 && (
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-4 bg-stone-50/70 border-t border-stone-200 text-sm text-stone-600">
                        {/* 左侧：数据统计 + 每页条数切换 */}
                        <div className="flex items-center gap-3">
                            <span>
                                Showing <strong className="font-semibold text-stone-900">{startIndex + 1}</strong> to{' '}
                                <strong className="font-semibold text-stone-900">{endIndex}</strong> of{' '}
                                <strong className="font-semibold text-stone-900">{totalItems}</strong> users
                            </span>
                            <select
                                value={pageSize}
                                onChange={(e) => setPageSize(Number(e.target.value))}
                                className="py-1 px-2 border border-stone-200 rounded-md bg-white text-stone-700 focus:outline-none focus:ring-2 focus:ring-stone-400"
                                aria-label="Rows per page"
                            >
                                <option value={5}>5 / page</option>
                                <option value={10}>10 / page</option>
                                <option value={20}>20 / page</option>
                            </select>
                        </div>

                        {/* 右侧：翻页控件 */}
                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                                disabled={safeCurrentPage === 1}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-stone-200 bg-white text-stone-700 hover:bg-stone-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                            >
                                <ChevronLeft className="w-4 h-4" />
                                Prev
                            </button>

                            {getPageNumbers().map((page, index) =>
                                page === '...' ? (
                                    <span key={`ellipsis-${index}`} className="px-2 py-1 text-stone-400">
                                        ...
                                    </span>
                                ) : (
                                    <button
                                        key={page}
                                        onClick={() => setCurrentPage(page)}
                                        className={`min-w-[34px] px-2.5 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                                            safeCurrentPage === page
                                                ? 'bg-stone-800 text-white'
                                                : 'border border-stone-200 bg-white text-stone-700 hover:bg-stone-100'
                                        }`}
                                    >
                                        {page}
                                    </button>
                                ),
                            )}

                            <button
                                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                                disabled={safeCurrentPage === totalPages}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-stone-200 bg-white text-stone-700 hover:bg-stone-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                            >
                                Next
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}