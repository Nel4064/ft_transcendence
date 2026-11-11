import { useEffect, useState } from 'react'
import RsvpScreeningCard from '../../components/Screenings/RsvpScreeningCard'
import defaultMovie from '../../assets/default-movie.jpg'
import { apiFetch } from '../../context/AuthContext'

type Screening = {
    id: string
    filmTitle: string
    posterUrl: string | null
    startsAt: string
    cinemaName?: string
    isGoing: boolean
    totalGoingCount: number
}

export default function PersonalizedScreeningsList() {
    const [screenings, setScreenings] = useState<Screening[]>([])
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        setIsLoading(true)
        apiFetch('/screenings/myrsvps')
            .then((data) => {
                setScreenings(data)
                setIsLoading(false)
            })
            .catch(() => {
                setScreenings([])
                setIsLoading(false)
            })
    }, [])

    const handleRsvp = async (screeningId: string) => {
        await apiFetch(`/screenings/${screeningId}/rsvp`, { method: 'POST' });
    }

    if (isLoading) return <p className="text-gray-400 py-4">Loading screenings...</p>
    if (screenings.length === 0) return <p className="text-gray-400 py-4">No upcoming screenings yet.</p>

    return (
        <div className="w-3/4 max-w-[800px] mx-auto py-6 px-4 md:px-0">
            {/* 顶部的标题区域直接加在这里 */}
            <div className="mb-6 text-left">
                <h1 className="font-serif text-[28px] md:text-[32px] font-bold text-gray-900 tracking-tight mb-1">
                    Upcoming — Club Picks
                </h1>
                <p className="text-[14px] text-gray-500">
                    Real screenings, curated by the club from independent cinemas nearby.
                </p>
            </div>

            {/* 下方的列表区域 */}
            <div className="flex flex-col gap-3">
                {screenings.map((s) => {
                    let formattedDate = 'Date TBD';
                    if (s.startsAt) {
                        try {
                            const dateObj = new Date(s.startsAt);
                            formattedDate = `${dateObj.toLocaleDateString('en-GB', {
                                weekday: 'short', day: 'numeric', month: 'short'
                            })}, ${dateObj.toLocaleTimeString('en-GB', {
                                hour: '2-digit', minute: '2-digit'
                            })}`;
                        } catch (e) {}
                    }

                    return (
                        <RsvpScreeningCard 
                            key={s.id} 
                            id={s.id} 
                            movie={s.filmTitle || 'Unknown Title'} 
                            image={s.posterUrl ?? defaultMovie} 
                            cinema={s.cinemaName || 'Unknown Cinema'} 
                            dateFormatted={formattedDate} 
                            initialIsGoing={!!s.isGoing} 
                            initialGoingCount={s.totalGoingCount || 0} 
                            onRsvp={handleRsvp} 
                        />
                    );
                })}
            </div>
        </div>
    )
}