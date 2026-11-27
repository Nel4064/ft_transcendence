import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import Avatar from '../Avatar/Avatar'
import Card from '../Card/Card'
import Heading from '../Heading/Heading'
import RoleBadge from '../Badge/RoleBadge'
import LanguageBadge from '../Badge/LanguageBadge'

export type PublicProfile = {
    id: string
    username: string
    displayName: string
    avatarUrl?: string | null
    bio?: string | null
    role?: 'ADMIN' | 'USER'
    language?: string
}

type ProfileSummaryProps = {
    profile: PublicProfile
    children?: ReactNode // what the page adds below the cards (chat button, settings menu...)
}

// Display only: no fetching, no auth. Each page decides where the profile comes from.
function ProfileSummary({ profile, children }: ProfileSummaryProps) {
    const { t } = useTranslation()
    const name = profile.displayName || profile.username

    return (
        <div className="flex flex-col gap-6">
            <Card padding="lg" className="flex flex-col items-center gap-4 text-center">
                <Avatar src={profile.avatarUrl} name={name} size={100} />
                <div>
                    <Heading level="section" as="h1">{name}</Heading>
                    <p className="text-small text-text-muted">{profile.username}</p>
                    <div className="flex items-center justify-center gap-2 mt-3">
                        {profile.role && <RoleBadge role={profile.role} />}
                        {profile.language && <LanguageBadge language={profile.language} />}
                    </div>
                </div>
            </Card>

            <Card
                padding="lg"
                title={t('profile.summary.aboutMe', 'About Me')}
                className="flex flex-col gap-3"
            >
                <p className="text-body text-text whitespace-pre-wrap">
                    {profile.bio || t('profile.summary.emptyBio', 'Nothing here yet.')}
                </p>
            </Card>

            {children}
        </div>
    )
}

export default ProfileSummary