interface Props {
  authors: string[]
  value: string
  onChange: (author: string) => void
}

export function AuthorFilter({ authors, value, onChange }: Props) {
  return (
    <div className="filter-group">
      <label>
        Author
        <select value={value} onChange={(e) => onChange(e.target.value)}>
          <option value="">All authors</option>
          {authors.map((a) => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>
      </label>
    </div>
  )
}
