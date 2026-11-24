type ApiFetch = (path: string, options?: RequestInit) => Promise<any>;

export const getAdminMembers = (apiFetch: ApiFetch) =>
  apiFetch('/admin/manage-members');

export const updateMemberRole = (
  apiFetch: ApiFetch,
  id: string,
  role: 'ADMIN' | 'USER',
) =>
  apiFetch(`/admin/${id}/role`, {
    method: 'PATCH',
    body: JSON.stringify({ role }),
  });

export const removeMember = (apiFetch: ApiFetch, id: string) =>
  apiFetch(`/admin/${id}`, {
    method: 'DELETE',
  });

export const resignAdmin = (apiFetch: ApiFetch, id: string) =>
  apiFetch(`/admin/${id}/resign`, {
    method: 'POST',
  });

export const banMember = (apiFetch: ApiFetch, id: string) =>
  apiFetch(`/admin/${id}/ban`, {
    method: 'POST',
  });

export const unbanMember = (apiFetch: ApiFetch, id: string) =>
  apiFetch(`/admin/${id}/unban`, {
    method: 'POST',
  });