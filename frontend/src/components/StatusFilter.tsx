interface Props {
  value: string
  onChange: (status: string) => void
}

export function StatusFilter({ value, onChange }: Props) {
  return (
    <div className="filter-group">
      <label>
        Status
        <select value={value} onChange={(e) => onChange(e.target.value)}>
          <option value="">All statuses</option>
          <option value="open">Open</option>
          <option value="merged">Merged</option>
          <option value="closed">Closed</option>
        </select>
      </label>
    </div>
  )
}
