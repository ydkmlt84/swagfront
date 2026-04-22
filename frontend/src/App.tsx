import { useEffect, useMemo, useRef, useState } from 'react'
import { ProxiesResponse } from '@swagfront/shared'
import { Hero } from './components/Hero'
import { PosterCard } from './components/PosterCard'
import { RefreshToast } from './components/RefreshToast'
import { Toolbar } from './components/Toolbar'
import { fetchProxies } from './lib/api'
import {
  ActivityFilter,
  cardAccentClass,
  matchesSearch,
  POSTER_GAP,
  POSTER_MIN_WIDTH,
  shuffledRows,
} from './lib/posters'

export function App() {
  const [data, setData] = useState<ProxiesResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [includeSamples, setIncludeSamples] = useState(false)
  const [activityFilter, setActivityFilter] = useState<ActivityFilter>('all')
  const [gridColumns, setGridColumns] = useState(1)
  const posterGridRef = useRef<HTMLElement | null>(null)
  const toastTimeoutRef = useRef<number | null>(null)

  async function load() {
    setLoading(true)
    setError(null)

    try {
      const payload = await fetchProxies(includeSamples)
      setData(payload)
    } catch (caught) {
      const message =
        caught instanceof Error ? caught.message : 'Unknown UI fetch error'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [includeSamples])

  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current !== null) {
        window.clearTimeout(toastTimeoutRef.current)
      }
    }
  }, [])

  useEffect(() => {
    const grid = posterGridRef.current
    if (!grid) {
      return
    }

    const updateColumns = () => {
      const width = grid.clientWidth
      if (!width) {
        return
      }

      const columns = Math.max(
        1,
        Math.floor((width + POSTER_GAP) / (POSTER_MIN_WIDTH + POSTER_GAP))
      )
      setGridColumns(columns)
    }

    updateColumns()

    const observer = new ResizeObserver(() => {
      updateColumns()
    })

    observer.observe(grid)
    window.addEventListener('resize', updateColumns)

    return () => {
      observer.disconnect()
      window.removeEventListener('resize', updateColumns)
    }
  }, [])

  const rows = useMemo(
    () =>
      shuffledRows(
        (data?.rows ?? []).filter((row) => {
          if (!matchesSearch(row, search)) {
            return false
          }

          if (activityFilter === 'active') {
            return !row.isSample
          }

          if (activityFilter === 'inactive') {
            return row.isSample
          }

          if (activityFilter === 'unmatched') {
            return !row.docker
          }

          return true
        })
      ),
    [activityFilter, data, search]
  )

  function showToast(message: string) {
    setToastMessage(message)

    if (toastTimeoutRef.current !== null) {
      window.clearTimeout(toastTimeoutRef.current)
    }

    toastTimeoutRef.current = window.setTimeout(() => {
      setToastMessage(null)
      toastTimeoutRef.current = null
    }, 1800)
  }

  function handleRefresh() {
    showToast('Refresh queued')
    void load()
  }

  return (
    <div className="page-shell">
      {toastMessage ? <RefreshToast /> : null}
      <Hero data={data} />
      <Toolbar
        search={search}
        includeSamples={includeSamples}
        activityFilter={activityFilter}
        loading={loading}
        onSearchChange={setSearch}
        onIncludeSamplesChange={setIncludeSamples}
        onActivityFilterChange={setActivityFilter}
        onRefresh={handleRefresh}
      />

      {error ? (
        <div className="error-banner">Failed to load data: {error}</div>
      ) : null}
      {data?.warnings.map((warning) => (
        <div className="warning-banner" key={warning}>
          {warning}
        </div>
      ))}

      <section className="poster-grid" ref={posterGridRef}>
        {rows.map((row, index) => (
          <PosterCard
            key={row.filename}
            row={row}
            accentClass={cardAccentClass(index, gridColumns)}
            dockerEnabled={data?.dockerEnabled ?? true}
          />
        ))}

        {!loading && rows.length === 0 ? (
          <div className="empty-state posters-empty">
            <strong>No configs matched.</strong>
            <span>
              Try a different search or include inactive sample configs.
            </span>
          </div>
        ) : null}
      </section>
    </div>
  )
}
