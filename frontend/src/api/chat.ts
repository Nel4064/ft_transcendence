type ApiFetch = (path: string, options?: RequestInit) => Promise<any>;

export const getDirectHistory = (apiFetch: ApiFetch, friendId: string, limit = 50) =>
	apiFetch(`/chat/direct/${friendId}?limit=${limit}`);

export const getGroupHistory = (apiFetch: ApiFetch, screeningId: string, limit = 50) =>
	apiFetch(`/chat/group/${screeningId}?limit=${limit}`);