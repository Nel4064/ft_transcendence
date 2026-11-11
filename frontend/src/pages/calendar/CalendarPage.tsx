import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiFetch } from '../../context/AuthContext'

type Screening = {
    id: string
    filmTitle: string
    posterUrl: string | null
    startsAt: string
    cinemaName?: string
    isGoing: boolean
}

export default function CalendarPage() {
    const navigate = useNavigate()
    const [screenings, setScreenings] = useState<Screening[]>([])
    const [isLoading, setIsLoading] = useState(true)
    
    // Current year and month being displayed (defaults to local current time)
    const [currentDate, setCurrentDate] = useState(new Date())

    useEffect(() => {
        setIsLoading(true)
        apiFetch('/screenings/myrsvps')
            .then((data: Screening[]) => {
                // Keep only the screenings that the user confirmed attending (isGoing)
                const goingList = data.filter((s) => s.isGoing)
                setScreenings(goingList)
                setIsLoading(false)
            })
            .catch((err) => {
                console.error("Failed to fetch calendar screenings:", err)
                setScreenings([])
                setIsLoading(false)
            })
    }, [])

    // Month switching logic
    const prevMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))
    }
    const nextMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))
    }

    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()

    // Get the day of the week for the first day of the current month (0-6)
    const firstDayIndex = new Date(year, month, 1).getDay()
    // Adjust to make Monday the start of the week
    const offset = firstDayIndex === 0 ? 6 : firstDayIndex - 1

    // Get the total number of days in the current month
    const daysInMonth = new Date(year, month + 1, 0).getDate()

    // Generate calendar cell array
    const calendarCells = []
    // 1. Fill in blank cells from the previous month
    for (let i = 0; i < offset; i++) {
        calendarCells.push({ empty: true, key: `empty-${i}` })
    }
    // 2. Fill in each day of the current month
    for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
        calendarCells.push({ empty: false, day, dateStr, key: dateStr })
    }

    // Format month title display (e.g., "June 2026")
    const monthTitle = currentDate.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })

    if (isLoading) {
        return <main className="py-12 px-10 text-center"><p className="text-gray-400">Loading your calendar...</p></main>
    }

    return (
        <main className="max-w-[1000px] mx-auto py-12 px-6">
            {/* Header & Month Navigation */}
            <div className="flex flex-col sm:flex-row items-center justify-between mb-8 gap-4">
                <div>
                    <h1 className="font-serif text-[28px] md:text-[32px] font-bold text-gray-900 tracking-tight">
                        My Screening Calendar
                    </h1>
                    <p className="text-[14px] text-gray-500 mt-1">
                        Upcoming movie club sessions you are attending.
                    </p>
                </div>
                
                <div className="flex items-center gap-4 bg-surface border border-border px-4 py-2 rounded-xl shadow-card">
                    <button 
                        onClick={prevMonth}
                        className="p-1 hover:bg-gray-100 rounded-lg transition-colors text-gray-600 font-semibold"
                    >
                        ← Prev
                    </button>
                    <span className="font-serif font-bold text-gray-800 min-w-[120px] text-center">
                        {monthTitle}
                    </span>
                    <button 
                        onClick={nextMonth}
                        className="p-1 hover:bg-gray-100 rounded-lg transition-colors text-gray-600 font-semibold"
                    >
                        Next →
                    </button>
                </div>
            </div>

            {/* Weekday headers */}
            <div className="grid grid-cols-7 gap-2 mb-2 text-center font-medium text-xs text-gray-400 uppercase tracking-wider">
                <div>Mon</div><div>Tue</div><div>Wed</div><div>Thu</div><div>Fri</div><div>Sat</div><div>Sun</div>
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-2">
                {calendarCells.map((cell) => {
                    if (cell.empty) {
                        return <div key={cell.key} className="h-32 bg-gray-50/50 border border-gray-100 rounded-xl opacity-40"></div>
                    }

                    // Find all screenings corresponding to this day
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
                                    const timeStr = new Date(s.startsAt).toLocaleTimeString('en-GB', {
                                        hour: '2-digit', 
                                        minute: '2-digit'
                                    })

                                    return (
                                        <div
                                            key={s.id}
                                            onClick={() => navigate(`/screenings/${s.id}`)}
                                            title={`${s.filmTitle} at ${timeStr}`}
                                            className="group bg-gray-50 hover:bg-brand/10 border border-gray-200 hover:border-brand/30 rounded-lg p-1.5 cursor-pointer transition-all text-left"
                                        >
                                            <p className="text-[11px] font-semibold text-gray-800 truncate group-hover:text-brand">
                                                {s.filmTitle}
                                            </p>
                                            <p className="text-[10px] text-gray-500">
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