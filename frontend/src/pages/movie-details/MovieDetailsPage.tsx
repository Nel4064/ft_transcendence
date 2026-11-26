import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import defaultMovie from '../../assets/default-movie.jpg'
import { normalizeTitle } from '../../utils/normalizeTitle'
import { apiFetch } from '../../context/AuthContext'
import BackButton from '../../components/BackButton/BackButton'
import Button from '../../components/button/Button'
import Icon from '../../components/Icon/Icon'
import Loader from '../../components/Loader/Loader'
import Heading from '../../components/Heading/Heading'

const FEED_URL = 'https://datacinesindes.fr/data-fair/api/v1/datasets/programmation-cinemas/lines'

const LOCALE_MAP: Record<string, string> = {
	en: 'en-GB',
	fr: 'fr-FR',
	zh: 'zh-CN'
}

type Screening = {
	showid: string
	cineid?: number
	filmtitle: string
	showstart: string
	cinenom: string
	cineville: string
	filmposter?: string
	filmstoryline?: string
	filmtrailer?: string
	filmdirector?: string
	filmcast?: string
	filmduration?: number   // en secondes
}

type MovieTranslations = {
	titleTranslations?: Record<string, string> | null
	synopsisTranslations?: Record<string, string> | null
}

const posterClass = "w-64 shrink-0 self-start rounded-md shadow-card"
const synopsisClass = "text-body text-text-muted"
const rowClass = "flex items-center justify-between gap-4 p-4 bg-surface border border-border rounded-lg shadow-card"
const boxClass = "p-4 bg-surface border border-border rounded-lg shadow-card"

