import type { ReactNode } from 'react'

type Tone = 'neutral' | 'brand' | 'admin' | 'danger'

const base = "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-small font-medium"

const tones: Record<Tone, string> = {
    neutral: "bg-bg text-text-muted",
    brand: "bg-brand/10 text-brand",
    admin: "bg-admin/10 text-admin",
    danger: "bg-danger/10 text-danger",
}

type BadgeProps = {
    tone?: Tone
    icon?: ReactNode
    children: ReactNode
}

function Badge({ tone = 'neutral', icon, children }: BadgeProps) {
    return (
        <span className={`${base} ${tones[tone]}`}>
            {icon}
            {children}
        </span>
    )
}

export default Badge
