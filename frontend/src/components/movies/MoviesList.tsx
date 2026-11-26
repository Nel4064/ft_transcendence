import MoviesCard from './MoviesCard'
import defaultMovie from '../../assets/default-movie.jpg'
import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { normalizeTitle } from '../../utils/normalizeTitle'
import { getLocalizedValue } from '../../utils/localizedValue'
import { apiFetch } from '../../context/AuthContext'
import Button from '../button/Button'

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

// 模块级缓存，翻页或返回列表时不用重复请求 TMDB
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
	const { t, i18n } = useTranslation()
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

	// 所有去重片名（用于按 genre 筛选时补全未缓存的电影元数据）
	const allUniqueTitles = Array.from(new Set(rows.map((r) => r.filmtitle)))

	const totalPages = perPage ? Math.max(1, Math.ceil(uniqueMovies.length / perPage)) : 1
	const page = rows.length > 0 ? Math.min(rawPage, totalPages) : rawPage
	const visible = perPage ? uniqueMovies.slice((page - 1) * perPage, page * perPage) : uniqueMovies

	// 按 genre 筛选时拉取所有去重影片的元数据；其他模式只拉当前页
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
					// 忽略单条失败，保留原标题
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
			{perPage && totalPages > 1 && (
				<div className="col-span-full flex items-center justify-center gap-4 mt-4">
					<Button variant="admin" onClick={() => setPage(page - 1)} disabled={page === 1}>
						{t('selectMovies.pagination.previous')}
					</Button>
					<span>{t('selectMovies.pagination.pageInfo', { page, totalPages })}</span>
					<Button variant="admin" onClick={() => setPage(page + 1)} disabled={page === totalPages}>
						{t('selectMovies.pagination.next')}
					</Button>
				</div>
			)}
		</>
	)
}

export default MoviesList