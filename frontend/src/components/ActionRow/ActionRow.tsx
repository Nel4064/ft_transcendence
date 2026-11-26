import type { ReactNode } from 'react'

type ActionRowProps = {
    title: ReactNode
    description?: ReactNode
    leading?: ReactNode     // optional visual on the left: avatar, poster, icon...
    badge?: ReactNode       // optional badge next to the title
    danger?: boolean        // red title, for destructive actions
    children?: ReactNode    // actions on the right (buttons)
}

// Layout only (no border, no background): put it inside a <Card> for the frame.
// [leading]  title [badge]                [actions]
//            description
function ActionRow({ title, description, leading, badge, danger = false, children }: ActionRowProps) {
    return (
        <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
                {leading}
                <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <p className={`text-body font-bold ${danger ? 'text-danger' : 'text-text'}`}>{title}</p>
                        {badge}
                    </div>
                    {description && <p className="text-small text-text-muted">{description}</p>}
                </div>
            </div>
            {children && <div className="flex items-center gap-2 shrink-0">{children}</div>}
        </div>
    )
}

export default ActionRow
