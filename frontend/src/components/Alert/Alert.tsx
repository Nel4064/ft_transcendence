type AlertProps = {
    show: boolean   // affiche le point seulement si true
}

const dotClass = "absolute -top-1 -right-2 w-2 h-2 rounded-full bg-danger"

function Alert({ show }: AlertProps) {
    if (!show)
        return null
    return <span className={dotClass} aria-label="New" />
}

export default Alert