function MovieDetailsPage() {
	const { t, i18n } = useTranslation()
	const navigate = useNavigate()
	const { title = '' } = useParams()
	const [screenings, setScreenings] = useState<Screening[]>([])
	const [created, setCreated] = useState<Set<string>>(new Set())
	const [translations, setTranslations] = useState<MovieTranslations | null>(null)

	const currentLang = i18n.language?.split('-')[0] || 'en'
	const dateLocale = LOCALE_MAP[currentLang] || 'en-GB'

	function handleBack() {
		if (window.history.state?.idx > 0) {
			navigate(-1)
		} else {
			navigate('/select-movies')
		}
	}

	async function toggleEvent(s: Screening) {
		const actualCineId = s.cineid || 0
		const key = `${actualCineId}-${s.showid}`

		try {
			if (created.has(key)) {
				await apiFetch(`/screenings/${actualCineId}/${encodeURIComponent(s.showid)}`, { method: 'DELETE' })
				setCreated((prev) => {
					const next = new Set(prev)
					next.delete(key)
					return next
				})
			} else {
				await apiFetch('/screenings', {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json'
					},
					body: JSON.stringify({ cineid: actualCineId, showid: s.showid }),
				})
				setCreated((prev) => new Set(prev).add(key))
			}
		} catch (err) {
			alert(t('movieDetails.errors.updateFailed', { message: (err as Error).message }))
		}
	}

	useEffect(() => {
		apiFetch('/screenings')
			.then((list: { externalCinemaId?: number | null, externalShowId?: string | number }[]) =>
				setCreated(new Set(list.map((e) => `${e.externalCinemaId ?? 0}-${String(e.externalShowId ?? '')}`)))
			)
			.catch(() => { })
	}, [])

	useEffect(() => {
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

	// 拿到电影信息后，向后端请求 TMDB 多语言翻译
	useEffect(() => {
		const first = screenings[0]
		if (!first?.filmtitle) return

		const rawSynopsis = first.filmstoryline && first.filmstoryline !== 'null' ? first.filmstoryline : ''
		const params = new URLSearchParams({
			title: first.filmtitle,
			synopsis: rawSynopsis,
		})

		apiFetch(`/screenings/translate?${params.toString()}`)
			.then((data: MovieTranslations) => setTranslations(data))
			.catch(() => setTranslations(null))
	}, [screenings])

	function formatRuntime(minutes: number) {
		const h = Math.floor(minutes / 60)
		const m = String(minutes % 60).padStart(2, '0')
		return `${h}h${m}`
	}

	const backButton = (
		<div className="mb-6">
			<BackButton label={t('movieDetails.back')} onClick={handleBack} />
		</div>
	)

	if (screenings.length === 0)
		return (
			<main className="max-w-[1000px] mx-auto py-12 px-10">
				{backButton}
				<Loader />
			</main>
		)

	const first = screenings[0]
	const poster = first.filmposter?.startsWith('https://') ? first.filmposter : defaultMovie
	const rawSynopsis = first.filmstoryline && first.filmstoryline !== 'null' ? first.filmstoryline : null
	const trailer = first.filmtrailer?.startsWith('https://') ? first.filmtrailer : null
	const clean = (v?: string) => (v && v !== 'null' ? v : null)
	const director = clean(first.filmdirector)
	const cast = clean(first.filmcast)
	const minutes = first.filmduration ? Math.round(first.filmduration / 60) : 0

	const pickLang = (map?: Record<string, string> | null) =>
		map?.[currentLang] || (currentLang === 'zh' ? map?.zh : undefined)

	const displayTitle = pickLang(translations?.titleTranslations) || first.filmtitle
	const displaySynopsis = pickLang(translations?.synopsisTranslations) || rawSynopsis

	return (
		<main className="max-w-[1000px] mx-auto py-12 px-10">
			{backButton}

			<section className="flex flex-col md:flex-row gap-8 mb-12">
				<img src={poster} alt={displayTitle} className={posterClass} />
				<div>
					<Heading className="mb-4">{displayTitle}</Heading>
					<dl className="mb-4 flex flex-col gap-1 text-body">
						{director && (
							<div>
								<dt className="inline font-bold text-text">{t('movieDetails.director')} </dt>
								<dd className="inline text-text-muted">{director}</dd>
							</div>
						)}
						{cast && (
							<div>
								<dt className="inline font-bold text-text">{t('movieDetails.cast')} </dt>
								<dd className="inline text-text-muted">{cast}</dd>
							</div>
						)}
						{minutes > 0 && (
							<div>
								<dt className="inline font-bold text-text">{t('movieDetails.duration')} </dt>
								<dd className="inline text-text-muted">{formatRuntime(minutes)}</dd>
							</div>
						)}
					</dl>

					<p className={synopsisClass}>{displaySynopsis ?? t('movieDetails.noSynopsis')}</p>
					{trailer && (
						<section className="mt-6">
							<Heading level="section" className="mb-4">{t('movieDetails.trailer')}</Heading>
							<div className={boxClass}>
								<video src={trailer} controls className="w-full rounded-md" />
							</div>
						</section>
					)}
				</div>
			</section>

			<Heading level="section" className="mb-4">{t('movieDetails.upcomingScreenings')}</Heading>
			<ul className="flex flex-col gap-4">
				{screenings.map((s) => {
					const actualCineId = s.cineid || 0
					const key = `${actualCineId}-${s.showid}`

					return (
						<li key={key} className={rowClass}>
							<div>
								<p className="flex gap-2 text-body text-text">
									<Icon name="calendar-event" />
									{new Date(s.showstart).toLocaleString(dateLocale, { dateStyle: 'short', timeStyle: 'short' })}
								</p>
								<p className="flex gap-2 text-small text-text-muted">
									<Icon name="map-pin" />
									{s.cineville} · {s.cinenom}
								</p>
							</div>
							<Button variant="admin" size="lg" onClick={() => toggleEvent(s)}>
								{created.has(key) ? t('movieDetails.actions.removeEvent') : t('movieDetails.actions.createEvent')}
							</Button>
						</li>
					)
				})}
			</ul>
		</main>
	)
}

export default MovieDetailsPage