import { useState } from 'react'
import { useAuth } from '../../context/AuthContext'

const avatarClass = "rounded-full object-cover border-2 border-brand"
const initialsClass = "rounded-full border-2 border-brand bg-brand text-white font-serif font-bold flex items-center justify-center select-none"

type AvatarProps = {
    src?: string | null
    name?: string   // set it to show another user; without it, the logged-in user is shown
    size?: number
    alt?: string
}

// "Jean Dupont" -> "JD", "neandrie" -> "N"
function getInitials(name: string) {
    return name.trim().split(/\s+/).slice(0, 2).map((word) => word[0]).join('').toUpperCase() || '?'
}

function Avatar({ src, name, size = 50, alt }: AvatarProps) {
    const { user } = useAuth()
    const [failedSrc, setFailedSrc] = useState<string | null>(null)

    const isOtherUser = name !== undefined
    const imageSrc = src || (isOtherUser ? null : user?.avatarUrl)
    const label = isOtherUser ? name : (user?.displayName || user?.username || '')
    const description = alt ?? (label ? `${label}'s avatar` : 'Avatar')

    // No picture, or it failed to load: show initials instead
    if (!imageSrc || imageSrc === failedSrc) {
        return (
            <div
                role="img"
                aria-label={description}
                className={initialsClass}
                style={{ width: size, height: size, fontSize: size * 0.4 }}
            >
                {getInitials(label)}
            </div>
        )
    }

    return (
        <img
            src={imageSrc}
            alt={description}
            width={size}
            height={size}
            className={avatarClass}
            onError={() => setFailedSrc(imageSrc)}
        />
    )
}

export default Avatar
