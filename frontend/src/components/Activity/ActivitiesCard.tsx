import Avatar from '../Avatar/Avatar'
import ticket from '../../assets/ticket.svg'

type ActivityCardProps = {
    message: string
    time: string    // already formatted, e.g. "2 hours ago"
    actor?: { displayName: string; avatarUrl: string | null } | null
    unread?: boolean
}

const cardClass = "flex items-center gap-3 p-4 border border-border rounded-lg shadow-card"
const unreadClass = "bg-brand/10"
const readClass = "bg-surface"
const fallbackClass = "w-9 h-9 shrink-0 rounded-full border-2 border-brand bg-surface flex items-center justify-center"
const fallbackIconClass = "w-5 h-5"
const messageClass = "text-base text-text"
const timeClass = "text-sm text-text-light"

function ActivityCard({ message, time, actor, unread = false }: ActivityCardProps) {
    return (
        <div className={`${cardClass} ${unread ? unreadClass : readClass}`}>
            {actor
                ? <Avatar src={actor.avatarUrl} name={actor.displayName} size={36} />
                : <div className={fallbackClass}><img src={ticket} alt="CineClub" className={fallbackIconClass} /></div>}
            <div>
                <p className={messageClass}>{message}</p>
                <p className={timeClass}>{time}</p>
            </div>
        </div>
    )
}

export default ActivityCard
