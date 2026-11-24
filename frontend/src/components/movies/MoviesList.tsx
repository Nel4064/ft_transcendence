import MoviesCard from './MoviesCard'
import defaultMovie from '../../assets/default-movie.jpg'
import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { normalizeTitle } from '../../utils/normalizeTitle'
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

function toLocalDay(iso: string) {
	const d = new Date(iso)
	const mm = String(d.getMonth() + 1).padStart(2, '0')
	const dd = String(d.getDate()).padStart(2, '0')
	return `${d.getFullYear()}-${mm}-${dd}`
}

function MoviesList({ searchTerm = '', filter = 'title', perPage }: MoviesListProps) {
	const { t, i18n } = useTranslation()
	const [rows, setRows] = useState<FeedRow[]>([])
	const [page, setPage] = useState(1)
	const [translations, setTranslations] = useState<Record<string, Record<string, string>>>({})

	const currentLang = i18n.language?.toLowerCase().split('-')[0] || 'en'

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
		if (filter === 'title') {
			const map = translations[r.filmtitle] ?? titleCache.get(r.filmtitle)
			const localized = map?.[currentLang] || (currentLang === 'ch' ? map?.zh : undefined) || ''
			return (
				r.filmtitle.toLowerCase().includes(term) ||
				localized.toLowerCase().includes(term)
			)
		}
		if (filter === 'cinema') return (r.cinenom ?? '').toLowerCase().includes(term)
		if (filter === 'date') return toLocalDay(r.showstart) === term
		return true
	})

	const seen = new Set<string>()
	const uniqueMovies = filtered.filter((r) => {
		const key = normalizeTitle(r.filmtitle)
		if (seen.has(key)) return false
		seen.add(key)
		return true
	})

	const totalPages = perPage ? Math.max(1, Math.ceil(uniqueMovies.length / perPage)) : 1
	const visible = perPage ? uniqueMovies.slice((page - 1) * perPage, page * perPage) : uniqueMovies
	const visibleTitlesKey = visible.map((r) => r.filmtitle).join('|')

	// 只拉取当前页还没缓存过的电影标题翻译
	useEffect(() => {
		let cancelled = false
		const missing = visible
			.map((r) => r.filmtitle)
			.filter((title) => !titleCache.has(title))

		if (missing.length === 0) return

		Promise.all(
			missing.map(async (title) => {
				try {
					const data = await apiFetch(`/screenings/translate?title=${encodeURIComponent(title)}`)
					if (data?.titleTranslations) {
						titleCache.set(title, data.titleTranslations)
						return [title, data.titleTranslations] as const
					}
				} catch {
					// 忽略单条失败，保留原标题
				}
				return null
			})
		).then((results) => {
			if (cancelled) return
			const next: Record<string, Record<string, string>> = {}
			for (const item of results) {
				if (item) next[item[0]] = item[1]
			}
			if (Object.keys(next).length > 0) {
				setTranslations((prev) => ({ ...prev, ...next }))
			}
		})

		return () => { cancelled = true }
	}, [visibleTitlesKey])

	const getLocalizedTitle = (rawTitle: string) => {
		const map = translations[rawTitle] ?? titleCache.get(rawTitle)
		return map?.[currentLang] || (currentLang === 'ch' ? map?.zh : undefined) || rawTitle
	}

	return (
		<>
			{visible.map((r) => (
				<MoviesCard
					key={r.filmtitle}
					movie={r.filmtitle}
					displayTitle={getLocalizedTitle(r.filmtitle)}
					image={r.filmposter?.startsWith('https://') ? r.filmposter : defaultMovie}
				/>
			))}
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