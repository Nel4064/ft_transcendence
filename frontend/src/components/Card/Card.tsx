import type { HTMLAttributes } from 'react'
import { Link } from 'react-router-dom'
import Heading from '../Heading/Heading'

type CardProps = HTMLAttributes<HTMLDivElement> & {
    padding?: 'md' | 'lg'
    hoverable?: boolean
    image?: string
    imageHeight?: 'md' | 'lg'
    title?: string
    to?: string           // si présent, l'image et le titre deviennent un lien
    tone?: Tone
}

type Tone = 'default' | 'danger'

const base = "border rounded-lg shadow-card"
const tones: Record<Tone, string> = {
    default: "bg-surface border-border",
    danger: "bg-danger/5 border-danger/30",   // zone sensible (ex. suppression de compte)
}
const paddings = { md: "p-4", lg: "p-6" }
const imageHeights = { md: "h-48", lg: "h-96" }
const hoverClass = "transition-transform hover:-translate-y-1"
const imageClass = "w-full mb-4 object-cover rounded-md"

function Card({
    padding = 'md',
    hoverable = false,
    image,
    imageHeight = 'md',
    title,
    to,
    tone = 'default',
    className = '',
    children,
    ...props
}: CardProps) {
    const classes = `${base} ${tones[tone]} ${paddings[padding]} ${hoverable ? hoverClass : ''} ${className}`

    // L'image et le titre, seulement s'ils sont fournis
    const content = (
        <>
            {image && <img src={image} alt={title ?? ''} className={`${imageClass} ${imageHeights[imageHeight]}`} />}
            {title && <Heading level="card" className={to ? 'hover:underline' : ''}>{title}</Heading>}
        </>
    )

    return (
        <div className={classes} {...props}>
            {to ? <Link to={to}>{content}</Link> : content}
            {children}
        </div>
    )
}

export default Card
