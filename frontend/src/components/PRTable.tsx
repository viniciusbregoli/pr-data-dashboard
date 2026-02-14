import { useState } from 'react'
import type { PRInfo } from '../types'

type SortKey = 'repo' | 'title' | 'author' | 'created_at' | 'status' | 'reviewed' | 'human_review' | 'reviewers' | 'approvals'

const PAGE_SIZE = 10

interface Props {
  prs: PRInfo[]
}

function prKey(pr: PRInfo) {
  return `${pr.repo}#${pr.number}`
}

export function PRTable({ prs }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>('created_at')
  const [sortAsc, setSortAsc] = useState(false)
  const [page, setPage] = useState(0)

  const sorted = [...prs].sort((a, b) => {
    let cmp = 0
    switch (sortKey) {
      case 'repo': cmp = a.repo.localeCompare(b.repo); break
      case 'title': cmp = a.number - b.number; break
      case 'author': cmp = a.author.localeCompare(b.author); break
      case 'created_at': cmp = a.created_at.localeCompare(b.created_at); break
      case 'status': cmp = a.status.localeCompare(b.status); break
      case 'reviewed': cmp = Number(a.reviewed) - Number(b.reviewed); break
      case 'human_review': cmp = a.human_review.localeCompare(b.human_review); break
      case 'reviewers': cmp = a.reviewers.join(',').localeCompare(b.reviewers.join(',')); break
      case 'approvals': cmp = a.approval_count - b.approval_count; break
    }
    return sortAsc ? cmp : -cmp
  })

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages - 1)
  const pageRows = sorted.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE)

  function handleSort(key: SortKey) {
    if (key === sortKey) {
      setSortAsc(!sortAsc)
    } else {
      setSortKey(key)
      setSortAsc(true)
    }
    setPage(0)
  }

  function sortIndicator(key: SortKey) {
    if (key !== sortKey) return ''
    return sortAsc ? ' \u25B2' : ' \u25BC'
  }

  return (
    <>
      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th className="col-repo" onClick={() => handleSort('repo')}>Repo{sortIndicator('repo')}</th>
              <th className="col-title" onClick={() => handleSort('title')}>Title{sortIndicator('title')}</th>
              <th className="col-author" onClick={() => handleSort('author')}>Author{sortIndicator('author')}</th>
              <th className="col-reviewers" onClick={() => handleSort('reviewers')}>Reviewers{sortIndicator('reviewers')}</th>
              <th className="col-approvals" onClick={() => handleSort('approvals')}>Approvals{sortIndicator('approvals')}</th>
              <th className="col-date" onClick={() => handleSort('created_at')}>Date{sortIndicator('created_at')}</th>
              <th className="col-pr-status" onClick={() => handleSort('status')}>PR Status{sortIndicator('status')}</th>
              <th className="col-status" onClick={() => handleSort('reviewed')}>AI Review{sortIndicator('reviewed')}</th>
              <th className="col-status" onClick={() => handleSort('human_review')}>Human Review{sortIndicator('human_review')}</th>
            </tr>
          </thead>
          <tbody>
            {pageRows.map((pr) => (
              <tr key={prKey(pr)}>
                <td className="col-repo">{(pr.repo.split('/')[1] || pr.repo).replace(/^kinebot-/, '')}</td>
                <td className="col-title">
                  <a href={pr.url} target="_blank" rel="noopener noreferrer">
                    #{pr.number} {pr.title}
                  </a>
                </td>
                <td className="col-author">{pr.author}</td>
                <td className="col-reviewers">
                  <div className="reviewer-badges">
                    {pr.reviewers.map((r) => {
                      const cls = pr.approved_by.includes(r)
                        ? 'badge-reviewed'
                        : pr.changes_requested_by.includes(r)
                          ? 'badge-not-reviewed'
                          : 'badge-reviewer-waiting'
                      return <span key={r} className={`badge ${cls}`}>{r}</span>
                    })}
                    {Array.from({ length: Math.max(0, 2 - pr.reviewers.length) }, (_, i) => (
                      <span key={`sk-${i}`} className="badge badge-skeleton">—</span>
                    ))}
                  </div>
                </td>
                <td className="col-approvals">
                  <span className={`badge ${pr.approval_count >= 2 ? 'badge-reviewed' : pr.approval_count === 1 ? (pr.reviewers.length >= 2 ? 'badge-approval-split' : 'badge-approval-split-gray') : 'badge-human-none'}`}>
                    {pr.approval_count} / 2
                  </span>
                </td>
                <td className="col-date">{new Date(pr.created_at).toLocaleDateString('en-GB')}</td>
                <td className="col-pr-status">
                  <span className={`badge badge-${pr.status}`}>
                    {pr.status.charAt(0).toUpperCase() + pr.status.slice(1)}
                  </span>
                </td>
                <td className="col-status">
                  <span className={`badge ${pr.reviewed ? 'badge-reviewed' : 'badge-not-reviewed'}`}>
                    {pr.reviewed ? 'Reviewed' : 'Not Reviewed'}
                  </span>
                </td>
                <td className="col-status">
                  <span className={`badge badge-human-${pr.human_review}`}>
                    {pr.human_review === 'waiting' ? 'Waiting Review' : pr.human_review === 'approved' ? 'Approved' : 'No Label'}
                  </span>
                </td>
              </tr>
            ))}
            {prs.length === 0 && (
              <tr><td colSpan={9} className="empty-state">No PRs found for the selected filters.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="pagination">
          <button disabled={safePage === 0} onClick={() => setPage(0)}>&laquo;</button>
          <button disabled={safePage === 0} onClick={() => setPage(safePage - 1)}>&lsaquo;</button>
          <span className="pagination-info">
            Page {safePage + 1} of {totalPages}
            <span className="pagination-total"> ({sorted.length} PRs)</span>
          </span>
          <button disabled={safePage >= totalPages - 1} onClick={() => setPage(safePage + 1)}>&rsaquo;</button>
          <button disabled={safePage >= totalPages - 1} onClick={() => setPage(totalPages - 1)}>&raquo;</button>
        </div>
      )}
    </>
  )
}
