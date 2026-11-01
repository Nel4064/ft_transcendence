import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import defaultMovie from '../../assets/default-movie.jpg'
import { normalizeTitle } from '../../utils/normalizeTitle'

const FEED_URL = 'https://datacinesindes.fr/data-fair/api/v1/datasets/programmation-cinemas/lines'

type Screening = {
	showid: string
	cineid: number
	filmtitle: string
	showstart: string
	cinenom: string
	cineville: string
	filmposter?: string
}

function MovieDetailsPage() {
	const { title = '' } = useParams()
	const [screenings, setScreenings] = useState<Screening[]>([])

	useEffect(() => {
		// Séances des 7 prochains jours à Paris, puis on garde celles de ce film.
		// Pas de filmtitle_eq : chaque cinéma écrit le titre à sa façon (majuscules...).
		const now = new Date()
		const end = new Date(now.getTime() + 7 * 24 * 3600 * 1000)
		const url = `${FEED_URL}?size=500&sort=showstart&cinecp_starts=75` +
			`&showstart_gte=${now.toISOString()}&showstart_lte=${end.toISOString()}`

		fetch(url)
			.then((r) => r.json())
			.then((data) => setScreenings((data.results ?? []).filter(
				(s: Screening) => normalizeTitle(s.filmtitle ?? '') === normalizeTitle(title)
			)))
	}, [title])

	if (screenings.length === 0)
		return <main className="py-12 px-10"><p>Loading...</p></main>

	const first = screenings[0]
	const poster = first.filmposter?.startsWith('https://') ? first.filmposter : defaultMovie

	return (
		<main className="max-w-[1000px] mx-auto py-12 px-10">
			<img src={poster} alt={first.filmtitle} className="w-64 rounded-md mb-6" />
			<h1 className="font-serif font-bold text-5xl text-text mb-6">{first.filmtitle}</h1>

			<ul className="flex flex-col gap-4">
				{screenings.map((s) => (
					<li key={`${s.cineid}-${s.showid}`} className="flex items-center justify-between p-4 bg-surface border border-border rounded-lg text-xl text-text-muted">
						<div>
							<p>📅 {new Date(s.showstart).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</p>
							<p>📍 {s.cineville} · {s.cinenom}</p>
						</div>
						<button className="py-2.5 px-3 rounded-md bg-admin hover:bg-admin-hover text-white text-base cursor-pointer">Create Event</button>
					</li>
				))}
			</ul>
		</main>
	)
}

export default MovieDetailsPage
