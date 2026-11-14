import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import defaultMovie from '../../assets/default-movie.jpg'
import { normalizeTitle } from '../../utils/normalizeTitle'
import { apiFetch } from '../../context/AuthContext'
import Button from '../../components/button/Button'
import Icon from '../../components/Icon/Icon'

const FEED_URL = 'https://datacinesindes.fr/data-fair/api/v1/datasets/programmation-cinemas/lines'

type Screening = {
	showid: string
	cineid: number
	filmtitle: string
	showstart: string
	cinenom: string
	cineville: string
	filmposter?: string
	filmstoryline?: string
	filmtrailer?: string

}

const posterClass = "w-64 shrink-0 self-start rounded-md shadow-card"
const titleClass = "mb-4 font-serif font-bold text-title text-text"
const synopsisClass = "text-body text-text-muted"
const sectionTitleClass = "mb-4 font-serif font-bold text-section text-text"
const rowClass = "flex items-center justify-between gap-4 p-4 bg-surface border border-border rounded-lg shadow-card"
const boxClass = "p-4 bg-surface border border-border rounded-lg shadow-card"

function MovieDetailsPage() {
	const { title = '' } = useParams()
	const [screenings, setScreenings] = useState<Screening[]>([])
	const [created, setCreated] = useState<Set<string>>(new Set())

	// Le backend récupère lui-même les infos de la séance dans le flux à partir de (cineid, showid).
	// Si l'event existe déjà, on le supprime.
	async function toggleEvent(s: Screening) {
		const key = `${s.cineid}-${s.showid}`
		try {
			if (created.has(key)) {
				await apiFetch(`/screenings/${s.cineid}/${encodeURIComponent(s.showid)}`, { method: 'DELETE' })
				setCreated((prev) => {
					const next = new Set(prev)
					next.delete(key)
					return next
				})
			} else {
				await apiFetch('/screenings', {
					method: 'POST',
					body: JSON.stringify({ cineid: s.cineid, showid: s.showid }),
				})
				setCreated((prev) => new Set(prev).add(key))
			}
		} catch (err) {
			alert(`Could not update event: ${(err as Error).message}`)
		}
	}

	// Events déjà créés, pour que le bouton soit dans le bon état au chargement.
	useEffect(() => {
		apiFetch('/screenings')
			.then((list: { externalCinemaId: number, externalShowId: string }[]) =>
				setCreated(new Set(list.map((e) => `${e.externalCinemaId}-${e.externalShowId}`))))
			.catch(() => {})
	}, [])

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
	const synopsis = first.filmstoryline && first.filmstoryline !== 'null' ? first.filmstoryline : null
	const trailer = first.filmtrailer?.startsWith('https://') ? first.filmtrailer : null

	return (
		<main className="max-w-[1000px] mx-auto py-12 px-10">
			<section className="flex flex-col md:flex-row gap-8 mb-12">
				<img src={poster} alt={first.filmtitle} className={posterClass} />
				<div>
					<h1 className={titleClass}>{first.filmtitle}</h1>
					<p className={synopsisClass}>{synopsis ?? 'No synopsis available.'}</p>
					{trailer && (
						<section className="mt-6">
							<h2 className={sectionTitleClass}>Trailer</h2>
							<div className={boxClass}>
								<video src={trailer} controls className="w-full rounded-md" />
							</div>
						</section>)}
				</div>
			</section>

			<h2 className={sectionTitleClass}>Upcoming screenings</h2>
			<ul className="flex flex-col gap-4">
				{screenings.map((s) => (
					<li key={`${s.cineid}-${s.showid}`} className={rowClass}>
						<div>
							<p className="flex gap-2 text-body text-text">
								<Icon name="calendar-event" />
								{new Date(s.showstart).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
							</p>
							<p className="flex gap-2 text-small text-text-muted">
								<Icon name="map-pin" />
								{s.cineville} · {s.cinenom}
							</p>
						</div>
						<Button variant="admin" size="lg" onClick={() => toggleEvent(s)}>
							{created.has(`${s.cineid}-${s.showid}`) ? 'Remove Event' : 'Create Event'}
						</Button>
					</li>
				))}
			</ul>
		</main>
	)
}

export default MovieDetailsPage
