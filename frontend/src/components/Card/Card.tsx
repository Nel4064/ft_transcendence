import type { HTMLAttributes } from 'react'
import { Link } from 'react-router-dom'

type CardProps = HTMLAttributes<HTMLDivElement> & {
    padding?: 'md' | 'lg'
    hoverable?: boolean
    image?: string
    imageHeight?: 'md' | 'lg'
    title?: string
    to?: string           // si présent, l'image et le titre deviennent un lien
}

const base = "bg-surface border border-border rounded-lg shadow-card"
const paddings = { md: "p-4", lg: "p-6" }
const imageHeights = { md: "h-48", lg: "h-96" }
const hoverClass = "transition-transform hover:-translate-y-1"
const imageClass = "w-full mb-4 object-cover rounded-md"
const titleClass = "font-serif font-bold text-card text-text"

function Card({
    padding = 'md',
    hoverable = false,
    image,
    imageHeight = 'md',
    title,
    to,
    className = '',
    children,
    ...props
}: CardProps) {
    const classes = `${base} ${paddings[padding]} ${hoverable ? hoverClass : ''} ${className}`

    // L'image et le titre, seulement s'ils sont fournis
    const content = (
        <>
            {image && <img src={image} alt={title ?? ''} className={`${imageClass} ${imageHeights[imageHeight]}`} />}
            {title && <h3 className={`${titleClass} ${to ? 'hover:underline' : ''}`}>{title}</h3>}
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
