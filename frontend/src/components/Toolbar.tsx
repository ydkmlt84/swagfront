import { ActivityFilter } from '../lib/posters'

type ToolbarProps = {
  search: string
  includeSamples: boolean
  activityFilter: ActivityFilter
  loading: boolean
  onSearchChange: (value: string) => void
  onIncludeSamplesChange: (checked: boolean) => void
  onActivityFilterChange: (filter: ActivityFilter) => void
  onRefresh: () => void
}

const FILTER_OPTIONS: { label: string; value: ActivityFilter }[] = [
  { label: 'All', value: 'all' },
  { label: 'Active', value: 'active' },
  { label: 'Inactive', value: 'inactive' },
  { label: 'Unmatched', value: 'unmatched' },
]

export function Toolbar({
  search,
  includeSamples,
  activityFilter,
  loading,
  onSearchChange,
  onIncludeSamplesChange,
  onActivityFilterChange,
  onRefresh,
}: ToolbarProps) {
  return (
    <section className="toolbar">
      <input
        aria-label="Search proxies"
        className="search-input"
        placeholder="Search by host, file, target, or container"
        value={search}
        onChange={(event) => onSearchChange(event.target.value)}
      />
      <label className="switch-control">
        <input
          type="checkbox"
          className="switch-input"
          checked={includeSamples}
          onChange={(event) => onIncludeSamplesChange(event.target.checked)}
        />
        <span className="switch-track" aria-hidden="true">
          <span className="switch-thumb" />
        </span>
        <span>Show sample configs</span>
      </label>
      <div
        className="filter-pills"
        role="group"
        aria-label="Poster activity filter"
      >
        {FILTER_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            className={`filter-pill ${
              activityFilter === option.value ? 'selected' : ''
            }`}
            onClick={() => onActivityFilterChange(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
      <button className="refresh-button" onClick={onRefresh} disabled={loading}>
        Refresh
      </button>
    </section>
  )
}
