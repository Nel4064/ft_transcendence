import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Avatar from './Avatar'

type AvatarLinkProps = {
    userId: string
    name: string
    src?: string | null
    size?: number
    className?: string
}

const linkClass = "inline-flex shrink-0 rounded-full transition-opacity hover:opacity-80"

// The only way to open a user's profile page: click their avatar
function AvatarLink({ userId, name, src, size, className = '' }: AvatarLinkProps) {
    const { t } = useTranslation()

    return (
        <Link
            to={`/users/${userId}`}
            title={t('common.viewProfile')}
            className={`${linkClass} ${className}`.trim()}
        >
            <Avatar src={src} name={name} size={size} />
        </Link>
    )
}

export default AvatarLink
