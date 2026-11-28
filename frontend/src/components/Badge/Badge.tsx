import type { ReactNode } from 'react'

export type Tone = 'neutral' | 'brand' | 'admin' | 'danger' | 'success'

const base = "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-small font-medium"

const tones: Record<Tone, string> = {
    neutral: "bg-bg text-text-muted",
    brand: "bg-brand/10 text-brand",
    admin: "bg-admin/10 text-admin",
    danger: "bg-danger/10 text-danger",
    success: "bg-success/10 text-success",
}

type BadgeProps = {
    tone?: Tone
    icon?: ReactNode
    className?: string
    children: ReactNode
}

function Badge({ tone = 'neutral', icon, className = '', children }: BadgeProps) {
    return (
        <span className={`${base} ${tones[tone]} ${className}`.trim()}>
            {icon}
            {children}
        </span>
    )
}

export default Badge
