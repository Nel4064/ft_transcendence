import MoviesCard from './MoviesCard'
import defaultMovie from '../../assets/default-movie.jpg'
import { useState, useEffect } from 'react'
import { normalizeTitle } from '../../utils/normalizeTitle'
import Button from '../button/Button'

const FEED_URL = 'https://datacinesindes.fr/data-fair/api/v1/datasets/programmation-cinemas/lines'
const DAYS_AHEAD = 7

// Une ligne du flux datacinesindes.fr (mêmes noms que dans curate-organise.ts)
type FeedRow = {
	showid: string
	cineid: number
	filmtitle: string
	showstart: string
	cinenom: string
	cineville: string
	filmposter?: string
}

type MoviesListProps = {
	searchTerm?: string
	filter?: string
	perPage?: number // si défini, active la pagination
}

// "2026-10-20T22:30:00Z" -> "2026-10-21" (jour local, même format que <input type="date">)
function toLocalDay(iso: string) {
	const d = new Date(iso)
	const mm = String(d.getMonth() + 1).padStart(2, '0')
	const dd = String(d.getDate()).padStart(2, '0')
	return `${d.getFullYear()}-${mm}-${dd}`
}

function MoviesList({ searchTerm = '', filter = 'title', perPage }: MoviesListProps) {
	const [rows, setRows] = useState<FeedRow[]>([])
	const [page, setPage] = useState(1)

	// Nouvelle recherche -> retour à la page 1
	useEffect(() => { setPage(1) }, [searchTerm, filter])

	useEffect(() => {
		const now = new Date()
		const end = new Date(now.getTime() + DAYS_AHEAD * 24 * 3600 * 1000)
		const url =
			`${FEED_URL}?size=500` +
			`&select=showid,cineid,filmtitle,showstart,cinenom,cineville,filmposter` +
			`&sort=showstart` +
			`&showstart_gte=${encodeURIComponent(now.toISOString())}` +
			`&showstart_lte=${encodeURIComponent(end.toISOString())}` +
			`&cinecp_starts=75`

		fetch(url)
			.then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json() })
			.then((data) => setRows((data.results ?? []).filter((r: FeedRow) => r.filmtitle && r.showstart)))
			.catch((err) => console.error('Failed to load feed:', err))
	}, [])

	const term = searchTerm.toLowerCase()
	const filtered = rows.filter((r) => {
		if (term === '') return true
		if (filter === 'title') return r.filmtitle.toLowerCase().includes(term)
		if (filter === 'cinema') return (r.cinenom ?? '').toLowerCase().includes(term)
		if (filter === 'date') return toLocalDay(r.showstart) === term
		return true
	})

	// Une seule carte par film : on garde la première séance de chaque titre
	const seen = new Set<string>()
	const uniqueMovies = filtered.filter((r) => {
		const key = normalizeTitle(r.filmtitle)
		if (seen.has(key)) return false
		seen.add(key)
		return true
	})

	const totalPages = perPage ? Math.max(1, Math.ceil(uniqueMovies.length / perPage)) : 1
	const visible = perPage ? uniqueMovies.slice((page - 1) * perPage, page * perPage) : uniqueMovies

	return (
		<>
			{visible.map((r) => (
				<MoviesCard
					key={r.filmtitle}
					movie={r.filmtitle}
					image={r.filmposter?.startsWith('https://') ? r.filmposter : defaultMovie}
				/>
			))}
			{perPage && totalPages > 1 && (
				<div className="col-span-full flex items-center justify-center gap-4 mt-4">
					<Button variant="admin" onClick={() => setPage(page - 1)} disabled={page === 1}>Previous</Button>
					<span>Page {page} / {totalPages}</span>
					<Button variant="admin" onClick={() => setPage(page + 1)} disabled={page === totalPages}>Next</Button>
				</div>
			)}
		</>
	)
}

export default MoviesList
