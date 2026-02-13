import { useState } from 'react'
import type { PRInfo } from '../types'

type SortKey = 'repo' | 'title' | 'author' | 'created_at' | 'status' | 'reviewed' | 'human_review' | 'reviewers' | 'approvals'

interface Props {
  prs: PRInfo[]
}

function prKey(pr: PRInfo) {
  return `${pr.repo}#${pr.number}`
}

export function PRTable({ prs }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>('created_at')
  const [sortAsc, setSortAsc] = useState(false)

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

  function handleSort(key: SortKey) {
    if (key === sortKey) {
      setSortAsc(!sortAsc)
    } else {
      setSortKey(key)
      setSortAsc(true)
    }
  }

  function sortIndicator(key: SortKey) {
    if (key !== sortKey) return ''
    return sortAsc ? ' \u25B2' : ' \u25BC'
  }

  return (
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
          {sorted.map((pr) => (
            <tr key={prKey(pr)}>
              <td className="col-repo">{pr.repo.split('/')[1] || pr.repo}</td>
              <td className="col-title">
                <a href={pr.url} target="_blank" rel="noopener noreferrer">
                  #{pr.number} {pr.title}
                </a>
              </td>
              <td className="col-author">{pr.author}</td>
              <td className="col-reviewers">
                {pr.reviewers.length > 0 ? (
                  <div className="reviewer-badges">
                    {pr.reviewers.map((r) => (
                      <span key={r} className={`badge ${pr.approved_by.includes(r) ? 'badge-reviewed' : 'badge-not-reviewed'}`}>{r}</span>
                    ))}
                  </div>
                ) : <span className="text-muted">—</span>}
              </td>
              <td className="col-approvals">
                <span className={`badge ${pr.approval_count >= 2 ? 'badge-reviewed' : pr.approval_count === 1 ? 'badge-human-waiting' : 'badge-human-none'}`}>
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
            <tr><td colSpan={8} className="empty-state">No PRs found for the selected filters.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
