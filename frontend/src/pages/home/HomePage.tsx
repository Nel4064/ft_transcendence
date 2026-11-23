import type { ChangeEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../context/AuthContext'
import ScreeningsList from '../../components/Screenings/ScreeningsList'
import Heading from '../../components/Heading/Heading'

const LANGUAGES = [
	{ code: 'en', label: 'English' },
	{ code: 'fr', label: 'Français' },
	{ code: 'ch', label: '中文' },
]

function HomePage() {
	const { t, i18n } = useTranslation()
	const { user } = useAuth()

	const currentLang = i18n.language?.split('-')[0] || 'en'

	function handleLanguageChange(e: ChangeEvent<HTMLSelectElement>) {
		const lang = e.target.value
		i18n.changeLanguage(lang)
		localStorage.setItem('i18nextLng', lang)
	}

	return (
		<main className="w-full">
			<section className="w-full py-12 px-4 sm:py-16 sm:px-6 text-center bg-bg">
				{!user && (
					<div className="max-w-[1400px] mx-auto flex justify-end mb-4">
						<select
							aria-label="Language"
							value={currentLang}
							onChange={handleLanguageChange}
							className="px-3 py-1.5 text-small bg-surface text-text border border-border rounded-md shadow-card cursor-pointer focus:outline-none focus:border-brand"
						>
							{LANGUAGES.map((lang) => (
								<option key={lang.code} value={lang.code}>
									{lang.label}
								</option>
							))}
						</select>
					</div>
				)}

				<div className="max-w-3xl mx-auto">
					<h1 className="font-serif font-bold text-3xl sm:text-4xl lg:text-display text-text">
						{t('home.titleLine1')}<br />{t('home.titleLine2')}
					</h1>
					<p className="my-6 sm:my-8 font-serif font-light text-base sm:text-lg lg:text-section text-text-muted">
						{t('home.subtitle')}
					</p>
				</div>
			</section>

			<section className="w-full max-w-[1400px] mx-auto py-8 px-4 sm:py-10 sm:px-6">
				<div className="flex flex-col sm:flex-row justify-between items-center text-center sm:text-left gap-2 mb-6">
					<Heading level="section">{t('home.upcomingScreenings')}</Heading>
				</div>

				<ScreeningsList upcomingOnly />
			</section>
		</main>
	)
}

export default HomePage