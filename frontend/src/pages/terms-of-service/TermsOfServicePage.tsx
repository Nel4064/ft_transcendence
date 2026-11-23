import { useTranslation } from 'react-i18next'
import Heading from '../../components/Heading/Heading'

const textClass = "my-4 text-body text-text"

function TermsOfServicePage() {
	const { t } = useTranslation()

	return (
		<main className="max-w-[1200px] mx-auto py-12 px-10">
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