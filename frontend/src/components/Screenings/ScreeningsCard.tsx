import { Link } from 'react-router-dom'

type ScreeningsCardProps = {
    id: string
    movie: string
    image: string
}

const cardClass = "w-64 shrink-0 snap-start p-4 bg-surface border border-border rounded-lg shadow-card transition-transform hover:-translate-y-1"
const imageClass = "w-full h-96 mb-4 object-cover rounded-md"
const titleClass = "font-serif font-bold text-2xl text-text hover:underline"

function ScreeningsCard({ id, movie, image }: ScreeningsCardProps) {
    return (
        <div className={cardClass}>
            <Link to={`/screenings/${id}`}>
                <img src={image} alt={movie} className={imageClass} />
                <h3 className={titleClass}>{movie}</h3>
            </Link>
        </div>
    )
}

export default ScreeningsCard
