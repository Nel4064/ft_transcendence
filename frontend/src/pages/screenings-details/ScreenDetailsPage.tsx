import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import defaultMovie from '../../assets/default-movie.jpg'
import { apiFetch, useAuth } from '../../context/AuthContext'
import Button from '../../components/button/Button'
import Avatar from '../../components/Avatar/Avatar'
import Icon from '../../components/Icon/Icon'

type Screening = {
    id: string
    filmTitle: string
    posterUrl: string | null
    startsAt: string
    cinemaName: string
    cinemaAddress: string
    cinemaCity: string
    version: string | null
    externalCinemaId: number
    externalShowId: string
    synopsis: string | null
    trailerUrl: string | null
}

const posterClass = "w-64 shrink-0 self-start rounded-md shadow-card"
const titleClass = "mb-4 font-serif font-bold text-title text-text"
const synopsisClass = "text-body text-text-muted"
const sectionTitleClass = "mb-4 font-serif font-bold text-section text-text"
const boxClass = "p-4 bg-surface border border-border rounded-lg shadow-card"

const fakeFriends = ['Alice Martin', 'Bob Durand', 'Chloé Petit', 'David Moreau']


function ScreenDetailsPage() {
	const { id } = useParams()
	const navigate = useNavigate()
	const { user } = useAuth()
	const [screening, setScreening] = useState<Screening | null>(null)
	
	useEffect(() => {
		apiFetch('/screenings')
		.then((list: Screening[]) => setScreening(list.find((s) => s.id === id) ?? null))
	}, [id])
	
	async function handleRemove() 
	{
		if (!screening) return
		await apiFetch(
			`/screenings/${screening.externalCinemaId}/${encodeURIComponent(screening.externalShowId)}`,
			{ method: 'DELETE' },
		)
		navigate('/')
	}
	if (!screening)
		return <main className="py-12 px-10"><p>Loading...</p></main>

	const start = new Date(screening.startsAt)
	const date = start.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
	const time = start.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })

	return (
		<main className="max-w-[1000px] mx-auto py-12 px-10">
			<section className="flex flex-col md:flex-row gap-8 mb-12">
				<img src={screening.posterUrl ?? defaultMovie} alt={screening.filmTitle} className={posterClass} />
				<div>
					<h1 className={titleClass}>{screening.filmTitle}</h1>
					<p className={synopsisClass}>{screening.synopsis ?? 'No synopsis available.'}</p>
					{screening.trailerUrl && (
						<section className="mt-6">
							<h2 className={sectionTitleClass}>Trailer</h2>
							<div className={boxClass}>
								<video src={screening.trailerUrl} controls className="w-full rounded-md" />
							</div>
						</section>
					)}
				</div>
			</section>

			<ul className = "flex flex-col gap-4 mt-6">
				<li key={screening.id} className="flex items-center justify-between p-4 bg-surface border border-border rounded-lg text-body text-text-muted">
					<div>
						<p className="flex gap-2 text-body text-text">
							<Icon name="calendar-event" />
							{date} at {time}{screening.version && ` · ${screening.version}`}</p>
						<p className="flex gap-2 text-body text-text-muted">
							<Icon name="map-pin" />
							{screening.cinemaName} - {screening.cinemaAddress} - {screening.cinemaCity}</p>
					</div>
							<Button size="lg"> Go to the event </Button>
				</li>

				<li className="flex items-center justify-between p-4 bg-surface border border-border rounded-lg text-body text-text-muted ">
					<div>
						<p className="text-body text-text">
							{fakeFriends.length > 0 ? `friends going :` : 'No friends going yet'}
						</p>
						<ul className="flex flex-wrap gap-2 mt-2">
							{fakeFriends.map((friend) => (
								<li key={friend} className="flex items-center gap-2">
									<Avatar name={friend} />
								</li>
							))}
						</ul>
					</div>
				</li>
				<div className={boxClass}>
					add chat here
				</div>
			</ul>
			{user?.role === 'ADMIN' && (
				<div className="flex justify-end mt-4">
					<Button variant="admin" size="lg" onClick={handleRemove}> Remove Event </Button>
				</div>
			)}

		</main>
	)
}

export default ScreenDetailsPage
