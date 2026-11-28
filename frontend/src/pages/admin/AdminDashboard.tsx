import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../context/AuthContext'
import AvatarLink from '../../components/Avatar/AvatarLink'
import Icon from '../../components/Icon/Icon'
import Heading from '../../components/Heading/Heading'
import RoleBadge from '../../components/Badge/RoleBadge'
import Input from '../../components/Input/Input'
import Select from '../../components/Select/Select'
import Button from '../../components/button/Button'
import Loader from '../../components/Loader/Loader'
import EmptyState from '../../components/EmptyState/EmptyState'
import Pagination from '../../components/Pagination/Pagination'
import {
	getAdminMembers,
	updateMemberRole,
	removeMember,
	resignAdmin,
} from '../../api/admin'

const PAGE_SIZE = 10

type Role = 'ADMIN' | 'USER'
type Filter = 'ALL' | Role
type Action = 'makeAdmin' | 'remove' | 'resign'

interface UserStat {
	id: string
	username: string
	handle: string
	avatar: string | null
	role: Role
	joinedDate: string
	rsvps: { attended: number; upcoming: number }
}

const cellClass = 'py-4 px-6'

export default function AdminDashboard() {
	const { t } = useTranslation()
	const navigate = useNavigate()
	const { user, apiFetch } = useAuth()

	const [users, setUsers] = useState<UserStat[]>([])
	const [isLoading, setIsLoading] = useState(true)
	const [searchQuery, setSearchQuery] = useState('')
	const [filter, setFilter] = useState<Filter>('ALL')
	const [page, setPage] = useState(1)

	useEffect(() => {
		getAdminMembers(apiFetch)
			.then(setUsers)
			.catch((error) => console.error('Failed to fetch members', error))
			.finally(() => setIsLoading(false))
	}, [apiFetch])

	// Shared flow for every action: confirm -> API call -> update the list, or alert on failure
	async function runAction(action: Action, request: () => Promise<unknown>, update: (list: UserStat[]) => UserStat[]) {
		if (!window.confirm(t(`admin.confirm.${action}`))) return false
		try {
			await request()
			setUsers(update)
			return true
		} catch (error) {
			console.error(error)
			alert(t(`admin.errors.${action}`))
			return false
		}
	}

	// Returns a list updater that merges `changes` into the user with this id
	const patch = (id: string, changes: Partial<UserStat>) => (list: UserStat[]) =>
		list.map((u) => (u.id === id ? { ...u, ...changes } : u))

	const handleMakeAdmin = (id: string) =>
		runAction('makeAdmin', () => updateMemberRole(apiFetch, id, 'ADMIN'), patch(id, { role: 'ADMIN' }))
	const handleRemove = (id: string) =>
		runAction('remove', () => removeMember(apiFetch, id), (list) => list.filter((u) => u.id !== id))

	async function handleResign(id: string) {
		if (users.filter((u) => u.role === 'ADMIN').length <= 1) {
			alert(t('admin.errors.lastAdmin'))
			return
		}
		if (await runAction('resign', () => resignAdmin(apiFetch, id), patch(id, { role: 'USER' })))
			navigate('/')
	}

	const query = searchQuery.toLowerCase()
	const filteredUsers = users.filter((u) => {
		const matchesSearch = u.username.toLowerCase().includes(query) || u.handle.toLowerCase().includes(query)
		const matchesFilter =
			filter === 'ALL' || u.role === filter
		return matchesSearch && matchesFilter
	})

	const totalPages = Math.max(1, Math.ceil(filteredUsers.length / PAGE_SIZE))
	const safePage = Math.min(page, totalPages)
	const visibleUsers = filteredUsers.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

	function renderActions(member: UserStat) {
		if (member.role === 'ADMIN') {
			if (member.id !== user?.id)
				return <span className="text-small text-text-light italic">{t('admin.actions.cannotEditCoAdmin')}</span>
			return <Button variant="danger" onClick={() => handleResign(member.id)}>{t('admin.actions.resign')}</Button>
		}
		return (
			<>
				<Button variant="admin" onClick={() => handleMakeAdmin(member.id)}>{t('admin.actions.makeAdmin')}</Button>
				<Button variant="danger" onClick={() => handleRemove(member.id)}>{t('admin.actions.remove')}</Button>
			</>
		)
	}

	if (isLoading) return <Loader text={t('admin.loading')} />

	return (
		<main className="max-w-6xl mx-auto py-12 px-4">
			<Heading className="tracking-tight mb-6">{t('admin.heading')}</Heading>

			<div className="flex flex-col sm:flex-row gap-4 mb-6">
				<Input
					placeholder={t('admin.searchPlaceholder')}
					value={searchQuery}
					onChange={(e) => { setSearchQuery(e.target.value); setPage(1) }}
					className="flex-1"
				/>
				<Select value={filter} onChange={(e) => { setFilter(e.target.value as Filter); setPage(1) }}>
					<option value="ALL">{t('admin.filters.all')}</option>
					<option value="ADMIN">{t('admin.filters.admins')}</option>
					<option value="USER">{t('admin.filters.members')}</option>
				</Select>
			</div>

			{filteredUsers.length === 0 ? (
				<EmptyState message={t('admin.empty')} />
			) : (
				<div className="bg-surface border border-border rounded-lg shadow-card overflow-x-auto">
					<table className="w-full text-left">
						<thead className="text-small text-text-muted">
							<tr>
								<th className={cellClass}>{t('admin.table.users')}</th>
								<th className={cellClass}>{t('admin.table.role')}</th>
								<th className={cellClass}>{t('admin.table.joinedDate')}</th>
								<th className={cellClass}>{t('admin.table.activity')}</th>
								<th className={cellClass}>{t('admin.table.actions')}</th>
							</tr>
						</thead>
						<tbody>
							{visibleUsers.map((member) => (
								<tr key={member.id} className="border-t border-border">
									<td className={cellClass}>
										<div className="flex items-center gap-3">
											<AvatarLink userId={member.id} src={member.avatar} name={member.username} size={40} />
											<div>
												<p className="font-semibold text-text">{member.username}</p>
												<p className="text-small text-text-muted">{member.handle}</p>
											</div>
										</div>
									</td>
									<td className={cellClass}>
										<RoleBadge role={member.role} />
									</td>
									<td className={`${cellClass} text-small text-text-muted`}>{member.joinedDate}</td>
									<td className={`${cellClass} text-small`}>
										<p className="flex items-center gap-1.5 text-text">
											<Icon name="movie" size={16} />
											{t('admin.activity.attended', { count: member.rsvps.attended })}
										</p>
										<p className="flex items-center gap-1.5 text-text-muted">
											<Icon name="calendar-clock" size={16} />
											{t('admin.activity.upcoming', { count: member.rsvps.upcoming })}
										</p>
									</td>
									<td className={cellClass}>
										<div className="flex items-center gap-2">{renderActions(member)}</div>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			)}

			<Pagination page={safePage} totalPages={totalPages} onPageChange={setPage} variant="admin" className="mt-6" />
		</main>
	)
}
