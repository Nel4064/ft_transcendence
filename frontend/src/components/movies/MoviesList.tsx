import MoviesCard from './MoviesCard'
import defaultMovie from '../../assets/default-movie.jpg'
import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { normalizeTitle } from '../../utils/normalizeTitle'
import { getLocalizedValue } from '../../utils/localizedValue'
import { apiFetch } from '../../context/AuthContext'
import Pagination from '../Pagination/Pagination'

const FEED_URL = 'https://datacinesindes.fr/data-fair/api/v1/datasets/programmation-cinemas/lines'
const DAYS_AHEAD = 7

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
	perPage?: number
}

// Module-level cache: avoids re-fetching TMDB data when changing page or coming back to the list
const titleCache = new Map<string, Record<string, string>>()
const genreCache = new Map<string, string[]>()

function normalizeGenres(raw: unknown): string[] {
	if (!raw) return []
	if (Array.isArray(raw)) {
		return raw
			.map((item) => (typeof item === 'string' ? item : (item as { name?: string })?.name ?? ''))
			.map((s) => s.trim().toLowerCase())
			.filter(Boolean)
	}
	if (typeof raw === 'string') {
		return raw
			.split(',')
			.map((s) => s.trim().toLowerCase())
			.filter(Boolean)
	}
	return []
}

function toLocalDay(iso: string) {
	const d = new Date(iso)
	const mm = String(d.getMonth() + 1).padStart(2, '0')
	const dd = String(d.getDate()).padStart(2, '0')
	return `${d.getFullYear()}-${mm}-${dd}`
}

function MoviesList({ searchTerm = '', filter = 'title', perPage }: MoviesListProps) {
	const { i18n } = useTranslation()
	const [searchParams, setSearchParams] = useSearchParams()
	const [rows, setRows] = useState<FeedRow[]>([])
	const [translations, setTranslations] = useState<Record<string, Record<string, string>>>({})
	const [genresMap, setGenresMap] = useState<Record<string, string[]>>({})

	const rawPage = Math.max(1, Number(searchParams.get('page')) || 1)

	function setPage(newPage: number) {
		setSearchParams((prev) => {
			const next = new URLSearchParams(prev)
			if (newPage <= 1) {
				next.delete('page')
			} else {
				next.set('page', String(newPage))
			}
			return next
		})
	}

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

	const term = searchTerm.trim().toLowerCase()
	const filtered = rows.filter((r) => {
		if (term === '') return true
		if (filter === 'title') {
			const map = translations[r.filmtitle] ?? titleCache.get(r.filmtitle)
			const localized = getLocalizedValue(map, i18n.language, '')
			return (
				r.filmtitle.toLowerCase().includes(term) ||
				localized.toLowerCase().includes(term)
			)
		}
		if (filter === 'cinema') return (r.cinenom ?? '').toLowerCase().includes(term)
		if (filter === 'date') return toLocalDay(r.showstart) === term
		if (filter === 'genre') {
			const movieGenres = genresMap[r.filmtitle] ?? genreCache.get(r.filmtitle) ?? []
			return movieGenres.includes(term)
		}
		return true
	})

	const seen = new Set<string>()
	const uniqueMovies = filtered.filter((r) => {
		const key = normalizeTitle(r.filmtitle)
		if (seen.has(key)) return false
		seen.add(key)
		return true
	})

	// All unique titles (used to fetch missing movie metadata when filtering by genre)
	const allUniqueTitles = Array.from(new Set(rows.map((r) => r.filmtitle)))

	const totalPages = perPage ? Math.max(1, Math.ceil(uniqueMovies.length / perPage)) : 1
	const page = rows.length > 0 ? Math.min(rawPage, totalPages) : rawPage
	const visible = perPage ? uniqueMovies.slice((page - 1) * perPage, page * perPage) : uniqueMovies

	// When filtering by genre, fetch metadata for all unique movies; otherwise only for the current page
	const targetTitles = filter === 'genre' && term !== ''
		? allUniqueTitles
		: visible.map((r) => r.filmtitle)
	const targetTitlesKey = targetTitles.join('|')

	useEffect(() => {
		let cancelled = false
		const missing = targetTitles.filter(
			(title) => !titleCache.has(title) || !genreCache.has(title)
		)

		if (missing.length === 0) return

		Promise.all(
			missing.map(async (title) => {
				try {
					const data = await apiFetch(`/screenings/translate?title=${encodeURIComponent(title)}`)
					const parsedTranslations = data?.titleTranslations ?? {}
					const parsedGenres = normalizeGenres(data?.genres)
					titleCache.set(title, parsedTranslations)
					genreCache.set(title, parsedGenres)
					return { title, titleTranslations: parsedTranslations, genres: parsedGenres }
				} catch {
					// Ignore a single failure and keep the original title
					return null
				}
			})
		).then((results) => {
			if (cancelled) return
			const nextTranslations: Record<string, Record<string, string>> = {}
			const nextGenres: Record<string, string[]> = {}
			for (const item of results) {
				if (!item) continue
				nextTranslations[item.title] = item.titleTranslations
				nextGenres[item.title] = item.genres
			}
			if (Object.keys(nextTranslations).length > 0) {
				setTranslations((prev) => ({ ...prev, ...nextTranslations }))
			}
			if (Object.keys(nextGenres).length > 0) {
				setGenresMap((prev) => ({ ...prev, ...nextGenres }))
			}
		})

		return () => { cancelled = true }
	}, [targetTitlesKey])

	return (
		<>
			{visible.map((r) => {
				const map = translations[r.filmtitle] ?? titleCache.get(r.filmtitle)
				const displayTitle = getLocalizedValue(map, i18n.language, r.filmtitle)
				return (
					<MoviesCard
						key={r.filmtitle}
						movie={r.filmtitle}
						displayTitle={displayTitle}
						image={r.filmposter?.startsWith('https://') ? r.filmposter : defaultMovie}
					/>
				)
			})}
			{perPage && (
				<Pagination
					page={page}
					totalPages={totalPages}
					onPageChange={setPage}
					variant="admin"
					className="col-span-full"
				/>
			)}
		</>
	)
}

export default MoviesList