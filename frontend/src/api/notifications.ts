// What useAuth().apiFetch looks like: like a C function-pointer typedef
type ApiFetch = (path: string, options?: RequestInit) => Promise<any>

// Mirrors the NotificationType enum in backend/prisma/schema.prisma
export type NotificationType =
    | 'FRIEND_REQUEST'
    | 'FRIEND_ACCEPTED'
    | 'CLUB_PICK'
    | 'CLUB_PICK_REMOVED'
    | 'FRIEND_RSVP'
    | 'ROLE_CHANGED'
//    | 'EVENT_CANCELLED' // if event is cancelled (outside CineClub user's scope)

// One row from GET /notifications (dates arrive as ISO strings in JSON)
export type NotificationItem = {
    id: string
    type: NotificationType
    payload: Record<string, string>   // e.g. filmTitle, cinemaName, startsAt, screeningId
    readAt: string | null             // null = unread
    createdAt: string
    actor: { id: string; displayName: string; avatarUrl: string | null } | null
}

export const getNotifications = (apiFetch: ApiFetch): Promise<NotificationItem[]> =>
    apiFetch('/notifications')

export const markNotificationRead = (apiFetch: ApiFetch, id: string): Promise<null> =>
    apiFetch(`/notifications/${id}/read`, { method: 'PATCH' })

export const markAllNotificationsRead = (apiFetch: ApiFetch): Promise<{ count: number }> =>
    apiFetch('/notifications/read-all', { method: 'PATCH' })
