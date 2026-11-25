import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import defaultMovie from '../../assets/default-movie.jpg'
import { useAuth } from '../../context/AuthContext'
import Button from '../../components/button/Button'
import Avatar from '../../components/Avatar/Avatar'
import Icon from '../../components/Icon/Icon'
import type { Screening } from '../../api/screenings'
import { getScreening, rsvp, cancelRsvp, removeScreening } from '../../api/screenings'
import Loader from '../../components/Loader/Loader'
import Heading from '../../components/Heading/Heading'
import ScreeningFilesManager from '../../components/ScreeningFiles/ScreeningFilesManager'


const posterClass = "w-64 shrink-0 self-start rounded-md shadow-card"
const synopsisClass = "text-body text-text-muted"
const boxClass = "p-4 bg-surface border border-border rounded-lg shadow-card"

const LOCALE_MAP: Record<string, string> = {
    en: 'en-GB',
    fr: 'fr-FR',
    ch: 'zh-CN',
    zh: 'zh-CN',
}

// 118 -> "1h58"
function formatRuntime(minutes: number) {
    const h = Math.floor(minutes / 60)
    const m = String(minutes % 60).padStart(2, '0')
    return `${h}h${m}`
}

function ScreenDetailsPage() {
    const { t, i18n } = useTranslation()
    const { id } = useParams()
    const navigate = useNavigate()

    const { user, apiFetch } = useAuth()
    const [screening, setScreening] = useState<Screening | null>(null)
    const [isLoading, setIsLoading] = useState(true)

    const currentLang = i18n.language?.split('-')[0] || 'en'
    const dateLocale = LOCALE_MAP[currentLang] || 'en-GB'

    const pickLang = (map?: Record<string, string> | null) =>
        map?.[currentLang] || (currentLang === 'ch' ? map?.zh : undefined)

    const displayTitle = screening
        ? (pickLang(screening.titleTranslations) || screening.filmTitle)
        : ''
    const displaySynopsis = screening
        ? (pickLang(screening.synopsisTranslations) || screening.synopsis)
        : null

    useEffect(() => {
        if (!id) return;
        setIsLoading(true);
        getScreening(apiFetch, id)
            .then((data: Screening) => {
                setScreening(data);
            })
            .catch((error) => {
                console.error(error);
                setScreening(null);
            })
            .finally(() => {
                setIsLoading(false);
            })
    }, [id, apiFetch])

    const handleRsvpClick = async () => {
        if (!screening) return;

        const newIsGoing = !screening.isGoing;
        const currentCount = screening.totalGoingCount || 0;

        setScreening({
            ...screening,
            isGoing: newIsGoing,
            totalGoingCount: newIsGoing ? currentCount + 1 : currentCount - 1
        });

        try {
            if (screening.isGoing) {
                await cancelRsvp(apiFetch, screening.id);
            } else {
                await rsvp(apiFetch, screening.id);
            }
        } catch (error: any) {
            setScreening({
                ...screening,
                isGoing: !newIsGoing,
                totalGoingCount: newIsGoing ? currentCount - 1 : currentCount + 1
            });

            const errText = String(error?.message || error);
            const isNotFound = error?.status === 404 || errText.includes('404') || errText.includes('Not Found') || errText.includes("La séance n'est plus disponible");
            const isBadRequest = error?.status === 400 || errText.includes('passée');

            if (isNotFound) {
                alert(t('screeningDetails.errors.notFound'));
                navigate('/screenings');
            } else if (isBadRequest) {
                alert(t('screeningDetails.errors.pastSession'));
            } else {
                alert(t('screeningDetails.errors.saveFailed'));
            }
        }
    };

    async function handleRemove() {
        if (!screening || !screening.externalCinemaId || !screening.externalShowId) return
        await removeScreening(apiFetch, screening.externalCinemaId, screening.externalShowId)
        navigate('/screenings')
    }

    const formatICSDate = (date: Date) => {
        return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    };

    const handleIcsDownload = () => {
        if (!screening) return;
        const startDate = new Date(screening.startsAt);
        const endDate = new Date(startDate.getTime() + 2 * 60 * 60 * 1000);

        const icsContent = [
            "BEGIN:VCALENDAR",
            "VERSION:2.0",
            "PRODID:-//MovieClub//EN",
            "BEGIN:VEVENT",
            `DTSTART:${formatICSDate(startDate)}`,
            `DTEND:${formatICSDate(endDate)}`,
            `SUMMARY:🎬 ${displayTitle}`,
            `DESCRIPTION:${displaySynopsis || t('screeningDetails.calendar.defaultDescription')}`,
            `LOCATION:${screening.cinemaName}, ${screening.cinemaAddress}, ${screening.cinemaCity}`,
            "BEGIN:VALARM",
            "TRIGGER:-PT1H",
            "ACTION:DISPLAY",
            `DESCRIPTION:${t('screeningDetails.calendar.reminder')}`,
            "END:VALARM",
            "END:VEVENT",
            "END:VCALENDAR"
        ].join('\n');
        const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
        const link = document.createElement('a');
        link.href = window.URL.createObjectURL(blob);
        link.download = `${displayTitle.replace(/\s+/g, '_')}_screening.ics`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleGoogleCalendar = () => {
        if (!screening) return;
        const startDate = new Date(screening.startsAt);
        const endDate = new Date(startDate.getTime() + 2 * 60 * 60 * 1000);
        const title = encodeURIComponent(`🎬 ${displayTitle}`);
        const details = encodeURIComponent(displaySynopsis || t('screeningDetails.calendar.defaultDescription'));
        const location = encodeURIComponent(`${screening.cinemaName}, ${screening.cinemaAddress}, ${screening.cinemaCity}`);
        const dates = `${formatICSDate(startDate)}/${formatICSDate(endDate)}`;

        const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${dates}&details=${details}&location=${location}`;
        window.open(url, '_blank');
    };

    if (isLoading) {
        return <main className="py-12 px-10"><Loader /></main>
    }

    if (!screening) {
        return (
            <main className="py-12 px-10 flex flex-col items-center justify-center text-center">
                <h2 className="text-xl font-bold text-text mb-2">{t('screeningDetails.unavailable.heading')}</h2>
                <p className="text-text-muted mb-4">{t('screeningDetails.unavailable.message')}</p>
                <Button variant="primary" onClick={() => navigate('/screenings')}>
                    {t('screeningDetails.unavailable.backButton')}
                </Button>
            </main>
        )
    }

    const start = new Date(screening.startsAt)
    const date = start.toLocaleDateString(dateLocale, { weekday: 'long', day: 'numeric', month: 'long' })
    const time = start.toLocaleTimeString(dateLocale, { hour: '2-digit', minute: '2-digit' })
    const friendsList = screening.friendsGoing || [];

    return (
        <main className="max-w-[1000px] mx-auto py-12 px-10">
            <section className="flex flex-col md:flex-row gap-8 mb-12">
                <img src={screening.posterUrl ?? defaultMovie} alt={displayTitle} className={posterClass} />
                <div>
                    <Heading className="mb-4">{displayTitle}</Heading>
                    <dl className="mb-4 flex flex-col gap-1 text-body">
                        {screening.director && (
                            <div>
                                <dt className="inline font-bold text-text">{t('screeningDetails.director')} </dt>
                                <dd className="inline text-text-muted">{screening.director}</dd>
                            </div>
                        )}
                        {screening.cast && (
                            <div>
                                <dt className="inline font-bold text-text">{t('screeningDetails.cast')} </dt>
                                <dd className="inline text-text-muted">{screening.cast}</dd>
                            </div>
                        )}
                        {screening.runtimeMinutes && (
                            <div>
                                <dt className="inline font-bold text-text">{t('screeningDetails.duration')} </dt>
                                <dd className="inline text-text-muted">{formatRuntime(screening.runtimeMinutes)}</dd>
                            </div>
                        )}
                    </dl>
                    <p className={synopsisClass}>{displaySynopsis ?? t('screeningDetails.noSynopsis')}</p>
                    <p className={synopsisClass}>{screening.synopsis ?? 'No synopsis available.'}</p>
                    {screening.attachments && screening.attachments.length > 0 && (
                        <div className="mt-4 text-body flex flex-wrap items-center gap-x-3 gap-y-1">
                            <span className="font-bold text-text">{t('screeningDetails.moreInformation')}</span>
                            {screening.attachments.map((item) => (
                                <a
                                    key={item.url}
                                    href={item.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-text-muted underline"
                                >
                                    {item.name}
                                </a>
                            ))}
                        </div>
                    )}
                    {screening.trailerUrl && (
                        <section className="mt-6">
                            <Heading level="section" className="mb-4">{t('screeningDetails.trailer')}</Heading>
                            <div className={boxClass}>
                                <video src={screening.trailerUrl} controls className="w-full rounded-md" />
                            </div>
                        </section>
                    )}
                </div>
            </section>
            <ul className="flex flex-col gap-4 mt-6">
                <li key={screening.id} className="flex items-center justify-between p-4 bg-surface border border-border rounded-lg text-body text-text-muted">
                    <div>
                        <p className="flex gap-2 items-center text-body text-text font-medium">
                            <Icon name="calendar-event" />
                            {t('screeningDetails.dateAtTime', { date, time })}{screening.version && ` · ${screening.version}`}
                        </p>
                        <p className="flex gap-2 items-center text-body text-text-muted mt-1 mb-3">
                            <Icon name="map-pin" />
                            {screening.cinemaName} - {screening.cinemaAddress}, {screening.cinemaCity}
                        </p>
                        {screening.isGoing && new Date(screening.startsAt) >= new Date() && (
                            <div className="flex gap-3 ml-6 mb-2">
                                <button
                                    onClick={handleGoogleCalendar}
                                    className="text-[12px] font-medium text-brand hover:text-brand/80 transition-colors border border-brand/30 rounded px-2 py-1 flex items-center gap-1 bg-brand/5"
                                >
                                    {t('screeningDetails.calendar.google')}
                                </button>
                                <button
                                    onClick={handleIcsDownload}
                                    className="text-[12px] font-medium text-brand hover:text-brand/80 transition-colors border border-brand/30 rounded px-2 py-1 flex items-center gap-1 bg-brand/5"
                                >
                                    {t('screeningDetails.calendar.ics')}
                                </button>
                            </div>
                        )}

                        <p className="text-sm text-gray-400 mt-1 ml-6">
                            {t('screeningDetails.goingCount', { count: screening.totalGoingCount || 0 })}
                        </p>
                    </div>
                    <button
                        onClick={handleRsvpClick}
                        disabled={new Date(screening.startsAt) < new Date()}
                        className={`ml-4 px-6 py-2 text-[14px] font-semibold rounded-xl transition-colors shrink-0 
                            ${new Date(screening.startsAt) < new Date() ? 'opacity-50 cursor-not-allowed ' : ''} 
                            ${screening.isGoing
                                ? 'bg-green-100 text-green-800 border border-transparent'
                                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                            }`}
                    >
                        {screening.isGoing ? t('screeningDetails.actions.going') : t('screeningDetails.actions.rsvp')}
                    </button>
                </li>

                <li className="flex items-center justify-between p-4 bg-surface border border-border rounded-lg text-body text-text-muted ">
                    <div>
                        <p className="text-body text-text font-medium">
                            {friendsList.length > 0
                                ? t('screeningDetails.friendsGoing', { count: friendsList.length })
                                : t('screeningDetails.noFriendsGoing')}
                        </p>
                        <ul className="flex flex-wrap gap-2 mt-3">
                            {friendsList.map((friend) => (
                                <li key={friend.id} title={friend.username}>
                                    <Link
                                        to={`/users/${friend.id}`}
                                        className="block hover:opacity-80 hover:scale-105 transition-all duration-200 cursor-pointer"
                                    >
                                        <Avatar
                                            name={friend.displayName || friend.username}
                                            src={friend.avatarUrl}
                                            size={40}
                                        />
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>
                </li>

                <div className={boxClass}>
                    {t('screeningDetails.chatPlaceholder')}
                </div>
            </ul>



            {user?.role === 'ADMIN' && (
                <>
                    <ScreeningFilesManager
                        screening={screening}
                        onUpdated={(updated) => setScreening((s) => s && { ...s, ...updated })}
                    />
                    <div className="flex justify-end mt-4">
                        <Button
                            variant="admin"
                            size="lg"
                            onClick={handleRemove}
                            disabled={new Date(screening.startsAt) < new Date()}
                            className={new Date(screening.startsAt) < new Date() ? 'opacity-50 cursor-not-allowed' : ''}
                        >
                            {t('screeningDetails.actions.removeEvent')}
                        </Button>
                    </div>
                </>
            )}
        </main>
    )
}

export default ScreenDetailsPage