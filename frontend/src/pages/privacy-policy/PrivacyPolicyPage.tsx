import type { ChangeEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../context/AuthContext'
import Heading from '../../components/Heading/Heading'

const textClass = 'my-4 text-body text-text'

const LANGUAGES = [
	{ code: 'en', label: 'English' },
	{ code: 'fr', label: 'Français' },
	{ code: 'zh', label: '中文' },
]

function PrivacyPolicyPage() {
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
				<Heading>{t('privacyPolicy.heading')}</Heading>
				<p className={textClass}>{t('privacyPolicy.intro')}</p>

				<Heading level="subtitle">{t('privacyPolicy.sections.collect.title')}</Heading>
				<p className={textClass}>{t('privacyPolicy.sections.collect.body')}</p>

				<Heading level="subtitle">{t('privacyPolicy.sections.purpose.title')}</Heading>
				<p className={textClass}>{t('privacyPolicy.sections.purpose.body')}</p>

				<Heading level="subtitle">{t('privacyPolicy.sections.thirdParties.title')}</Heading>
				<p className={textClass}>{t('privacyPolicy.sections.thirdParties.body')}</p>

				<Heading level="subtitle">{t('privacyPolicy.sections.rights.title')}</Heading>
				<p className={textClass}>{t('privacyPolicy.sections.rights.body')}</p>
			</section>
		</main>
	)
}

export default PrivacyPolicyPage
