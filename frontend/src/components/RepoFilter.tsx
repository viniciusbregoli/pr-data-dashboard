interface Props {
  repos: string[]
  value: string
  onChange: (repo: string) => void
}

export function RepoFilter({ repos, value, onChange }: Props) {
  return (
    <div className="filter-group">
      <label>
        Repository
        <select value={value} onChange={(e) => onChange(e.target.value)}>
          <option value="">All repositories</option>
          {repos.map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
      </label>
    </div>
  )
}
