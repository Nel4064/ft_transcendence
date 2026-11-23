import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import RsvpScreeningCard from '../../components/Screenings/RsvpScreeningCard'
import defaultMovie from '../../assets/default-movie.jpg'
import { useAuth } from '../../context/AuthContext'
import { type Screening, getMyRsvpScreenings, rsvp, cancelRsvp } from '../../api/screenings'
import Loader from '../../components/Loader/Loader'
import Heading from '../../components/Heading/Heading'
import EmptyState from '../../components/EmptyState/EmptyState'

const ITEMS_PER_PAGE = 5

const LOCALE_MAP: Record<string, string> = {
    en: 'en-GB',
    fr: 'fr-FR',
    ch: 'zh-CN',
}

export default function ScreeningsList() {
    const { t, i18n } = useTranslation()
    const [screenings, setScreenings] = useState<Screening[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [activeTab, setActiveTab] = useState<'upcoming' | 'history'>('upcoming')
    const [currentPage, setCurrentPage] = useState(1)
    const { apiFetch } = useAuth()

    // 👇 加上 .toLowerCase()，兼容大写（如 CN / ZH）
    const dateLocale = LOCALE_MAP[i18n.language?.toLowerCase().slice(0, 2)] || 'en-GB'

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
            const isNotFound = error?.status === 404 || errText.includes('404') || errText.includes('Not Found') || errText.includes("La séance n'est plus disponible") || errText.includes("introuvable") || errText.includes("annulée");
            const isBadRequest = error?.status === 400 || errText.includes('passée');
            if (isNotFound) {
                alert(t('myScreenings.errors.notFound'));
                setScreenings(prev => prev.filter(s => s.id !== screeningId));
            } else if (isBadRequest) {
                alert(t('myScreenings.errors.pastSession'));
            } else {
                alert(t('myScreenings.errors.saveFailed'));
            }
        }
    }

    const handleTabChange = (tab: 'upcoming' | 'history') => {
        setActiveTab(tab)
        setCurrentPage(1)
    }

    const now = new Date();
    const upcomingScreenings = screenings.filter(s => s.startsAt && new Date(s.startsAt) >= now);
    const historyScreenings = screenings.filter(s => s.startsAt && new Date(s.startsAt) < now && s.isGoing);
    const displayedScreenings = activeTab === 'upcoming' ? upcomingScreenings : historyScreenings;

    const totalPages = Math.max(1, Math.ceil(displayedScreenings.length / ITEMS_PER_PAGE));
    const safePage = Math.min(currentPage, totalPages);
    const startIndex = (safePage - 1) * ITEMS_PER_PAGE;
    const paginatedScreenings = displayedScreenings.slice(startIndex, startIndex + ITEMS_PER_PAGE);

    return (
        <div className="w-3/4 max-w-[800px] mx-auto py-6 px-4 md:px-0">
            <div className="mb-6 text-left">
                <Heading className="tracking-tight mb-1">
                    {t('myScreenings.heading')}
                </Heading>
                <p className="text-[14px] text-gray-500 mb-6">
                    {t('myScreenings.subtitle')}
                </p>
                <div className="flex gap-4 border-b border-gray-200">
                    <button
                        onClick={() => handleTabChange('upcoming')}
                        className={`pb-2 text-sm font-semibold transition-colors ${activeTab === 'upcoming'
                            ? 'border-b-2 border-brand text-brand'
                            : 'text-gray-400 hover:text-gray-600'
                            }`}
                    >
                        {t('myScreenings.tabs.upcoming')} ({upcomingScreenings.length})
                    </button>
                    <button
                        onClick={() => handleTabChange('history')}
                        className={`pb-2 text-sm font-semibold transition-colors ${activeTab === 'history'
                            ? 'border-b-2 border-brand text-brand'
                            : 'text-gray-400 hover:text-gray-600'
                            }`}
                    >
                        {t('myScreenings.tabs.history')} ({historyScreenings.length})
                    </button>
                </div>
            </div>
            {isLoading ? (
                <Loader text={t('myScreenings.loading')} />
            ) : displayedScreenings.length === 0 ? (
                <EmptyState
                    message={activeTab === 'upcoming'
                        ? t('myScreenings.empty.upcoming')
                        : t('myScreenings.empty.history')}
                />
            ) : (
                <>
                    <div className="flex flex-col gap-3">
                        {paginatedScreenings.map((s) => {
                            let formattedDate = t('myScreenings.dateTbd');
                            if (s.startsAt) {
                                try {
                                    const dateObj = new Date(s.startsAt);
                                    formattedDate = `${dateObj.toLocaleDateString(dateLocale, {
                                        weekday: 'short', day: 'numeric', month: 'short', year: activeTab === 'history' ? 'numeric' : undefined
                                    })}, ${dateObj.toLocaleTimeString(dateLocale, {
                                        hour: '2-digit', minute: '2-digit'
                                    })}`;
                                } catch (e) { }
                            }
                            return (
                                <RsvpScreeningCard
                                    key={s.id}
                                    id={s.id}
                                    movie={s.filmTitle || t('myScreenings.unknownTitle')}
                                    image={s.posterUrl ?? defaultMovie}
                                    cinema={s.cinemaName || t('myScreenings.unknownCinema')}
                                    dateFormatted={formattedDate}
                                    initialIsGoing={!!s.isGoing}
                                    initialGoingCount={s.totalGoingCount || 0}
                                    disabled={activeTab === 'history'}
                                    onRsvp={handleRsvp}
                                />
                            );
                        })}
                    </div>

                    {totalPages > 1 && (
                        <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200">
                            <button
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={safePage === 1}
                                className="px-3 py-1.5 text-sm font-medium rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                            >
                                {t('myScreenings.pagination.previous')}
                            </button>

                            <div className="flex items-center gap-1.5">
                                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                                    <button
                                        key={page}
                                        onClick={() => setCurrentPage(page)}
                                        className={`w-8 h-8 text-sm font-medium rounded-md transition-colors ${safePage === page
                                            ? 'bg-brand text-white'
                                            : 'text-gray-600 hover:bg-gray-100'
                                            }`}
                                    >
                                        {page}
                                    </button>
                                ))}
                            </div>

                            <button
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={safePage === totalPages}
                                className="px-3 py-1.5 text-sm font-medium rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                            >
                                {t('myScreenings.pagination.next')}
                            </button>
                        </div>
                    )}
                </>
            )}
        </div>
    )
}