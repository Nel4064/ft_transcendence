import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import ScreeningsCard from './ScreeningsCard'
import EmptyState from '../EmptyState/EmptyState'
import defaultMovie from '../../assets/default-movie.jpg'
import { apiFetch } from '../../context/AuthContext'

type Screening = {
	startsAt: string | number | Date
	id: string
	filmTitle: string
	titleTranslations?: Record<string, string> | null
	posterUrl: string | null
}

interface ScreeningsListProps {
	upcomingOnly?: boolean
}

function ScreeningsList({ upcomingOnly = false }: ScreeningsListProps) {
	const { t, i18n } = useTranslation()
	const [screenings, setScreenings] = useState<Screening[]>([])

	const currentLang = i18n.language?.split('-')[0] || 'en'

	const getLocalizedTitle = (s: Screening) => {
		if (!s.titleTranslations) return s.filmTitle
		return (
			s.titleTranslations[currentLang] ||
			(currentLang === 'zh' ? s.titleTranslations.zh : undefined) ||
			s.filmTitle
		)
	}

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
				message={
					upcomingOnly
						? t('screenings.emptyUpcoming', 'No upcoming screenings yet.')
						: t('screenings.empty', 'No screenings yet.')
				}
			/>
		)

	return (
		<div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-4 sm:gap-6 justify-items-center">
			{screenings.map((s) => (
				<ScreeningsCard
					key={s.id}
					id={s.id}
					movie={getLocalizedTitle(s)}
					image={s.posterUrl ?? defaultMovie}
				/>
			))}
		</div>
	)
}

export default ScreeningsList
