import { useEffect, useState } from 'react'
import RsvpScreeningCard from '../../components/Screenings/RsvpScreeningCard'
import defaultMovie from '../../assets/default-movie.jpg'
import { useAuth } from '../../context/AuthContext'

// 🌟 1. 从刚才新建的 api 文件中导入公共的类型和请求方法
import { type Screening, getMyRsvpScreenings, rsvp, cancelRsvp } from '../../api/screenings'

export default function ScreeningsList() {
    // 这里的 Screening 类型现在来自 api/screenings.ts
    const [screenings, setScreenings] = useState<Screening[]>([])
    const [isLoading, setIsLoading] = useState(true)
    
    // 🌟 2. 按照队友要求，通过 useAuth() 获取 apiFetch
    const { apiFetch } = useAuth()

    useEffect(() => {
        setIsLoading(true)
        // 🌟 3. 替换掉原来的 apiFetch('/screenings/my-rsvps')
        getMyRsvpScreenings(apiFetch)
            .then((data) => {
                setScreenings(data)
                setIsLoading(false)
            })
            .catch(() => {
                setScreenings([])
                setIsLoading(false)
            })
    }, [apiFetch]) // 记得把 apiFetch 加进依赖数组

 const handleRsvp = async (screeningId: string) => {
        const targetScreening = screenings.find(s => s.id === screeningId);
        if (!targetScreening) return;

        const isCurrentlyGoing = targetScreening.isGoing;

        // 🌟 乐观更新：先在前端改状态，让界面响应更丝滑
        setScreenings(prev => prev.map(s => 
            s.id === screeningId 
                ? { 
                    ...s, 
                    isGoing: !isCurrentlyGoing, 
                    // 👇 加上 (s.totalGoingCount || 0) 解决 undefined 报错
                    totalGoingCount: isCurrentlyGoing ? (s.totalGoingCount || 0) - 1 : (s.totalGoingCount || 0) + 1 
                  } 
                : s
        ));

        try {
            // 根据当前状态，调用不同的封装方法
            if (isCurrentlyGoing) {
                await cancelRsvp(apiFetch, screeningId);
            } else {
                await rsvp(apiFetch, screeningId);
            }
        } catch (error: any) {
            // 如果请求失败，回滚状态
            setScreenings(prev => prev.map(s => 
                s.id === screeningId 
                    ? { 
                        ...s, 
                        isGoing: isCurrentlyGoing, 
                        // 👇 同样加上 (s.totalGoingCount || 0) 解决 undefined 报错
                        totalGoingCount: isCurrentlyGoing ? (s.totalGoingCount || 0) + 1 : (s.totalGoingCount || 0) - 1 
                      } 
                    : s
            ));

            const errText = String(error?.message || error);
            
            // 匹配 404 (活动被删) 或 400 (已过期活动)
            const isNotFound = error?.status === 404 || errText.includes('404') || errText.includes('Not Found') || errText.includes("La séance n'est plus disponible");
            const isBadRequest = error?.status === 400 || errText.includes('passée');

            if (isNotFound) {
                alert("Désolé, cette séance a été annulée ou n'est plus disponible.");
                // 遇到 404 错误时，平滑地将该失效卡片从列表中移除
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
            {/* Header 永远保留显示，避免整个页面被 Loading 吞噬 */}
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