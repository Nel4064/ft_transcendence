import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import defaultMovie from '../../assets/default-movie.jpg'
import { apiFetch, useAuth } from '../../context/AuthContext'
import Button from '../../components/button/Button'
import Avatar from '../../components/Avatar/Avatar'

// 👇 1. 根据你的后端 Prisma 返回结构，更新好友类型
type Friend = {
	id: string
	username: string // 后端 select: { username: true }
	avatarUrl: string | null
}

type Screening = {
	id: string
	filmTitle: string
	posterUrl: string | null
	startsAt: string
	cinemaName: string
	cinemaAddress: string
	cinemaCity: string
	version: string | null
	externalCinemaId: number
	externalShowId: string
	synopsis: string | null
	trailerUrl: string | null
	// 👇 2. 完全匹配后端组装好的字段
	isGoing?: boolean
	totalGoingCount?: number
	friendsGoingCount?: number
	friendsGoing?: Friend[]
}

const posterClass = "w-64 shrink-0 self-start rounded-md shadow-card"
const titleClass = "mb-4 font-serif font-bold text-title text-text"
const synopsisClass = "text-body text-text-muted"
const sectionTitleClass = "mb-4 font-serif font-bold text-section text-text"
const boxClass = "p-4 bg-surface border border-border rounded-lg shadow-card"

function ScreenDetailsPage() {
	const { id } = useParams()
	const navigate = useNavigate()
	const { user } = useAuth()
	const [screening, setScreening] = useState<Screening | null>(null)

	// 👇 3. 极简的 useEffect：因为后端一次性返回了所有信息，直接查找到对应的排片即可
	useEffect(() => {
		apiFetch('/screenings/myrsvps')
			.then((list: Screening[]) => {
				const currentScreening = list.find((s) => s.id === id);
				setScreening(currentScreening ?? null);
			})
			.catch(console.error)
	}, [id])

	const handleRsvpClick = async () => {
		if (!screening) return;

		const newIsGoing = !screening.isGoing;
		const currentCount = screening.totalGoingCount || 0;

		setScreening({
			...screening,
			isGoing: newIsGoing,
			totalGoingCount: newIsGoing ? currentCount + 1 : currentCount - 1
		});

		try {
			await apiFetch(`/screenings/${screening.id}/rsvp`, { method: 'POST' });
		} catch (error) {
			setScreening({
				...screening,
				isGoing: !newIsGoing,
				totalGoingCount: newIsGoing ? currentCount - 1 : currentCount + 1
			});
		}
	};

	async function handleRemove() {
		if (!screening) return
		await apiFetch(
			`/screenings/${screening.externalCinemaId}/${encodeURIComponent(screening.externalShowId)}`,
			{ method: 'DELETE' },
		)
		navigate('/')
	}

	if (!screening)
		return <main className="py-12 px-10"><p>Loading...</p></main>

	const start = new Date(screening.startsAt)
	const date = start.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })
	const time = start.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })

	// 获取好朋友列表，如果没有则为空数组
	const friendsList = screening.friendsGoing || [];

	return (
		<main className="max-w-[1000px] mx-auto py-12 px-10">
			<section className="flex flex-col md:flex-row gap-8 mb-12">
				<img src={screening.posterUrl ?? defaultMovie} alt={screening.filmTitle} className={posterClass} />
				<div>
					<h1 className={titleClass}>{screening.filmTitle}</h1>
					<p className={synopsisClass}>{screening.synopsis ?? 'No synopsis available.'}</p>
					{screening.trailerUrl && (
						<section className="mt-6">
							<h2 className={sectionTitleClass}>Trailer</h2>
							<div className={boxClass}>
								<video src={screening.trailerUrl} controls className="w-full rounded-md" />
							</div>
						</section>
					)}
				</div>
			</section>

			<ul className="flex flex-col gap-4 mt-6">
				<li key={screening.id} className="flex items-center justify-between p-4 bg-surface border border-border rounded-lg text-body text-text-muted">
					<div>
						<p className="text-body text-text font-medium">{date} at {time}{screening.version && ` · ${screening.version}`}</p>
						<p className="text-body text-text-muted mt-1">{screening.cinemaName} · {screening.cinemaAddress}, {screening.cinemaCity}</p>
						<p className="text-sm text-gray-400 mt-1">{(screening.totalGoingCount || 0)} going</p>
					</div>

					<button
						onClick={handleRsvpClick}
						className={`ml-4 px-6 py-2 text-[14px] font-semibold rounded-xl transition-colors shrink-0 ${screening.isGoing
								? 'bg-[#dcfce7] text-[#166534] border border-transparent'
								: 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
							}`}
					>
						{screening.isGoing ? 'Going ✓' : 'RSVP'}
					</button>
				</li>

				{/* 👇 4. 直接使用 screening 数据里的 friendsGoing 进行渲染 */}
				<li className="flex items-center justify-between p-4 bg-surface border border-border rounded-lg text-body text-text-muted ">
					<div>
						<p className="text-body text-text font-medium">
							{friendsList.length > 0 ? `${friendsList.length} friends going :` : 'No friends going yet'}
						</p>
						<ul className="flex flex-wrap gap-2 mt-3">
							{friendsList.map((friend) => (
								<li key={friend.id} title={friend.username}>
									{/* 👇 使用 Link 包裹，跳转到对应的 profile 页面 */}
									<Link
										to={`/users/${friend.id}`} // ⚠️ 请把这里的路径换成你实际的主页路由！
										className="block hover:opacity-80 hover:scale-105 transition-all duration-200 cursor-pointer"
									>
										<Avatar
											name={friend.username}
											src={friend.avatarUrl}
											size={40}
										/>
									</Link>
								</li>
							))}
						</ul>
					</div>
				</li>

				<div className={boxClass}>
					add chat here
				</div>
			</ul>

			{user?.role === 'ADMIN' && (
				<div className="flex justify-end mt-4">
					<Button variant="admin" size="lg" onClick={handleRemove}> Remove Event </Button>
				</div>
			)}
		</main>
	)
}

export default ScreenDetailsPage