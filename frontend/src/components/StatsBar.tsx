import type { PRInfo } from '../types'

interface Props {
  prs: PRInfo[]
}

export function StatsBar({ prs }: Props) {
  const total = prs.length
  const reviewed = prs.filter((p) => p.reviewed).length
  const notReviewed = total - reviewed
  const reviewedPercent = total > 0 ? Math.round((reviewed / total) * 1000) / 10 : 0
  const with2Approvals = prs.filter((p) => p.approval_count >= 2).length
  const approvalPercent = total > 0 ? Math.round((with2Approvals / total) * 1000) / 10 : 0

  return (
    <div className="stats-bar">
      <div className="stat-cards">
        <div className="stat-card">
          <span className="stat-value">{total}</span>
          <span className="stat-label">Total PRs</span>
        </div>
        <div className="stat-card stat-reviewed">
          <span className="stat-value">{reviewed}</span>
          <span className="stat-label">AI Reviewed</span>
        </div>
        <div className="stat-card stat-not-reviewed">
          <span className="stat-value">{notReviewed}</span>
          <span className="stat-label">Not Reviewed</span>
        </div>
        <div className={`stat-card ${with2Approvals === total && total > 0 ? 'stat-reviewed' : 'stat-approvals'}`}>
          <span className="stat-value">{with2Approvals}</span>
          <span className="stat-label">2+ Approvals</span>
        </div>
      </div>

      <div className="progress-section">
        <div className="progress-container">
          <span className="progress-title">AI Review</span>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${reviewedPercent}%` }} />
          </div>
          <span className="progress-label">{reviewedPercent}%</span>
        </div>
        <div className="progress-container">
          <span className="progress-title">2+ Approvals</span>
          <div className="progress-bar">
            <div className="progress-fill progress-fill-approval" style={{ width: `${approvalPercent}%` }} />
          </div>
          <span className="progress-label">{approvalPercent}%</span>
        </div>
      </div>
    </div>
  )
}
