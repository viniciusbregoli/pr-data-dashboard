interface Props {
  since: string
  until: string
  onChange: (since: string, until: string) => void
}

export function DateFilter({ since, until, onChange }: Props) {
  return (
    <div className="filter-group">
      <label>
        From
        <input
          type="date"
          value={since}
          onChange={(e) => onChange(e.target.value, until)}
        />
      </label>
      <label>
        To
        <input
          type="date"
          value={until}
          onChange={(e) => onChange(since, e.target.value)}
        />
      </label>
    </div>
  )
}
