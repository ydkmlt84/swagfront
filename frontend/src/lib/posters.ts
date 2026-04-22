import { ProxyRow } from '@swagfront/shared'

export type ActivityFilter = 'all' | 'active' | 'inactive' | 'unmatched'

export const POSTER_MIN_WIDTH = 190
export const POSTER_GAP = 18

const POSTER_ACCENTS = [
  'poster-purple',
  'poster-blue',
  'poster-magenta',
  'poster-cyan',
  'poster-red',
  'poster-green',
  'poster-orange',
  'poster-teal',
  'poster-rose',
  'poster-indigo',
  'poster-lime',
  'poster-yellow',
  'poster-coral',
]

export function matchesSearch(row: ProxyRow, query: string): boolean {
  if (!query) {
    return true
  }

  const haystack = [
    row.filename,
    row.serverNames.join(' '),
    row.publicUrls.join(' '),
    row.docker?.name ?? '',
    row.detectedProxyTarget ?? '',
    row.match.reason,
  ]
    .join(' ')
    .toLowerCase()

  return haystack.includes(query.toLowerCase())
}

export function hashString(value: string): number {
  let hash = 0
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0
  }
  return hash
}

export function shuffledRows(rows: ProxyRow[]): ProxyRow[] {
  return [...rows].sort((left, right) => {
    if (left.isSample !== right.isSample) {
      return left.isSample ? 1 : -1
    }

    return hashString(left.filename) - hashString(right.filename)
  })
}

export function cardTitle(row: ProxyRow): string {
  if (row.publicUrls[0]) {
    try {
      const host = new URL(row.publicUrls[0]).hostname
      return host.split('.')[0] || host
    } catch {
      return row.publicUrls[0]
    }
  }

  return row.serverNames[0] ?? row.upstreamApp ?? 'unknown'
}

export function displayUrl(row: ProxyRow): string {
  const url = row.publicUrls[0]
  if (!url) {
    return 'No public URL'
  }

  return url.replace(/^https?:\/\//, '')
}

export function statusText(row: ProxyRow, dockerEnabled: boolean): string {
  if (!dockerEnabled) {
    return ''
  }

  if (!row.docker) {
    return row.match.confidence === 'none' ? 'No match' : 'Uncertain'
  }

  return row.docker.status
}

export function targetText(row: ProxyRow): string {
  if (row.detectedProxyTarget) {
    return row.detectedProxyTarget
  }

  if (row.upstreamApp || row.upstreamPort) {
    return `${row.upstreamApp ?? '?'}:${row.upstreamPort ?? '?'}`
  }

  return 'No target found'
}

export function posterShapeClass(row: ProxyRow): string {
  const variants = [
    'shapes-a',
    'shapes-b',
    'shapes-c',
    'shapes-d',
    'shapes-e',
    'shapes-f',
  ]
  return variants[hashString(`${row.filename}:shapes`) % variants.length]
}

function colorIndexForPosition(index: number, columns: number): number {
  const safeColumns = Math.max(columns, 1)
  const row = Math.floor(index / safeColumns)
  const column = index % safeColumns

  // This layout-aware pattern keeps horizontal and vertical neighbors on
  // different palette slots as long as the palette has more than two entries.
  return (row * 3 + column * 5) % POSTER_ACCENTS.length
}

export function cardAccentClass(index: number, columns: number): string {
  return POSTER_ACCENTS[colorIndexForPosition(index, columns)]
}
