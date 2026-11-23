import { useTranslation } from 'react-i18next'
import Heading from '../../components/Heading/Heading'

const textClass = "my-4 text-body text-text"

function PrivacyPolicyPage() {
	const { t } = useTranslation()

	return (
		<main className="max-w-[1200px] mx-auto py-12 px-10">
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
