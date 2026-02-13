import { useEffect, useState } from 'react'
import { clearCache, getAuthors, getRepos } from '../api/client'
import { usePRs } from '../hooks/usePRs'
import { AuthorFilter } from './AuthorFilter'
import { DateFilter } from './DateFilter'
import { PRTable } from './PRTable'
import { RepoFilter } from './RepoFilter'
import { StatsBar } from './StatsBar'
import { StatusFilter } from './StatusFilter'

function defaultSince() {
  const d = new Date()
  d.setDate(d.getDate() - 7)
  return d.toISOString().slice(0, 10)
}

function defaultUntil() {
  return new Date().toISOString().slice(0, 10)
}

export function Dashboard() {
  const [since, setSince] = useState(defaultSince)
  const [until, setUntil] = useState(defaultUntil)
  const [repo, setRepo] = useState('')
  const [author, setAuthor] = useState('')
  const [status, setStatus] = useState('')
  const [showIgnored, setShowIgnored] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const [repos, setRepos] = useState<string[]>([])
  const [authors, setAuthors] = useState<string[]>([])
  const { data, loading, error } = usePRs(since, until, repo || undefined, author || undefined, status || undefined, showIgnored, refreshKey)

  function handleClearCache() {
    clearCache().then(() => {
      setRefreshKey((k) => k + 1)
    }).catch(() => {})
  }

  useEffect(() => {
    getRepos().then((r) => setRepos(r.repos)).catch(() => {})
  }, [])

  useEffect(() => {
    getAuthors(since, until).then((r) => setAuthors(r.authors)).catch(() => {})
  }, [since, until])

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <h1>PR Review Tracker</h1>
        <button className="btn-clear-cache" onClick={handleClearCache} disabled={loading}>
          Clear Cache
        </button>
      </header>

      <div className="filters">
        <DateFilter since={since} until={until} onChange={(s, u) => { setSince(s); setUntil(u) }} />
        <RepoFilter repos={repos} value={repo} onChange={setRepo} />
        <AuthorFilter authors={authors} value={author} onChange={setAuthor} />
        <StatusFilter value={status} onChange={setStatus} />
        <div className="filter-group">
          <label className="toggle-label">
            <input type="checkbox" checked={showIgnored} onChange={(e) => setShowIgnored(e.target.checked)} />
            Show ignored
          </label>
        </div>
      </div>

      {error && <div className="error-banner">Error: {error}</div>}

      {loading ? (
        <div className="loading">Loading PRs...</div>
      ) : data ? (
        <>
          <StatsBar prs={data.prs} />
          <PRTable prs={data.prs} />
        </>
      ) : null}
    </div>
  )
}
