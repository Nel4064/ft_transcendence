import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import defaultMovie from '../../assets/default-movie.jpg'
import { apiFetch } from '../../context/AuthContext'


type Screening = {
	id: string
	filmTitle: string
	posterUrl: string | null
}

function ScreenDetailsPage() {
	const { id } = useParams()
	const [screening, setScreening] = useState<Screening | null>(null)

	useEffect(() => {
		apiFetch('/screenings')
			.then((list: Screening[]) => setScreening(list.find((s) => s.id === id) ?? null))
	}, [id])

	if (!screening)
		return <main className="py-12 px-10"><p>Loading...</p></main>

	return (
		<main className="max-w-[1000px] mx-auto py-12 px-10">
			<img src={screening.posterUrl ?? defaultMovie} alt={screening.filmTitle} className="w-64 rounded-md mb-6" />
			<h1 className="font-serif font-bold text-4xl text-text">{screening.filmTitle}</h1>
		</main>
	)
}

export default ScreenDetailsPage
