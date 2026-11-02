import { useEffect, useState } from 'react'
import ScreeningsCard from './ScreeningsCard'
import defaultMovie from '../../assets/default-movie.jpg'
import { apiFetch } from '../../context/AuthContext'

type Screening = {
	id: string
	filmTitle: string
	posterUrl: string | null
}

function ScreeningsList() {
	const [screenings, setScreenings] = useState<Screening[]>([])

	useEffect(() => {
		apiFetch('/screenings')
			.then(setScreenings)
			.catch(() => setScreenings([]))
	}, [])

	if (screenings.length === 0)
		return <p className="text-text-muted">No upcoming events yet.</p>

	return (
		<div className="flex flex-row gap-6 overflow-x-auto pb-4 snap-x">
			{screenings.map((s) => (
				<ScreeningsCard key={s.id} id={s.id} movie={s.filmTitle} image={s.posterUrl ?? defaultMovie} />
			))}
		</div>
	)
}

export default ScreeningsList
