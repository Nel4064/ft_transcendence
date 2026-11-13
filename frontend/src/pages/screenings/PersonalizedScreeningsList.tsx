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
        try {
            await apiFetch(`/screenings/${screeningId}/rsvp`, { method: 'POST' });
        } catch (error: any) {
            // 把 error 转换成字符串，方便我们大海捞针
            const errText = String(error?.message || error);

            // 匹配 HTTP 404，或者直接匹配你后端写死的那句法文
            const isNotFound =
                error?.status === 404 ||
                errText.includes('404') ||
                errText.includes('Not Found') ||
                errText.includes("La séance n'est plus disponible"); // 🌟 精准狙击后端的报错文本

            if (isNotFound) {
                alert("Désolé, cette séance a été annulée ou n'est plus disponible.");

                // 现在这一行肯定能执行了！卡片马上消失！
                setScreenings(prev => prev.filter(s => s.id !== screeningId));
            } else {
                alert("Une erreur est survenue lors de l'enregistrement de votre RSVP.");
            }
        }
    }

    if (isLoading) return <p className="text-gray-400 py-4">Loading screenings...</p>
    if (screenings.length === 0) return <p className="text-gray-400 py-4">No upcoming screenings yet.</p>

    return (
        <div className="w-3/4 max-w-[800px] mx-auto py-6 px-4 md:px-0">
            {/* Header section */}
            <div className="mb-6 text-left">
                <h1 className="font-serif text-[28px] md:text-[32px] font-bold text-gray-900 tracking-tight mb-1">
                    Upcoming — Club Picks
                </h1>
                <p className="text-[14px] text-gray-500">
                    Real screenings, curated by the club from independent cinemas nearby.
                </p>
            </div>

            {/* List section */}
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
                        } catch (e) { }
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