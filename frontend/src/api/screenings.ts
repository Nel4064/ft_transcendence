
export type Friend = {
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
};

export type Screening = {
    id: string;
    filmTitle: string;
    posterUrl: string | null;
    startsAt: string;
    cinemaName?: string;
    isGoing?: boolean;
    totalGoingCount?: number;
    cinemaAddress?: string;
    cinemaCity?: string;
    version?: string | null;
    externalCinemaId?: number;
    externalShowId?: string;
    synopsis?: string | null;
    trailerUrl?: string | null;
    director?: string | null;
    cast?: string | null;
    runtimeMinutes?: number | null;
    friendsGoingCount?: number;
    friendsGoing?: Friend[];
    titleTranslations?: Record<string, string> | null;
    synopsisTranslations?: Record<string, string> | null;
};

type ApiFetch = (endpoint: string, options?: RequestInit) => Promise<any>;

export const getMyRsvpScreenings = async (apiFetch: ApiFetch): Promise<Screening[]> => {
    return apiFetch('/screenings/my-rsvps');
};

export const getScreening = async (apiFetch: ApiFetch, id: string): Promise<Screening> => {
    return apiFetch(`/screenings/${id}`);
};

export const rsvp = async (apiFetch: ApiFetch, id: string) => {
    return apiFetch(`/screenings/${id}/rsvp`, { method: 'PUT' });
};

export const cancelRsvp = async (apiFetch: ApiFetch, id: string) => {
    return apiFetch(`/screenings/${id}/rsvp`, { method: 'DELETE' });
};

export const removeScreening = async (apiFetch: ApiFetch, cinemaId: number, showId: string) => {
    return apiFetch(`/screenings/${cinemaId}/${encodeURIComponent(showId)}`, { method: 'DELETE' });
};