import { getBackendUrl } from './backend-url.mjs';

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
  token?: string,
): Promise<T> {
  const headers = new Headers(options.headers);
  if (options.body && !(options.body instanceof FormData))
    headers.set('Content-Type', 'application/json');
  if (token) headers.set('Authorization', `Bearer ${token}`);

  // Browsers use the same-origin Next.js proxy. Server components call C# directly.
  const base = typeof window === 'undefined' ? getBackendUrl() : '';
  const response = await fetch(`${base}${path}`, { ...options, headers });
  if (!response.ok) {
    let message = 'No pudimos completar la solicitud.';
    try {
      const payload = (await response.json()) as {
        message?: string;
        title?: string;
      };
      message = payload.message ?? payload.title ?? message;
    } catch {}
    throw new ApiError(response.status, message);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}
