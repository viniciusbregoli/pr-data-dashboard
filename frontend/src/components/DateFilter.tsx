interface Props {
  since: string
  until: string
  onChange: (since: string, until: string) => void
}

function daysAgo(n: number) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString().slice(0, 10)
}

function today() {
  return new Date().toISOString().slice(0, 10)
}

const presets = [
  { label: 'Last 7 days', days: 7 },
  { label: 'Last 30 days', days: 30 },
  { label: 'Last 90 days', days: 90 },
] as const

export function DateFilter({ since, until, onChange }: Props) {
  function applyPreset(days: number) {
    onChange(daysAgo(days), today())
  }

  return (
    <div className="filter-group">
      <div className="date-presets">
        {presets.map((p) => (
          <button
            key={p.days}
            className={`btn-preset ${since === daysAgo(p.days) && until === today() ? 'active' : ''}`}
            onClick={() => applyPreset(p.days)}
          >
            {p.label}
          </button>
        ))}
      </div>
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
