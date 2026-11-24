import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../context/AuthContext'

import type { Screening } from '../../api/screenings'
import { getMyRsvpScreenings } from '../../api/screenings'
import Loader from '../../components/Loader/Loader'
import Heading from '../../components/Heading/Heading'

const LOCALE_MAP: Record<string, string> = {
    en: 'en-GB',
    fr: 'fr-FR',
    zh: 'zh-CN',
    ch: 'zh-CN',
}

const WEEKDAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const

export default function CalendarPage() {
    const { t, i18n } = useTranslation()
    const navigate = useNavigate()
    const [screenings, setScreenings] = useState<Screening[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const { apiFetch } = useAuth()
    const [currentDate, setCurrentDate] = useState(new Date())

    const currentLang = i18n.language?.toLowerCase().split('-')[0] || 'en'
    const dateLocale = LOCALE_MAP[currentLang] || 'en-GB'

    const getLocalizedTitle = (s: Screening) => {
        const translated =
            s.titleTranslations?.[currentLang] ||
            (currentLang === 'ch' ? s.titleTranslations?.zh : undefined)
        return translated || s.filmTitle
    }

    useEffect(() => {
        setIsLoading(true)

        getMyRsvpScreenings(apiFetch)
            .then((data: Screening[]) => {
                const goingList = data.filter((s) => s.isGoing)
                setScreenings(goingList)
                setIsLoading(false)
            })
            .catch((err) => {
                console.error("Failed to fetch calendar screenings:", err)
                setScreenings([])
                setIsLoading(false)
            })
    }, [apiFetch])

    const prevMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))
    }
    const nextMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))
    }

    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    const firstDayIndex = new Date(year, month, 1).getDay()
    const offset = firstDayIndex === 0 ? 6 : firstDayIndex - 1
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const calendarCells = []
    for (let i = 0; i < offset; i++) {
        calendarCells.push({ empty: true, key: `empty-${i}` })
    }
    for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
        calendarCells.push({ empty: false, day, dateStr, key: dateStr })
    }
    const monthTitle = currentDate.toLocaleDateString(dateLocale, { month: 'long', year: 'numeric' })

    if (isLoading) {
        return <main className="py-12 px-10"><Loader text={t('calendar.loading')} /></main>
    }

    return (
        <main className="max-w-[1000px] mx-auto py-12 px-6">
            <div className="flex flex-col sm:flex-row items-center justify-between mb-8 gap-4">
                <div>
                    <Heading className="tracking-tight">
                        {t('calendar.heading')}
                    </Heading>
                    <p className="text-[14px] text-gray-500 mt-1">
                        {t('calendar.subtitle')}
                    </p>
                </div>

                <div className="flex items-center gap-4 bg-surface border border-border px-4 py-2 rounded-xl shadow-card">
                    <button
                        onClick={prevMonth}
                        className="p-1 hover:bg-gray-100 rounded-lg transition-colors text-gray-600 font-semibold"
                    >
                        ← {t('calendar.prev')}
                    </button>
                    <span className="font-serif font-bold text-gray-800 min-w-[120px] text-center capitalize">
                        {monthTitle}
                    </span>
                    <button
                        onClick={nextMonth}
                        className="p-1 hover:bg-gray-100 rounded-lg transition-colors text-gray-600 font-semibold"
                    >
                        {t('calendar.next')} →
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-7 gap-2 mb-2 text-center font-medium text-xs text-gray-400 uppercase tracking-wider">
                {WEEKDAYS.map((day) => (
                    <div key={day}>{t(`calendar.weekdays.${day}`)}</div>
                ))}
            </div>

            <div className="grid grid-cols-7 gap-2">
                {calendarCells.map((cell) => {
                    if (cell.empty) {
                        return <div key={cell.key} className="h-32 bg-gray-50/50 border border-gray-100 rounded-xl opacity-40"></div>
                    }
                    const dayScreenings = screenings.filter((s) => {
                        if (!s.startsAt) return false
                        const sDate = new Date(s.startsAt)
                        return (
                            sDate.getFullYear() === year &&
                            sDate.getMonth() === month &&
                            sDate.getDate() === cell.day
                        )
                    })
                    return (
                        <div
                            key={cell.key}
                            className="h-32 bg-surface border border-border rounded-xl p-2 flex flex-col overflow-y-auto shadow-sm hover:border-gray-300 transition-colors"
                        >
                            <span className="text-xs font-semibold text-gray-500 mb-1">
                                {cell.day}
                            </span>
                            <div className="flex flex-col gap-1.5 flex-1">
                                {dayScreenings.map((s) => {
                                    const sDate = new Date(s.startsAt)
                                    const timeStr = sDate.toLocaleTimeString(dateLocale, {
                                        hour: '2-digit',
                                        minute: '2-digit'
                                    })
                                    const isPast = sDate < new Date()
                                    const displayTitle = getLocalizedTitle(s)
                                    return (
                                        <div
                                            key={s.id}
                                            onClick={() => navigate(`/screenings/${s.id}`)}
                                            title={t('calendar.eventTooltip', { title: displayTitle, time: timeStr })}
                                            className={`group border rounded-lg p-1.5 cursor-pointer transition-all text-left
                                                ${isPast
                                                    ? 'bg-gray-50 border-gray-100 opacity-60'
                                                    : 'bg-white hover:bg-brand/10 border-gray-200 hover:border-brand/30 shadow-sm'
                                                }`}
                                        >
                                            <p className={`text-[11px] font-semibold truncate transition-colors
                                                ${isPast
                                                    ? 'text-gray-400'
                                                    : 'text-gray-800 group-hover:text-brand'
                                                }`}
                                            >
                                                {displayTitle}
                                            </p>
                                            <p className={`text-[10px] mt-0.5 truncate
                                                ${isPast ? 'text-gray-400' : 'text-gray-500'}`}
                                            >
                                                {timeStr} {s.cinemaName ? `· ${s.cinemaName}` : ''}
                                            </p>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    )
                })}
            </div>
        </main>
    )
}