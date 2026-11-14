import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import defaultMovie from '../../assets/default-movie.jpg'
import { useAuth } from '../../context/AuthContext'
import Button from '../../components/button/Button'
import Avatar from '../../components/Avatar/Avatar'

// 🌟 1. 引入统一定义的类型和 API 方法（注意 type 和方法的拆分导入，避免 verbatimModuleSyntax 报错）
import type { Friend, Screening } from '../../api/screenings'
import { getScreening, rsvp, cancelRsvp, removeScreening } from '../../api/screenings'

const posterClass = "w-64 shrink-0 self-start rounded-md shadow-card"
const titleClass = "mb-4 font-serif font-bold text-title text-text"
const synopsisClass = "text-body text-text-muted"
const sectionTitleClass = "mb-4 font-serif font-bold text-section text-text"
const boxClass = "p-4 bg-surface border border-border rounded-lg shadow-card"

function ScreenDetailsPage() {
    const { id } = useParams()
    const navigate = useNavigate()
    
    // 🌟 2. 从 useAuth 获取 apiFetch
    const { user, apiFetch } = useAuth()
    const [screening, setScreening] = useState<Screening | null>(null)
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        if (!id) return; // 确保 id 存在

        setIsLoading(true);
        // 🌟 3. 使用封装好的 getScreening 方法
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
        const currentCount = screening.totalGoingCount || 0; // 避免 undefined 计算报错
        
        // 乐观更新
        setScreening({
            ...screening,
            isGoing: newIsGoing,
            totalGoingCount: newIsGoing ? currentCount + 1 : currentCount - 1
        });

        try {
            // 🌟 4. 根据状态调用 rsvp() 或 cancelRsvp()
            if (screening.isGoing) {
                await cancelRsvp(apiFetch, screening.id);
            } else {
                await rsvp(apiFetch, screening.id);
            }
        } catch (error: any) {
            // 回滚状态
            setScreening({
                ...screening,
                isGoing: !newIsGoing,
                totalGoingCount: newIsGoing ? currentCount - 1 : currentCount + 1
            });
            
            const errText = String(error?.message || error);
            const isNotFound = error?.status === 404 || errText.includes('404') || errText.includes('Not Found') || errText.includes("La séance n'est plus disponible");
            const isBadRequest = error?.status === 400 || errText.includes('passée');

            if (isNotFound) {
                alert("Désolé, cette séance a été annulée ou n'est plus disponible.");
                navigate('/screenings');
            } else if (isBadRequest) {
                alert("Vous ne pouvez pas modifier le RSVP pour une séance passée.");
            } else {
                alert("Une erreur est survenue lors de l'enregistrement de votre RSVP.");
            }
        }
    };

    async function handleRemove() {
        if (!screening || !screening.externalCinemaId || !screening.externalShowId) return
        
        // 🌟 5. 使用封装好的 removeScreening 方法
        await removeScreening(apiFetch, screening.externalCinemaId, screening.externalShowId)
        
        navigate('/')
    }

    // Loading 渲染逻辑
    if (isLoading) {
        return <main className="py-12 px-10"><p>Loading...</p></main>
    }

    // 404 渲染逻辑
    if (!screening) {
        return (
            <main className="py-12 px-10 flex flex-col items-center justify-center text-center">
                <h2 className="text-xl font-bold text-text mb-2">Screening Unavailable</h2>
                <p className="text-text-muted mb-4">This screening no longer exists or has been removed.</p>
                <Button variant="primary" onClick={() => navigate('/screenings')}>Back to Screenings</Button>
            </main>
        )
    }

    const start = new Date(screening.startsAt)
    const date = start.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })
    const time = start.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })

    const friendsList = screening.friendsGoing || [];

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

            <ul className="flex flex-col gap-4 mt-6">
                <li key={screening.id} className="flex items-center justify-between p-4 bg-surface border border-border rounded-lg text-body text-text-muted">
                    <div>
                        <p className="text-body text-text font-medium">{date} at {time}{screening.version && ` · ${screening.version}`}</p>
                        <p className="text-body text-text-muted mt-1">{screening.cinemaName} · {screening.cinemaAddress}, {screening.cinemaCity}</p>
                        <p className="text-sm text-gray-400 mt-1">{(screening.totalGoingCount || 0)} going</p>
                    </div>

                    <button
                        onClick={handleRsvpClick}
                        className={`ml-4 px-6 py-2 text-[14px] font-semibold rounded-xl transition-colors shrink-0 ${screening.isGoing
                            ? 'bg-green-100 text-green-800 border border-transparent'
                            : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                            }`}
                    >
                        {screening.isGoing ? 'Going ✓' : 'RSVP'}
                    </button>
                </li>

                <li className="flex items-center justify-between p-4 bg-surface border border-border rounded-lg text-body text-text-muted ">
                    <div>
                        <p className="text-body text-text font-medium">
                            {friendsList.length > 0 ? `${friendsList.length} friends going:` : 'No friends going yet'}
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
                    Add chat here
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