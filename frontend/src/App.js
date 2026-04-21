import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from 'react';
function matchesSearch(row, query) {
    if (!query) {
        return true;
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
        .toLowerCase();
    return haystack.includes(query.toLowerCase());
}
function hashString(value) {
    let hash = 0;
    for (let index = 0; index < value.length; index += 1) {
        hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
    }
    return hash;
}
function shuffledRows(rows) {
    return [...rows].sort((left, right) => {
        if (left.isSample !== right.isSample) {
            return left.isSample ? 1 : -1;
        }
        return hashString(left.filename) - hashString(right.filename);
    });
}
function cardTitle(row) {
    if (row.publicUrls[0]) {
        try {
            const host = new URL(row.publicUrls[0]).hostname;
            return host.split('.')[0] || host;
        }
        catch {
            return row.publicUrls[0];
        }
    }
    return row.serverNames[0] ?? row.upstreamApp ?? 'unknown';
}
function cardUrl(row) {
    return row.publicUrls[0] ?? 'No public URL';
}
function displayUrl(row) {
    const url = row.publicUrls[0];
    if (!url) {
        return 'No public URL';
    }
    return url.replace(/^https?:\/\//, '');
}
function statusText(row) {
    if (!row.docker) {
        return row.match.confidence === 'none' ? 'No match' : 'Uncertain';
    }
    return row.docker.status;
}
function targetText(row) {
    if (row.detectedProxyTarget) {
        return row.detectedProxyTarget;
    }
    if (row.upstreamApp || row.upstreamPort) {
        return `${row.upstreamApp ?? '?'}:${row.upstreamPort ?? '?'}`;
    }
    return 'No target found';
}
function posterShapeClass(row) {
    const variants = [
        'shapes-a',
        'shapes-b',
        'shapes-c',
        'shapes-d',
        'shapes-e',
        'shapes-f',
    ];
    return variants[hashString(`${row.filename}:shapes`) % variants.length];
}
function cardAccentClass(row) {
    if (row.docker?.status === 'running') {
        return 'poster-running';
    }
    if (row.docker?.status === 'stopped') {
        return 'poster-stopped';
    }
    const accents = [
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
    ];
    return accents[hashString(row.filename) % accents.length];
}
export function App() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [search, setSearch] = useState('');
    const [includeSamples, setIncludeSamples] = useState(false);
    const [activityFilter, setActivityFilter] = useState('all');
    async function load() {
        setLoading(true);
        setError(null);
        try {
            const response = await fetch(`/api/proxies?includeSamples=${includeSamples}`);
            if (!response.ok) {
                let details = `Request failed with ${response.status}`;
                try {
                    const errorPayload = (await response.json());
                    if (errorPayload.details) {
                        details = `${details}: ${errorPayload.details}`;
                    }
                    else if (errorPayload.error) {
                        details = `${details}: ${errorPayload.error}`;
                    }
                }
                catch {
                    // Keep the HTTP status fallback when the backend error response is not JSON.
                }
                throw new Error(details);
            }
            const payload = (await response.json());
            setData(payload);
        }
        catch (caught) {
            const message = caught instanceof Error ? caught.message : 'Unknown UI fetch error';
            setError(message);
        }
        finally {
            setLoading(false);
        }
    }
    useEffect(() => {
        void load();
    }, [includeSamples]);
    const rows = useMemo(() => shuffledRows((data?.rows ?? []).filter((row) => {
        if (!matchesSearch(row, search)) {
            return false;
        }
        if (activityFilter === 'active') {
            return !row.isSample;
        }
        if (activityFilter === 'inactive') {
            return row.isSample;
        }
        return true;
    })), [activityFilter, data, search]);
    return (_jsxs("div", { className: "page-shell", children: [_jsxs("header", { className: "hero", children: [_jsx("div", { className: "hero-copy", children: _jsxs("div", { className: "title-row", children: [_jsx("div", { className: "hero-logo-wrap", children: _jsx("img", { className: "hero-logo", src: "/swagfront_icon.svg", alt: "SWAG Front logo" }) }), _jsxs("div", { children: [_jsx("h1", { children: "SWAG Front" }), _jsx("p", { className: "subtle", children: "Super simple SWAG front showing your proxied containers and where they target to. No actions can be performed to your SWAG config or Docker containers." })] })] }) }), _jsxs("div", { className: "hero-meta", children: [_jsxs("div", { className: "meta-card", children: [_jsx("span", { children: "Configs" }), _jsx("strong", { children: data?.rows.length ?? 0 })] }), _jsxs("div", { className: "meta-card", children: [_jsx("span", { children: "Updated" }), _jsx("strong", { children: data
                                            ? new Date(data.generatedAt).toLocaleString()
                                            : 'Loading...' })] })] })] }), _jsxs("section", { className: "toolbar", children: [_jsx("input", { "aria-label": "Search proxies", className: "search-input", placeholder: "Search by host, file, target, or container", value: search, onChange: (event) => setSearch(event.target.value) }), _jsxs("label", { className: "switch-control", children: [_jsx("input", { type: "checkbox", className: "switch-input", checked: includeSamples, onChange: (event) => setIncludeSamples(event.target.checked) }), _jsx("span", { className: "switch-track", "aria-hidden": "true", children: _jsx("span", { className: "switch-thumb" }) }), _jsx("span", { children: "Show sample configs" })] }), _jsxs("div", { className: "filter-pills", role: "group", "aria-label": "Poster activity filter", children: [_jsx("button", { type: "button", className: `filter-pill ${activityFilter === 'all' ? 'selected' : ''}`, onClick: () => setActivityFilter('all'), children: "All" }), _jsx("button", { type: "button", className: `filter-pill ${activityFilter === 'active' ? 'selected' : ''}`, onClick: () => setActivityFilter('active'), children: "Active" }), _jsx("button", { type: "button", className: `filter-pill ${activityFilter === 'inactive' ? 'selected' : ''}`, onClick: () => setActivityFilter('inactive'), children: "Inactive" })] }), _jsx("button", { className: "refresh-button", onClick: () => void load(), disabled: loading, children: loading ? 'Refreshing...' : 'Refresh' })] }), error ? (_jsxs("div", { className: "error-banner", children: ["Failed to load data: ", error] })) : null, data?.warnings.map((warning) => (_jsx("div", { className: "warning-banner", children: warning }, warning))), _jsxs("section", { className: "poster-grid", children: [rows.map((row) => (_jsxs("article", { className: `proxy-poster ${cardAccentClass(row)} ${posterShapeClass(row)} ${row.isSample ? 'sample' : 'active'} ${row.publicUrls[0] ? 'clickable' : ''}`, onClick: () => {
                            if (!row.publicUrls[0]) {
                                return;
                            }
                            window.open(row.publicUrls[0], '_blank', 'noreferrer');
                        }, role: row.publicUrls[0] ? 'link' : undefined, tabIndex: row.publicUrls[0] ? 0 : -1, onKeyDown: (event) => {
                            if (!row.publicUrls[0]) {
                                return;
                            }
                            if (event.key === 'Enter' || event.key === ' ') {
                                event.preventDefault();
                                window.open(row.publicUrls[0], '_blank', 'noreferrer');
                            }
                        }, children: [_jsxs("div", { className: "poster-art", children: [_jsx("div", { className: "poster-shape poster-shape-one" }), _jsx("div", { className: "poster-shape poster-shape-two" }), _jsxs("div", { className: "poster-title-wrap", children: [_jsx("span", { className: "poster-kicker", children: statusText(row) }), _jsx("strong", { className: "poster-title", children: cardTitle(row) })] })] }), _jsx("div", { className: "poster-footer", children: _jsx("span", { className: `poster-state-badge ${row.isSample ? 'inactive' : 'active'}`, children: row.isSample ? 'Inactive' : 'Active' }) }), _jsxs("div", { className: "poster-overlay", children: [_jsxs("span", { children: ["URL: ", displayUrl(row)] }), _jsxs("span", { children: ["Container: ", row.docker?.name ?? 'Unmatched'] }), _jsxs("span", { children: ["Target: ", targetText(row)] }), _jsxs("span", { children: ["Ports:", ' ', row.docker?.portMappings.join(', ') ||
                                                row.upstreamPort ||
                                                'None'] })] })] }, row.filename))), !loading && rows.length === 0 ? (_jsxs("div", { className: "empty-state posters-empty", children: [_jsx("strong", { children: "No configs matched." }), _jsx("span", { children: "Try a different search or include inactive sample configs." })] })) : null] })] }));
}
