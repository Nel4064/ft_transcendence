import type { ChangeEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../context/AuthContext'
import Heading from '../../components/Heading/Heading'

const textClass = 'my-4 text-body text-text'

const LANGUAGES = [
	{ code: 'en', label: 'English' },
	{ code: 'fr', label: 'Français' },
	{ code: 'ch', label: '中文' },
]

function TermsOfServicePage() {
	const { t, i18n } = useTranslation()
	const { user } = useAuth()

	const currentLang = i18n.language?.split('-')[0] || 'en'

	function handleLanguageChange(e: ChangeEvent<HTMLSelectElement>) {
		const lang = e.target.value
		i18n.changeLanguage(lang)
		localStorage.setItem('i18nextLng', lang)
	}

	return (
		<main className="max-w-[1200px] mx-auto py-12 px-10">
			{!user && (
				<div className="flex justify-end mb-4">
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

			<section>
				<Heading>{t('termsOfService.heading')}</Heading>
				<p className={textClass}>{t('termsOfService.intro')}</p>

				<Heading level="subtitle">{t('termsOfService.sections.membership.title')}</Heading>
				<p className={textClass}>{t('termsOfService.sections.membership.body')}</p>

				<Heading level="subtitle">{t('termsOfService.sections.acceptableUse.title')}</Heading>
				<p className={textClass}>{t('termsOfService.sections.acceptableUse.body')}</p>

				<Heading level="subtitle">{t('termsOfService.sections.screeningData.title')}</Heading>
				<p className={textClass}>{t('termsOfService.sections.screeningData.body')}</p>

				<Heading level="subtitle">{t('termsOfService.sections.termination.title')}</Heading>
				<p className={textClass}>{t('termsOfService.sections.termination.body')}</p>
			</section>
		</main>
	)
}

export default TermsOfServicePage