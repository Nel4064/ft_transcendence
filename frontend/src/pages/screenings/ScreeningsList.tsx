import { useEffect, useState } from 'react'
import RsvpScreeningCard from '../../components/Screenings/RsvpScreeningCard'
import defaultMovie from '../../assets/default-movie.jpg'
import { useAuth } from '../../context/AuthContext'
import { type Screening, getMyRsvpScreenings, rsvp, cancelRsvp } from '../../api/screenings'

export default function ScreeningsList() {
    const [screenings, setScreenings] = useState<Screening[]>([])
    const [isLoading, setIsLoading] = useState(true)    // 控制当前显示的是 Upcoming 还是 History
    const [activeTab, setActiveTab] = useState<'upcoming' | 'history'>('upcoming')
    const { apiFetch } = useAuth()
    useEffect(() => {
        setIsLoading(true)
        getMyRsvpScreenings(apiFetch)
            .then((data) => {
                setScreenings(data)
                setIsLoading(false)
            })
            .catch(() => {
                setScreenings([])
                setIsLoading(false)
            })
    }, [apiFetch])
    const handleRsvp = async (screeningId: string) => {
        const targetScreening = screenings.find(s => s.id === screeningId);
        if (!targetScreening) return;

        const isCurrentlyGoing = targetScreening.isGoing;
        setScreenings(prev => prev.map(s =>
            s.id === screeningId
                ? { ...s, isGoing: !isCurrentlyGoing, totalGoingCount: (s.totalGoingCount || 0) + (isCurrentlyGoing ? -1 : 1) }
                : s
        ));
        try {
            if (isCurrentlyGoing) {
                await cancelRsvp(apiFetch, screeningId);
            } else {
                await rsvp(apiFetch, screeningId);
            }
        } catch (error: any) {
            setScreenings(prev => prev.map(s =>
                s.id === screeningId
                    ? { ...s, isGoing: isCurrentlyGoing, totalGoingCount: (s.totalGoingCount || 0) + (isCurrentlyGoing ? 1 : -1) }
                    : s
            ));
            const errText = String(error?.message || error);
            const isNotFound = error?.status === 404 || errText.includes('404') || errText.includes('Not Found');
            const isBadRequest = error?.status === 400 || errText.includes('passée');
            if (isNotFound) {
                alert("Désolé, cette séance a été annulée ou n'est plus disponible.");
                setScreenings(prev => prev.filter(s => s.id !== screeningId));
            } else if (isBadRequest) {
                alert("Vous ne pouvez pas modifier le RSVP pour une séance passée.");
            } else {
                alert("Une erreur est survenue lors de l'enregistrement de votre RSVP.");
            }
        }
    }
    const now = new Date();
    const upcomingScreenings = screenings.filter(s => s.startsAt && new Date(s.startsAt) >= now);
    const historyScreenings = screenings.filter(s => s.startsAt && new Date(s.startsAt) < now && s.isGoing);
    const displayedScreenings = activeTab === 'upcoming' ? upcomingScreenings : historyScreenings;
    return (
        <div className="w-3/4 max-w-[800px] mx-auto py-6 px-4 md:px-0">
            <div className="mb-6 text-left">
                <h1 className="font-serif text-[28px] md:text-[32px] font-bold text-gray-900 tracking-tight mb-1">
                    My Screenings
                </h1>
                <p className="text-[14px] text-gray-500 mb-6">
                    Manage your upcoming movie club sessions and view your past attendances.
                </p>
                <div className="flex gap-4 border-b border-gray-200">
                    <button
                        onClick={() => setActiveTab('upcoming')}
                        className={`pb-2 text-sm font-semibold transition-colors ${activeTab === 'upcoming'
                            ? 'border-b-2 border-brand text-brand'
                            : 'text-gray-400 hover:text-gray-600'
                            }`}
                    >
                        Upcoming ({upcomingScreenings.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('history')}
                        className={`pb-2 text-sm font-semibold transition-colors ${activeTab === 'history'
                            ? 'border-b-2 border-brand text-brand'
                            : 'text-gray-400 hover:text-gray-600'
                            }`}
                    >
                        History ({historyScreenings.length})
                    </button>
                </div>
            </div>
            {isLoading ? (
                <p className="text-gray-400 py-4">Loading screenings...</p>
            ) : displayedScreenings.length === 0 ? (
                <p className="text-gray-400 py-4">
                    {activeTab === 'upcoming'
                        ? "No upcoming screenings yet."
                        : "You haven't attended any screenings in the past."}
                </p>
            ) : (
                <div className="flex flex-col gap-3">
                    {displayedScreenings.map((s) => {
                        let formattedDate = 'Date TBD';
                        if (s.startsAt) {
                            try {
                                const dateObj = new Date(s.startsAt);
                                formattedDate = `${dateObj.toLocaleDateString('en-GB', {
                                    weekday: 'short', day: 'numeric', month: 'short', year: activeTab === 'history' ? 'numeric' : undefined
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
                                disabled={activeTab === 'history'}
                                onRsvp={handleRsvp}
                            />
                        );
                    })}
                </div>
            )}
        </div>
    )
}