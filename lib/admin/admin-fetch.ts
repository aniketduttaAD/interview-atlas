/** Include session cookie from `POST /api/admin/login` on admin API calls. */
export function adminCredentials(): Pick<RequestInit, 'credentials'> {
  return { credentials: 'include' };
}

export function adminJsonHeaders(): HeadersInit {
  return { 'Content-Type': 'application/json' };
}

export function adminPostJsonInit(body: unknown): RequestInit {
  return {
    ...adminCredentials(),
    method: 'POST',
    headers: adminJsonHeaders(),
    body: JSON.stringify(body),
  };
}
