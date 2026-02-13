import type { PRListResponse, RepoListResponse, AuthorListResponse } from '../types'

const BASE = '/api'

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`API error: ${res.status} ${res.statusText}`)
  return res.json()
}

export function getPRs(params: {
  since: string
  until: string
  repo?: string
  author?: string
  status?: string
  showIgnored?: boolean
}): Promise<PRListResponse> {
  const qs = new URLSearchParams()
  qs.set('since', params.since)
  qs.set('until', params.until)
  if (params.repo) qs.set('repo', params.repo)
  if (params.author) qs.set('author', params.author)
  if (params.status) qs.set('status', params.status)
  if (params.showIgnored) qs.set('show_ignored', 'true')
  return fetchJson(`${BASE}/prs?${qs}`)
}

export function getRepos(): Promise<RepoListResponse> {
  return fetchJson(`${BASE}/repos`)
}

export function getAuthors(since: string, until: string): Promise<AuthorListResponse> {
  const qs = new URLSearchParams({ since, until })
  return fetchJson(`${BASE}/authors?${qs}`)
}

export async function clearCache(): Promise<void> {
  const res = await fetch(`${BASE}/cache/clear`, { method: 'POST' })
  if (!res.ok) throw new Error(`API error: ${res.status} ${res.statusText}`)
}
