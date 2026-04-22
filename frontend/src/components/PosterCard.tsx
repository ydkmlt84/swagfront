import { ProxyRow } from '@swagfront/shared'
import {
  cardTitle,
  displayUrl,
  posterShapeClass,
  statusText,
  targetText,
} from '../lib/posters'

type PosterCardProps = {
  row: ProxyRow
  accentClass: string
}

export function PosterCard({ row, accentClass }: PosterCardProps) {
  function openUrl() {
    if (!row.publicUrls[0]) {
      return
    }

    window.open(row.publicUrls[0], '_blank', 'noreferrer')
  }

  return (
    <article
      className={`proxy-poster ${accentClass} ${posterShapeClass(row)} ${
        row.isSample ? 'sample' : 'active'
      } ${row.publicUrls[0] ? 'clickable' : ''}`}
      onClick={openUrl}
      role={row.publicUrls[0] ? 'link' : undefined}
      tabIndex={row.publicUrls[0] ? 0 : -1}
      onKeyDown={(event) => {
        if (!row.publicUrls[0]) {
          return
        }

        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          openUrl()
        }
      }}
    >
      <div className="poster-art">
        <div className="poster-shape poster-shape-one" />
        <div className="poster-shape poster-shape-two" />
        <div className="poster-title-wrap">
          <span className="poster-kicker">{statusText(row)}</span>
          <strong className="poster-title">{cardTitle(row)}</strong>
        </div>
      </div>
      <div className="poster-footer">
        <span
          className={`poster-state-badge ${row.isSample ? 'inactive' : 'active'}`}
        >
          {row.isSample ? 'Inactive' : 'Active'}
        </span>
      </div>
      <div className="poster-overlay">
        <span>URL: {displayUrl(row)}</span>
        <span>Container: {row.docker?.name ?? 'Unmatched'}</span>
        <span>Target: {targetText(row)}</span>
        <span>
          Ports: {row.docker?.portMappings.join(', ') || row.upstreamPort || 'None'}
        </span>
      </div>
    </article>
  )
}
