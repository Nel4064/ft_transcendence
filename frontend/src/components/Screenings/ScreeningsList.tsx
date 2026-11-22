import { useEffect, useState } from 'react'
import ScreeningsCard from './ScreeningsCard'
import EmptyState from '../EmptyState/EmptyState'
import defaultMovie from '../../assets/default-movie.jpg'
import { apiFetch } from '../../context/AuthContext'

type Screening = {
	startsAt: string | number | Date
	id: string
	filmTitle: string
	posterUrl: string | null
}

interface ScreeningsListProps {
	upcomingOnly?: boolean
}

function ScreeningsList({ upcomingOnly = false }: ScreeningsListProps) {
	const [screenings, setScreenings] = useState<Screening[]>([])

	useEffect(() => {
		apiFetch('/screenings')
			.then((data: Screening[]) => {
				if (!upcomingOnly) {
					setScreenings(data)
					return
				}

				const now = Date.now()
				const filtered = data
					.filter((s) => new Date(s.startsAt).getTime() >= now)
					.sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime())

				setScreenings(filtered)
			})
			.catch(() => setScreenings([]))
	}, [upcomingOnly])

	if (screenings.length === 0)
		return (
			<EmptyState
				message={upcomingOnly ? "No upcoming screenings yet." : "No screenings yet."}
			/>
		)

	return (
		<div className="flex flex-row gap-6 overflow-x-auto pb-4 snap-x">
			{screenings.map((s) => (
				<ScreeningsCard
					key={s.id}
					id={s.id}
					movie={s.filmTitle}
					image={s.posterUrl ?? defaultMovie}
				/>
			))}
		</div>
	)
}

export default ScreeningsList
