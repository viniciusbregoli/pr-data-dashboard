import { useDeferredValue, useEffect, useState } from 'react'
import { clearCache, getAuthors, getRepos } from '../api/client'
import { usePRs } from '../hooks/usePRs'
import { AuthorFilter } from './AuthorFilter'
import { DateFilter } from './DateFilter'
import { PRTable } from './PRTable'
import { RepoFilter } from './RepoFilter'
import { SearchFilter } from './SearchFilter'
import { StatsBar } from './StatsBar'
import { ReviewerQueue } from './ReviewerQueue'
import { ReviewerFilter } from './ReviewerFilter'
import { StatusFilter } from './StatusFilter'
import type { PRInfo } from '../types'

function defaultSince() {
  const d = new Date()
  d.setDate(d.getDate() - 7)
  return d.toISOString().slice(0, 10)
}

function defaultUntil() {
  return new Date().toISOString().slice(0, 10)
}

function matchesSearch(pr: PRInfo, query: string) {
  const normalized = query.trim().toLowerCase()
  if (!normalized) return true

  const fields = [
    pr.title,
    pr.author,
    pr.repo,
    pr.status,
    pr.human_review,
    String(pr.number),
    `#${pr.number}`,
    ...pr.reviewers,
  ]

  return fields.some((field) => field.toLowerCase().includes(normalized))
}

interface Props {
  onResetToken: () => void
}

export function Dashboard({ onResetToken }: Props) {
  const [since, setSince] = useState(defaultSince)
  const [until, setUntil] = useState(defaultUntil)
  const [repo, setRepo] = useState('pixfy/kinebot-standard')
  const [author, setAuthor] = useState('')
  const [status, setStatus] = useState('open')
  const [reviewer, setReviewer] = useState('')
  const [search, setSearch] = useState('')
  const [showIgnored, setShowIgnored] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const [repos, setRepos] = useState<string[]>([])
  const [authors, setAuthors] = useState<string[]>([])
  const { data, loading, error, progress } = usePRs(since, until, repo || undefined, author || undefined, status || undefined, showIgnored, refreshKey)
  const deferredSearch = useDeferredValue(search)

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
        <div className="header-actions">
          <button className="btn-secondary" onClick={onResetToken} disabled={loading}>
            Change GitHub Token
          </button>
          <button className="btn-clear-cache" onClick={handleClearCache} disabled={loading}>
            Clear Cache
          </button>
        </div>
      </header>

      <div className="filters">
        <div className="filters-row filters-row-primary">
          <SearchFilter value={search} onChange={setSearch} />
          <RepoFilter repos={repos} value={repo} onChange={setRepo} />
          <AuthorFilter authors={authors} value={author} onChange={setAuthor} />
          <ReviewerFilter
            reviewers={data ? [...new Set(data.prs.flatMap((pr) => pr.reviewers))].sort() : []}
            value={reviewer}
            onChange={setReviewer}
          />
          <StatusFilter value={status} onChange={setStatus} />
        </div>
        <div className="filters-row filters-row-secondary">
          <DateFilter since={since} until={until} onChange={(s, u) => { setSince(s); setUntil(u) }} />
          <div className="filter-group filter-group-ignore">
            <label className="toggle-label">
              <input type="checkbox" checked={showIgnored} onChange={(e) => setShowIgnored(e.target.checked)} />
              Show ignored
            </label>
          </div>
        </div>
      </div>

      {error && <div className="error-banner">Error: {error}</div>}

      {loading ? (
        <div className="loading">
          <div className="loading-progress-header">
            <span>Loading PRs</span>
            <span>{Math.round(progress?.progress_percent ?? 0)}%</span>
          </div>
          <div className="loading-progress-track">
            <div
              className="loading-progress-fill"
              style={{ width: `${progress?.progress_percent ?? 0}%` }}
            />
          </div>
          <p>{progress?.message ?? 'Loading PRs...'}</p>
          {progress?.total_prs ? (
            <p className="loading-detail">
              {progress.completed_prs} of {progress.total_prs} PRs processed
            </p>
          ) : null}
        </div>
      ) : data ? (
        <>
          {(() => {
            const filtered = data.prs.filter((pr) => {
              if (reviewer && !pr.reviewers.includes(reviewer)) return false
              return matchesSearch(pr, deferredSearch)
            })
            return (
              <>
                <ReviewerQueue
                  prs={data.prs.filter((pr) => matchesSearch(pr, deferredSearch))}
                  selectedReviewer={reviewer}
                  onSelectReviewer={setReviewer}
                />
                <StatsBar prs={filtered} />
                <PRTable prs={filtered} />
              </>
            )
          })()}
        </>
      ) : null}
    </div>
  )
}
