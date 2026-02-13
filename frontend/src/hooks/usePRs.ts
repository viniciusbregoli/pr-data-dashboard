import { useEffect, useState } from 'react'
import { getPRs } from '../api/client'
import type { PRListResponse } from '../types'

export function usePRs(since: string, until: string, repo?: string, author?: string, status?: string, showIgnored?: boolean, refreshKey?: number) {
  const [data, setData] = useState<PRListResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    getPRs({ since, until, repo, author, status, showIgnored })
      .then((res) => {
        if (!cancelled) setData(res)
      })
      .catch((e) => {
        if (!cancelled) setError(e.message)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => { cancelled = true }
  }, [since, until, repo, author, status, showIgnored, refreshKey])

  return { data, loading, error }
}
