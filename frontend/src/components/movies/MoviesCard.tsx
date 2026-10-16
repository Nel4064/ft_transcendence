type MoviesCardProps = {
	id: number
	title: string
	movie: string
	date: string
	time: string
	location: string
	participants: number
	maxParticipants: number
	organizer: string
	image: string
}

const cardClass = "w-full max-w-[700px] p-6 bg-surface border border-border rounded-lg shadow-card transition-transform hover:-translate-y-1"
const imageClass = "w-full h-48 mb-4 object-cover rounded-md"
const titleClass = "font-serif font-bold text-2xl text-text"
const detailsClass = "flex flex-col gap-1 text-text-muted"

function MoviesCard({
	title,
	movie,
	date,
	time,
	location,
	participants,
	maxParticipants,
	organizer,
	image,
}: MoviesCardProps) {
	return (
		<div className={cardClass}>
			<img src={image} alt={movie} className={imageClass} />
			<h3 className={titleClass}>{movie}</h3>

			<div className={detailsClass}>
				<p>📅 {date} · {time}</p>
				<p>📍 {location}</p>
			</div>
			<button type="submit" className="block ml-auto mt-4 py-2.5 px-3 rounded-md bg-brand hover:bg-brand-hover text-white text-base cursor-pointer">New Event</button>
		</div>
	)
}

export default MoviesCard
