interface Props {
  value: string
  onChange: (value: string) => void
}

export function SearchFilter({ value, onChange }: Props) {
  return (
    <div className="filter-group filter-group-search">
      <label htmlFor="search-filter">Search</label>
      <input
        id="search-filter"
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Title, author, reviewer, #1234..."
      />
    </div>
  )
}
