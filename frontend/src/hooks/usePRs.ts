import { useEffect, useState } from 'react'
import { getPRLoadProgress, getPRs } from '../api/client'
import type { PRListResponse, PRLoadProgressResponse } from '../types'

export function usePRs(since: string, until: string, repo?: string, author?: string, status?: string, showIgnored?: boolean, refreshKey?: number) {
  const [data, setData] = useState<PRListResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState<PRLoadProgressResponse | null>(null)

  useEffect(() => {
    let cancelled = false
    let pollTimer: number | undefined
    let requestSucceeded = false
    const params = { since, until, repo, author, status, showIgnored }

    setLoading(true)
    setError(null)
    setProgress({
      status: 'running',
      message: 'Starting request...',
      progress_percent: 0,
      total_repos: 0,
      completed_repos: 0,
      total_prs: 0,
      completed_prs: 0,
      current_repo: null,
    })

    const pollProgress = () => {
      getPRLoadProgress(params)
        .then((next) => {
          if (cancelled) return
          setProgress(next)
          if (next.status === 'running' || next.status === 'idle') {
            pollTimer = window.setTimeout(pollProgress, 400)
          }
        })
        .catch(() => {
          if (cancelled) return
          pollTimer = window.setTimeout(pollProgress, 800)
        })
    }

    pollTimer = window.setTimeout(pollProgress, 150)

    getPRs(params)
      .then((res) => {
        requestSucceeded = true
        if (!cancelled) setData(res)
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e.message)
          setProgress((current) => current ? { ...current, status: 'error', message: e.message } : null)
        }
      })
      .finally(() => {
        if (pollTimer) window.clearTimeout(pollTimer)
        if (!cancelled) {
          if (requestSucceeded) {
            setProgress((current) => current ? { ...current, status: 'complete', progress_percent: 100 } : null)
          }
          setLoading(false)
        }
      })

    return () => {
      cancelled = true
      if (pollTimer) window.clearTimeout(pollTimer)
    }
  }, [since, until, repo, author, status, showIgnored, refreshKey])

  return { data, loading, error, progress }
}
