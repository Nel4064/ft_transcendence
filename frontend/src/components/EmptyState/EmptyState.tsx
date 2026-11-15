import Icon from '../Icon/Icon'

type EmptyStateProps = {
    message: string
}

const wrapperClass = "flex flex-col items-center gap-3 py-8 text-center"
const messageClass = "text-body text-text-muted"

function EmptyState({ message }: EmptyStateProps) {
    return (
        <div className={wrapperClass}>
            <Icon name="id-off" size={40} />
            <p className={messageClass}>{message}</p>
        </div>
    )
}

export default EmptyState
