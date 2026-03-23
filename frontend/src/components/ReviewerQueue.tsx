import { useEffect, useRef, useState } from 'react'
import type { PRInfo } from '../types'

interface Props {
  prs: PRInfo[]
  selectedReviewer: string
  onSelectReviewer: (reviewer: string) => void
}

export function ReviewerQueue({ prs, selectedReviewer, onSelectReviewer }: Props) {
  const [open, setOpen] = useState(false)
  const bodyRef = useRef<HTMLDivElement>(null)
  const [height, setHeight] = useState<number>(0)

  useEffect(() => {
    if (!bodyRef.current) return
    if (open) {
      setHeight(bodyRef.current.scrollHeight)
    } else {
      // Force from current height to 0 for the closing animation
      setHeight(bodyRef.current.scrollHeight)
      requestAnimationFrame(() => setHeight(0))
    }
  }, [open])

  const reviewerCounts = (() => {
    const counts: Record<string, number> = {}
    for (const pr of prs) {
      for (const reviewer of pr.reviewers) {
        if (!(reviewer in counts)) counts[reviewer] = 0
        const hasActed = pr.approved_by.includes(reviewer) || pr.changes_requested_by.includes(reviewer)
        if (!hasActed) counts[reviewer]++
      }
    }
    return Object.entries(counts).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
  })()

  if (reviewerCounts.length === 0) return null

  return (
    <div className="reviewer-queue">
      <button className="reviewer-queue-toggle" onClick={() => setOpen((o) => !o)}>
        <span>Reviewer Queue</span>
        <span className="reviewer-queue-chevron">{open ? '▲' : '▼'}</span>
      </button>
      <div
        className="reviewer-queue-collapsible"
        style={{ height }}
      >
        <div ref={bodyRef} className="reviewer-queue-body">
          {reviewerCounts.map(([reviewer, count]) => {
            const isSelected = selectedReviewer === reviewer
            return (
              <div
                key={reviewer}
                className={`stat-card reviewer-queue-card ${count === 0 ? 'reviewer-queue-card-done' : ''} ${isSelected ? 'reviewer-queue-card-selected' : ''}`}
                onClick={() => onSelectReviewer(isSelected ? '' : reviewer)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && onSelectReviewer(isSelected ? '' : reviewer)}
              >
                <span className="stat-value">{count}</span>
                <span className="stat-label">{reviewer}</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
