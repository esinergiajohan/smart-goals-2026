export async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: init?.body ? { 'Content-Type': 'application/json' } : undefined,
  })
  const data: T & { error?: string } = await response.json()

  if (!response.ok) {
    throw new Error(data.error ?? `El servidor respondió ${response.status}`)
  }

  return data
}
