import { ProxiesResponse } from '@swagfront/shared'

type ApiErrorPayload = {
  error?: string
  details?: string
}

export async function fetchProxies(
  includeSamples: boolean
): Promise<ProxiesResponse> {
  const response = await fetch(`/api/proxies?includeSamples=${includeSamples}`)

  if (!response.ok) {
    let details = `Request failed with ${response.status}`

    try {
      const errorPayload = (await response.json()) as ApiErrorPayload
      if (errorPayload.details) {
        details = `${details}: ${errorPayload.details}`
      } else if (errorPayload.error) {
        details = `${details}: ${errorPayload.error}`
      }
    } catch {
      // Keep the HTTP status fallback when the backend error response is not JSON.
    }

    throw new Error(details)
  }

  return (await response.json()) as ProxiesResponse
}
