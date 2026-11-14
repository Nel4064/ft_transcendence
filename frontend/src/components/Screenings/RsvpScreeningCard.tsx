import { Link } from 'react-router-dom'
import { useState, useEffect } from 'react'
import Icon from '../Icon/Icon'

interface RsvpCardProps {
    id: string;
    movie: string;
    image: string;
    cinema: string;
    dateFormatted: string;
    initialIsGoing: boolean;
    initialGoingCount: number;
    onRsvp: (id: string) => Promise<void>;
    disabled?: boolean; 
}

export default function RsvpScreeningCard({
    id,
    movie,
    image,
    cinema,
    dateFormatted,
    initialIsGoing,
    initialGoingCount,
    onRsvp,
    disabled
}: RsvpCardProps) {
    const [isGoing, setIsGoing] = useState(initialIsGoing);
    const [goingCount, setGoingCount] = useState(initialGoingCount);
    const [isProcessing, setIsProcessing] = useState(false);

    useEffect(() => {
        setIsGoing(initialIsGoing);
        setGoingCount(initialGoingCount);
    }, [initialIsGoing, initialGoingCount]);

    const handleClick = async () => {
        if (isProcessing || disabled) return;

        setIsProcessing(true);
        const newIsGoing = !isGoing;

        setIsGoing(newIsGoing);
        setGoingCount(prev => prev + (newIsGoing ? 1 : -1));

        try {
            await onRsvp(id);
        } catch (error) {
            setIsGoing(!newIsGoing);
            setGoingCount(prev => prev + (newIsGoing ? -1 : 1));
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="flex items-center justify-between p-4 bg-surface border border-border rounded-lg shadow-card">
            <Link to={`/screenings/${id}`} className="flex items-center gap-4 flex-1 hover:opacity-80 transition-opacity">
                <img src={image} alt={movie} className="w-16 h-24 object-cover rounded-md shadow-card" />
                <div className="flex flex-col">
                    <h3 className="font-serif font-bold text-[18px] text-text mb-1">{movie}</h3>
                    <p className="flex gap-2 items-center text-body text-text font-medium">
                        <Icon name="calendar-event" />
                        {dateFormatted}
                    </p>
                    <p className="flex gap-2 items-center text-body text-text-muted mt-1">
                        <Icon name="map-pin" />
                        {cinema}
                    </p>
                </div>
            </Link>

            <div className="flex flex-col items-end shrink-0 pl-4 border-l border-border">
                <p className="text-sm text-gray-400 mb-2">{goingCount} going</p>
                <button
                    onClick={handleClick}
                    disabled={isProcessing || disabled}
                    className={`px-6 py-2 text-[14px] font-semibold rounded-xl transition-colors
                        ${disabled ? 'opacity-50 cursor-not-allowed' : ''} 
                        ${isGoing
                            ? 'bg-green-100 text-green-800 border border-transparent'
                            : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                        }`}
                >
                    {isProcessing ? '...' : (isGoing ? 'Going ✓' : 'RSVP')}
                </button>
            </div>
        </div>
    )
}