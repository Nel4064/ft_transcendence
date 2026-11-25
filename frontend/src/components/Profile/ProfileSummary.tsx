import type { ReactNode } from 'react'
import Avatar from '../Avatar/Avatar'
import Card from '../Card/Card'
import Heading from '../Heading/Heading'
import Icon from '../Icon/Icon'

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
    children?: ReactNode    // what the page adds at the bottom of the card (chat button, settings links...)
}

const LANGUAGE_LABELS: Record<string, string> = {
    EN: 'English',
    FR: 'Français',
    ZH: '中文',
}

const badgeClass = "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium"

// Display only: no fetching, no auth. Each page decides where the profile comes from.
function ProfileSummary({ profile, children }: ProfileSummaryProps) {
    const name = profile.displayName || profile.username

    return (
        <Card padding="lg" className="flex flex-col items-center gap-4 text-center">
            <Avatar src={profile.avatarUrl} name={name} size={100} />

            <div>
                <Heading level="section" as="h1">{name}</Heading>
                <p className="text-text-muted text-sm">@{profile.username}</p>

                <div className="flex items-center justify-center gap-2 mt-3">
                    {profile.role && (
                        <span className={`${badgeClass} ${profile.role === 'ADMIN' ? 'bg-amber-100 text-amber-800' : 'bg-stone-100 text-stone-700'}`}>
                            {profile.role === 'ADMIN' && <Icon name="shield" size={14} />}
                            {profile.role === 'ADMIN' ? 'Admin' : 'Member'}
                        </span>
                    )}
                    {profile.language && (
                        <span className={`${badgeClass} bg-stone-100 text-stone-700`}>
                            <Icon name="world" size={14} />
                            {LANGUAGE_LABELS[profile.language] || profile.language}
                        </span>
                    )}
                </div>
            </div>

            <div className="w-full mt-4 p-4 bg-bg border border-border rounded-md text-left">
                <h3 className="text-xs font-bold text-text-muted uppercase tracking-wider mb-1">About Me</h3>
                <p className="text-text text-sm whitespace-pre-wrap">
                    {profile.bio || 'Nothing here yet.'}
                </p>
            </div>

            {children}
        </Card>
    )
}

export default ProfileSummary
