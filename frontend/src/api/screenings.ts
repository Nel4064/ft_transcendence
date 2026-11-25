import { t } from 'i18next';

export type Friend = {
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
};

export type ScreeningAttachment = {
    url: string;
    name: string;
};

export type Screening = {
    id: string;
    filmTitle: string;
    posterUrl: string | null;
    attachments?: ScreeningAttachment[];
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

// Upload avec XMLHttpRequest (et pas fetch) pour pouvoir suivre la progression
export const uploadScreeningFiles = (
    id: string,
    formData: FormData,
    onProgress: (percent: number) => void,
): Promise<Screening> =>
    new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', `/api/screenings/${id}/files`);

        const token = localStorage.getItem('token') || localStorage.getItem('jwt_token');
        if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);

        xhr.upload.onprogress = (e) => {
            if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
        };
        xhr.onload = () => {
            let data: any = null;
            try { data = JSON.parse(xhr.responseText); } catch { /* réponse non JSON (ex: 413 nginx) */ }
            if (xhr.status >= 200 && xhr.status < 300) {
                resolve(data);
            } else {
                reject(new Error(data?.message || t('screeningDetails.files.errors.uploadFailedWithStatus', { status: xhr.status })));
            }
        };
        xhr.onerror = () => reject(new Error(t('screeningDetails.files.errors.networkError')));
        xhr.send(formData); // pas de Content-Type : le navigateur le met tout seul
    });

export async function deleteScreeningFile(
    apiFetch: ApiFetch,
    id: string,
    kind: 'poster' | 'attachment',
    url?: string,
): Promise<Screening> {
    const query = url ? `?url=${encodeURIComponent(url)}` : '';
    try {
        return await apiFetch(`/api/screenings/${id}/files/${kind}${query}`, {
            method: 'DELETE',
        });
    } catch (err: any) {
        throw new Error(err?.message || t('screeningDetails.files.errors.deleteFailed'));
    }
}