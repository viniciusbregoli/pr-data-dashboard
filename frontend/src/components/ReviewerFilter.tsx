interface Props {
  reviewers: string[]
  value: string
  onChange: (reviewer: string) => void
}

export function ReviewerFilter({ reviewers, value, onChange }: Props) {
  return (
    <div className="filter-group">
      <label>
        Reviewer
        <select value={value} onChange={(e) => onChange(e.target.value)}>
          <option value="">All reviewers</option>
          {reviewers.map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
      </label>
    </div>
  )
}
