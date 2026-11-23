import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
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
} from '../../api/admin';

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
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [users, setUsers] = useState<UserStat[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [roleFilter, setRoleFilter] = useState<'ALL' | Role | 'BANNED'>('ALL');

    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);

    const { user, apiFetch } = useAuth();
    const CURRENT_USER_ID = user?.id;

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

    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery, roleFilter, pageSize]);

    const handleMakeAdmin = async (id: string) => {
        if (!window.confirm(t('admin.confirm.makeAdmin'))) return;

        try {
            await updateMemberRole(apiFetch, id, 'ADMIN');
            setUsers(users.map(u => (u.id === id ? { ...u, role: 'ADMIN' } : u)));
        } catch (error) {
            console.error(error);
            alert(t('admin.errors.makeAdmin'));
        }
    };

    const handleRemove = async (id: string) => {
        if (!window.confirm(t('admin.confirm.remove'))) return;

        try {
            await removeMember(apiFetch, id);
            setUsers(users.filter(u => u.id !== id));
        } catch (error) {
            console.error(error);
            alert(t('admin.errors.remove'));
        }
    };

    const handleBan = async (id: string) => {
        if (!window.confirm(t('admin.confirm.ban'))) return;

        try {
            await banMember(apiFetch, id);
            setUsers(users.map(u => (u.id === id ? { ...u, isBanned: true } : u)));
        } catch (error) {
            console.error(error);
            alert(t('admin.errors.ban'));
        }
    };

    const handleUnban = async (id: string) => {
        if (!window.confirm(t('admin.confirm.unban'))) return;

        try {
            await unbanMember(apiFetch, id);
            setUsers(users.map(u => (u.id === id ? { ...u, isBanned: false } : u)));
        } catch (error) {
            console.error(error);
            alert(t('admin.errors.unban'));
        }
    };

    const handleResign = async (id: string) => {
        const adminCount = users.filter(u => u.role === 'ADMIN').length;

        if (adminCount <= 1) {
            alert(t('admin.errors.lastAdmin'));
            return;
        }

        if (!window.confirm(t('admin.confirm.resign'))) return;

        try {
            await resignAdmin(apiFetch, id);
            setUsers(users.map(u => (u.id === id ? { ...u, role: 'USER' } : u)));
            navigate('/');
        } catch (error) {
            console.error(error);
            alert(t('admin.errors.resign'));
        }
    };

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

    const totalItems = filteredUsers.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
    const safeCurrentPage = Math.min(currentPage, totalPages);
    const startIndex = (safeCurrentPage - 1) * pageSize;
    const endIndex = Math.min(startIndex + pageSize, totalItems);
    const paginatedUsers = filteredUsers.slice(startIndex, endIndex);

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
        return <div className="min-h-screen flex items-center justify-center text-stone-500">{t('admin.loading')}</div>;
    }

    return (
        <div className="max-w-6xl mx-auto p-6 bg-stone-50 min-h-screen">
            {/* 头部区域 */}
            <div className="flex items-center justify-between mb-8">
                <h1 className="text-2xl font-bold text-stone-900 flex items-center gap-2">
                    <ShieldAlert className="w-7 h-7 text-stone-700" />
                    {t('admin.heading')}
                </h1>
                <span className="text-sm font-medium text-stone-500 bg-stone-200 px-3 py-1 rounded-full">
                    {t('admin.badge')}
                </span>
            </div>

            {/* 搜索与筛选 */}
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
                    <input
                        type="text"
                        placeholder={t('admin.searchPlaceholder')}
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
                    <option value="ALL">{t('admin.filters.all')}</option>
                    <option value="ADMIN">{t('admin.filters.admins')}</option>
                    <option value="USER">{t('admin.filters.members')}</option>
                    <option value="BANNED">{t('admin.filters.banned')}</option>
                </select>
            </div>

            {/* 用户列表表格 */}
            <div className="bg-white border border-stone-200 rounded-xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-stone-100/50 border-b border-stone-200 text-sm text-stone-500">
                                <th className="py-4 px-6 font-medium">{t('admin.table.users')}</th>
                                <th className="py-4 px-6 font-medium">{t('admin.table.role')}</th>
                                <th className="py-4 px-6 font-medium">{t('admin.table.joinedDate')}</th>
                                <th className="py-4 px-6 font-medium">{t('admin.table.activity')}</th>
                                <th className="py-4 px-6 font-medium text-right">{t('admin.table.actions')}</th>
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
                                                title={t('admin.tooltips.viewProfile')}
                                            >
                                                <Avatar src={member.avatar || undefined} name={member.username} size={40} />
                                            </div>
                                            <div>
                                                <p
                                                    onClick={() => navigate(`/users/${member.id}`)}
                                                    className={`font-semibold cursor-pointer hover:underline ${
                                                        member.isBanned ? 'text-stone-500 line-through' : 'text-stone-900'
                                                    }`}
                                                    title={t('admin.tooltips.viewProfile')}
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
                                                {t('admin.roles.banned')}
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
                                                {member.role === 'ADMIN' ? t('admin.roles.admin') : t('admin.roles.member')}
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
                                                {t('admin.activity.attended', { count: member.rsvps.attended })}
                                            </span>
                                            <span className="flex items-center gap-1.5 text-stone-500">
                                                <CalendarClock className="w-4 h-4 text-stone-400" />
                                                {t('admin.activity.upcoming', { count: member.rsvps.upcoming })}
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
                                                        {t('admin.actions.resign')}
                                                    </button>
                                                ) : (
                                                    <span className="text-xs text-stone-400 italic px-3 py-1.5">
                                                        {t('admin.actions.cannotEditCoAdmin')}
                                                    </span>
                                                )
                                            ) : member.isBanned ? (
                                                <>
                                                    <button
                                                        onClick={() => handleUnban(member.id)}
                                                        className="inline-flex items-center gap-1.5 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
                                                    >
                                                        <RotateCcw className="w-4 h-4" />
                                                        {t('admin.actions.unban')}
                                                    </button>
                                                    <button
                                                        onClick={() => handleRemove(member.id)}
                                                        className="p-1.5 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                        title={t('admin.tooltips.permanentlyRemove')}
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
                                                        {t('admin.actions.makeAdmin')}
                                                    </button>
                                                    <button
                                                        onClick={() => handleBan(member.id)}
                                                        className="p-1.5 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                        title={t('admin.tooltips.banUser')}
                                                    >
                                                        <Ban className="w-5 h-5" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleRemove(member.id)}
                                                        className="p-1.5 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                        title={t('admin.tooltips.removeUser')}
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
                            {t('admin.empty')}
                        </div>
                    )}
                </div>

                {/* 底部分页栏 */}
                {totalItems > 0 && (
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-4 bg-stone-50/70 border-t border-stone-200 text-sm text-stone-600">
                        {/* 左侧：数据统计 + 每页条数切换 */}
                        <div className="flex items-center gap-3">
                            <span>
                                {t('admin.pagination.showing', {
                                    start: startIndex + 1,
                                    end: endIndex,
                                    total: totalItems,
                                })}
                            </span>
                            <select
                                value={pageSize}
                                onChange={(e) => setPageSize(Number(e.target.value))}
                                className="py-1 px-2 border border-stone-200 rounded-md bg-white text-stone-700 focus:outline-none focus:ring-2 focus:ring-stone-400"
                                aria-label={t('admin.pagination.rowsPerPage')}
                            >
                                <option value={5}>{t('admin.pagination.perPage', { count: 5 })}</option>
                                <option value={10}>{t('admin.pagination.perPage', { count: 10 })}</option>
                                <option value={20}>{t('admin.pagination.perPage', { count: 20 })}</option>
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
                                {t('admin.pagination.prev')}
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
                                {t('admin.pagination.next')}
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}