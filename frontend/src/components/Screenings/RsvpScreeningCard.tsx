import { Link } from 'react-router-dom'
import { useState } from 'react'

type RsvpCardProps = {
    id: string
    movie: string
    image?: string
    cinema: string
    dateFormatted: string
    initialIsGoing: boolean
    initialGoingCount: number
    onRsvp: (id: string) => Promise<void>
}

// 这是带有 RSVP 按钮的长条形卡片样式
export default function RsvpScreeningCard({ 
    id, movie, image, cinema, dateFormatted, initialIsGoing, initialGoingCount, onRsvp
}: RsvpCardProps) {
    const [isGoing, setIsGoing] = useState(initialIsGoing);
    const [goingCount, setGoingCount] = useState(initialGoingCount);

    const handleRsvpClick = async (e: React.MouseEvent) => {
        e.preventDefault();
        const newIsGoing = !isGoing;
        setIsGoing(newIsGoing);
        setGoingCount(newIsGoing ? goingCount + 1 : goingCount - 1);
        try {
            await onRsvp(id);
        } catch (error) {
            setIsGoing(!newIsGoing);
            setGoingCount(newIsGoing ? goingCount - 1 : goingCount + 1);
        }
    }

    return (
        <div className="flex items-center justify-between p-4 bg-surface border border-border rounded-xl shadow-card transition-transform hover:-translate-y-1">
            <Link to={`/screenings/${id}`} className="flex items-center space-x-4 flex-grow">
                {image ? (
                    <img src={image} alt={movie} className="w-16 h-16 shrink-0 object-cover rounded-md" />
                ) : (
                    <div className="w-16 h-16 bg-[#eaddcf] shrink-0 rounded-md"></div> 
                )}
                <div className="flex flex-col text-left">
                    <h3 className="font-serif font-bold text-lg text-text hover:underline">{movie}</h3>
                    <p className="text-sm text-gray-500">{cinema} · {dateFormatted}</p>
                    <p className="text-sm text-gray-400 mt-0.5">{goingCount} going</p>
                </div>
            </Link>
            <button
                onClick={handleRsvpClick}
                className={`ml-4 px-6 py-2 text-sm font-medium rounded-xl transition-colors shrink-0 ${
                    isGoing ? 'bg-[#dcfce7] text-[#166534]' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
            >
                {isGoing ? 'Going ✓' : 'RSVP'}
            </button>
        </div>
    )
}