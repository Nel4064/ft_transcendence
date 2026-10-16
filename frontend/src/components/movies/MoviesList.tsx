import MoviesCard from './MoviesCard'
import defaultMovie from '../../assets/default-movie.jpg'
import { useState, useEffect } from 'react'

type Event = {
	id: number,
	title: string,
	movie: string,
	type: string,
	date: string,
	time: string,
	locationType: string,
	city?: string,
	venue?: string,
	platform?: string,
	description: string,
	maxParticipants: number,
	participants: number,
	status: string,
	organizer: string,
	image?: string,
}

type MoviesListProps = {
	searchTerm?: string
	filter?: string
}

function MoviesList({searchTerm = '', filter = 'title'}: MoviesListProps) {
	const [events, setEvents] = useState<Event[]>([])

useEffect(() => {
	fetch('/api/events')
		.then((response) => {
			if (!response.ok) throw new Error(`HTTP ${response.status}`)
			return response.json()
		})
		.then((data) => setEvents(Array.isArray(data) ? data : []))
		.catch((err) => console.error('Failed to load events:', err))
}, [])


	const term = searchTerm.toLowerCase()

	const filteredEvents = events.filter((event) => {
		if (term === '') return true
		if (filter === 'title') return event.movie.toLowerCase().includes(term)
		if (filter === 'cinema') return (event.venue ?? '').toLowerCase().includes(term)
		if (filter === 'date') return event.date.includes(term)
		return true
	})

	return (
		<>
			{filteredEvents.map((event) => (
			<MoviesCard
				id={event.id}
				key={event.id}
				title={event.title}
				image={event.image || defaultMovie}
				movie={event.movie}
				date={event.date}
				time={event.time}
				location={event.locationType === 'IN_PERSON'
					? `${event.city} · ${event.venue}`
					: `ONLINE · ${event.platform}`
				}
				participants={event.participants}
				maxParticipants={event.maxParticipants}
				organizer={event.organizer}
			/>
			))}
		</>
	)
}

export default MoviesList