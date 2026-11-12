import Avatar from '../Avatar/Avatar'

type NotificationsCardProps = {
    message: string
    time: string    // already formatted, e.g. "2 hours ago"
    actor?: { displayName: string; avatarUrl: string | null } | null
    unread?: boolean
    onClick?: () => void
}

const cardClass = "flex items-center gap-3 p-4 border border-border rounded-lg shadow-card w-full text-left cursor-pointer"
const unreadClass = "bg-brand/15"
const readClass = "bg-bg"
const fallbackClass = "w-9 h-9 shrink-0 rounded-full border-2 border-brand bg-surface flex items-center justify-center"
const fallbackIconClass = "w-5 h-5"
const messageClass = "text-body"
const unreadMessageClass = "font-semibold text-text"
const readMessageClass = "text-text-muted"
const timeClass = "text-small text-text-light"

function NotificationsCard({ message, time, actor, unread = false, onClick }: NotificationsCardProps) {
    return (
        <button type="button" onClick={onClick} className={`${cardClass} ${unread ? unreadClass : readClass}`}>
            {actor
                ? <Avatar src={actor.avatarUrl} name={actor.displayName} size={36} />
                : <div className={fallbackClass}><img src={ticket} alt="CineClub" className={fallbackIconClass} /></div>}
            <div>
                <p className={`${messageClass} ${unread ? unreadMessageClass : readMessageClass}`}>{message}</p>
                <p className={timeClass}>{time}</p>
            </div>
        </button>
    )
}

export default NotificationsCard
