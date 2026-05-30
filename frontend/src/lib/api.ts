import ky, { HTTPError } from 'ky'

export const api = ky.create({
  prefixUrl: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000',
  credentials: 'include',
  timeout: 15000,
  retry: 0,
  hooks: {
    beforeRequest: [
      (request) => {
        if (typeof window === 'undefined') return
        const token = localStorage.getItem('access_token')
        if (token) {
          request.headers.set('Authorization', `Bearer ${token}`)
        }
      }
    ]
  }
})

export { HTTPError }

interface ApiErrorBody {
  error?: string
  message?: string
  details?: { field: string; message: string }[]
}

/**
 * Extracts a human-readable message from a failed `ky` request.
 * Reads the JSON error body the backend sends ({ error, details }) instead of
 * ky's generic "Request failed with status code N" message.
 */
export async function parseApiError(err: unknown, fallback = 'Something went wrong, please try again'): Promise<string> {
  if (err instanceof HTTPError) {
    try {
      const body = (await err.response.json()) as ApiErrorBody
      if (body.details?.length) {
        // e.g. "Description: must NOT have fewer than 10 characters"
        return body.details
          .map(d => (d.field ? `${capitalize(d.field)}: ${d.message}` : d.message))
          .join(' · ')
      }
      return body.error ?? body.message ?? fallback
    } catch {
      // Body wasn't JSON (network error, timeout, etc.)
      if (err.response.status === 0) return 'Cannot reach the server. Is the backend running?'
      return fallback
    }
  }
  // Timeout / network failure before a response existed
  if (err && typeof err === 'object' && 'name' in err && (err as { name: string }).name === 'TimeoutError') {
    return 'The server took too long to respond. Please try again.'
  }
  return fallback
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1)
}