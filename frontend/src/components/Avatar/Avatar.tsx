import defaultAvatar from '../../assets/default-avatar.jpg'
import { useAuth } from '../../context/AuthContext'

const avatarClass = "rounded-full object-cover border-2 border-brand"

type AvatarProps = {
    src?: string | null
    size?: number
    alt?: string
}

function Avatar({ src, size = 50, alt = 'Avatar' }: AvatarProps) {
    const { user } = useAuth()

    const rawAvatar = src || user?.avatarUrl

    // 智能处理图片路径
    let imageSrc = defaultAvatar
    if (rawAvatar && typeof rawAvatar === 'string') {
        if (rawAvatar.startsWith('http') || rawAvatar.startsWith('data:image')) {
            // 如果是完整的 URL 或 Base64，直接使用
            imageSrc = rawAvatar
        } else {
            // 如果后端返回的是像 /uploads/... 这样的相对路径
            // 请根据你的后端实际地址调整（例如若后端在 3000 端口，可写成 http://localhost:3000${rawAvatar}）
            // 如果前端配置了 vite.js proxy 转发，直接使用 rawAvatar 即可
            imageSrc = rawAvatar 
        }
    }

    return (
        <img
            src={imageSrc}
            alt={alt}
            width={size}
            height={size}
            className={avatarClass}
            onError={(e) => {
                // 如果图片加载失败，自动回退到默认头像，防止显示裂图或文字
                (e.target as HTMLImageElement).src = defaultAvatar
            }}
        />
    )
}

export default Avatar