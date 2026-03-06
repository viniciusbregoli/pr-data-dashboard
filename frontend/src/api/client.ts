import type { PRListResponse, RepoListResponse, AuthorListResponse, PRLoadProgressResponse } from '../types'

const BASE = '/api'
const TOKEN_STORAGE_KEY = 'pr-review-tracker.github-token'

function storedToken() {
  if (typeof window === 'undefined') return ''
  return window.localStorage.getItem(TOKEN_STORAGE_KEY) ?? ''
}

function authHeaders(tokenOverride?: string) {
  const headers = new Headers()
  const token = (tokenOverride ?? storedToken()).trim()
  if (token) headers.set('X-GitHub-Token', token)
  return headers
}

async function errorMessage(res: Response) {
  const contentType = res.headers.get('content-type') ?? ''
  if (contentType.includes('application/json')) {
    const body = await res.json().catch(() => null) as { detail?: string } | null
    if (body?.detail) return body.detail
  }
  return `API error: ${res.status} ${res.statusText}`
}

async function fetchJson<T>(url: string, init?: RequestInit, tokenOverride?: string): Promise<T> {
  const headers = authHeaders(tokenOverride)
  if (init?.headers) {
    new Headers(init.headers).forEach((value, key) => headers.set(key, value))
  }

  const res = await fetch(url, { ...init, headers })
  if (!res.ok) throw new Error(await errorMessage(res))
  return res.json()
}

export function getStoredGithubToken() {
  return storedToken()
}

export function saveGithubToken(token: string) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(TOKEN_STORAGE_KEY, token.trim())
}

export function clearGithubToken() {
  if (typeof window === 'undefined') return
  window.localStorage.removeItem(TOKEN_STORAGE_KEY)
}

export function getPRs(params: {
  since: string
  until: string
  repo?: string
  author?: string
  status?: string
  showIgnored?: boolean
}, tokenOverride?: string): Promise<PRListResponse> {
  const qs = new URLSearchParams()
  qs.set('since', params.since)
  qs.set('until', params.until)
  if (params.repo) qs.set('repo', params.repo)
  if (params.author) qs.set('author', params.author)
  if (params.status) qs.set('status', params.status)
  if (params.showIgnored) qs.set('show_ignored', 'true')
  return fetchJson(`${BASE}/prs?${qs}`, undefined, tokenOverride)
}

export function getPRLoadProgress(params: {
  since: string
  until: string
  repo?: string
  author?: string
  status?: string
  showIgnored?: boolean
}, tokenOverride?: string): Promise<PRLoadProgressResponse> {
  const qs = new URLSearchParams()
  qs.set('since', params.since)
  qs.set('until', params.until)
  if (params.repo) qs.set('repo', params.repo)
  if (params.author) qs.set('author', params.author)
  if (params.status) qs.set('status', params.status)
  if (params.showIgnored) qs.set('show_ignored', 'true')
  return fetchJson(`${BASE}/prs/progress?${qs}`, undefined, tokenOverride)
}

export function getRepos(tokenOverride?: string): Promise<RepoListResponse> {
  return fetchJson(`${BASE}/repos`, undefined, tokenOverride)
}

export function getAuthors(since: string, until: string, tokenOverride?: string): Promise<AuthorListResponse> {
  const qs = new URLSearchParams({ since, until })
  return fetchJson(`${BASE}/authors?${qs}`, undefined, tokenOverride)
}

export async function clearCache(tokenOverride?: string): Promise<void> {
  const res = await fetch(`${BASE}/cache/clear`, {
    method: 'POST',
    headers: authHeaders(tokenOverride),
  })
  if (!res.ok) throw new Error(await errorMessage(res))
}
