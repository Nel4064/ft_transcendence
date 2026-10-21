import { Link } from 'react-router-dom'


type MoviesCardProps = {
	movie: string
	image: string
}

const cardClass = "w-full max-w-[700px] p-6 bg-surface border border-border rounded-lg shadow-card transition-transform hover:-translate-y-1"
const imageClass = "w-full h-48 mb-4 object-cover rounded-md"
const titleClass = "font-serif font-bold text-2xl text-text hover:underline"

function MoviesCard({ movie, image }: MoviesCardProps) {
	return (
		<div className={cardClass}>
			<Link to={`/movies/${encodeURIComponent(movie)}`}>
				<img src={image} alt={movie} className={imageClass} />
				<h3 className={titleClass}>{movie}</h3>
			</Link>
		</div>
	)
}

export default MoviesCard
