type ApiFetch = (path: string, options?: RequestInit) => Promise<any>;

export const getFriends = (apiFetch: ApiFetch) =>
  apiFetch('/friends');

export const getPendingRequests = (apiFetch: ApiFetch) =>
  apiFetch('/friends/requests');

export const searchUsers = (apiFetch: ApiFetch, keyword: string) =>
  apiFetch(`/friends/search?keyword=${encodeURIComponent(keyword)}`);

export const sendRequest = (apiFetch: ApiFetch, receiverId: string) =>
  apiFetch('/friends/request', {
    method: 'POST',
    body: JSON.stringify({ receiverId }),
  });

export const acceptRequest = (apiFetch: ApiFetch, requestId: string) =>
  apiFetch(`/friends/accept/${requestId}`, { method: 'POST' });

export const rejectRequest = (apiFetch: ApiFetch, requestId: string) =>
  apiFetch(`/friends/reject/${requestId}`, { method: 'POST' });