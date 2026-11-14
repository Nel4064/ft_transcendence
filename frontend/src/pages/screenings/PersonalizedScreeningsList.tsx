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
        // 🌟 修改点 1：规范化 URL 大小写 (改为 my-rsvps)
        apiFetch('/screenings/my-rsvps')
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
        // 找到当前点击的卡片
        const targetScreening = screenings.find(s => s.id === screeningId);
        if (!targetScreening) return;

        const isCurrentlyGoing = targetScreening.isGoing;
        
        // 🌟 修改点 2：配合后端改为幂等的 PUT 和 DELETE
        const method = isCurrentlyGoing ? 'DELETE' : 'PUT';

        // 🌟 乐观更新：先在前端改状态，让界面响应更丝滑
        setScreenings(prev => prev.map(s => 
            s.id === screeningId 
                ? { ...s, isGoing: !isCurrentlyGoing, totalGoingCount: isCurrentlyGoing ? s.totalGoingCount - 1 : s.totalGoingCount + 1 } 
                : s
        ));

        try {
            await apiFetch(`/screenings/${screeningId}/rsvp`, { method });
        } catch (error: any) {
            // 如果请求失败，回滚状态
            setScreenings(prev => prev.map(s => 
                s.id === screeningId 
                    ? { ...s, isGoing: isCurrentlyGoing, totalGoingCount: isCurrentlyGoing ? s.totalGoingCount + 1 : s.totalGoingCount - 1 } 
                    : s
            ));

            const errText = String(error?.message || error);
            
            // 匹配 404 (活动被删) 或 400 (已过期活动)
            const isNotFound = error?.status === 404 || errText.includes('404') || errText.includes('Not Found') || errText.includes("La séance n'est plus disponible");
            const isBadRequest = error?.status === 400 || errText.includes('passée');

            if (isNotFound) {
                alert("Désolé, cette séance a été annulée ou n'est plus disponible.");
                // 🌟 修改点 3：遇到 404 错误时，平滑地将该失效卡片从列表中移除
                setScreenings(prev => prev.filter(s => s.id !== screeningId));
            } else if (isBadRequest) {
                alert("Vous ne pouvez pas modifier le RSVP pour une séance passée.");
            } else {
                alert("Une erreur est survenue lors de l'enregistrement de votre RSVP.");
            }
        }
    }

    return (
        <div className="w-3/4 max-w-[800px] mx-auto py-6 px-4 md:px-0">
            {/* 🌟 修改点 4：无论数据是否加载完毕，Header 永远保留显示，避免整个页面被 Loading 吞噬 */}
            <div className="mb-6 text-left">
                <h1 className="font-serif text-[28px] md:text-[32px] font-bold text-gray-900 tracking-tight mb-1">
                    Upcoming — Club Picks
                </h1>
                <p className="text-[14px] text-gray-500">
                    Real screenings, curated by the club from independent cinemas nearby.
                </p>
            </div>

            {/* 把 Loading 和 空状态 判断移到了内容区域 */}
            {isLoading ? (
                <p className="text-gray-400 py-4">Loading screenings...</p>
            ) : screenings.length === 0 ? (
                <p className="text-gray-400 py-4">No upcoming screenings yet.</p>
            ) : (
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
            )}
        </div>
    )
}