import type { HTMLAttributes } from 'react'

type Level = 'title' | 'section' | 'subtitle' | 'card'

const styles: Record<Level, string> = {
    title: 'font-serif font-bold text-title text-text',
    section: 'font-serif font-bold text-section text-text',
    subtitle: 'font-serif font-bold text-section text-text-muted',
    card: 'font-serif font-bold text-card text-text',
}

const defaultTags = { title: 'h1', section: 'h2', subtitle: 'h2', card: 'h3' } as const

type HeadingProps = HTMLAttributes<HTMLHeadingElement> & {
    level?: Level
    as?: 'h1' | 'h2' | 'h3'   // pour changer la balise sans changer le style
}

function Heading({ level = 'title', as, className = '', ...props }: HeadingProps) {
    const Tag = as ?? defaultTags[level]
    return <Tag className={`${styles[level]} ${className}`.trim()} {...props} />
}

export default Heading