const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

async function fetchJSON(url, options = {}) {
    const res = await fetch(`${API_BASE}${url}`, {
        headers: { 'Content-Type': 'application/json', ...options.headers },
        ...options,
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(err.error || res.statusText);
    }
    return res.json();
}

export async function fetchApps(env = '') {
    const query = env ? `?env=${env}` : '';
    return fetchJSON(`/api/apps${query}`);
}

export async function fetchAppDetail(id) {
    return fetchJSON(`/api/apps/${id}`);
}

export async function fetchDrift(id, env = 'staging') {
    return fetchJSON(`/api/apps/${id}/drift?env=${env}`);
}

export async function fetchEvents(id) {
    return fetchJSON(`/api/apps/${id}/events`);
}

export async function fetchReleases(id) {
    return fetchJSON(`/api/apps/${id}/releases`);
}

export async function fetchAudit(appId = '') {
    const query = appId ? `?appId=${appId}` : '';
    return fetchJSON(`/api/audit${query}`);
}

export async function syncApp(id, payload) {
    return fetchJSON(`/api/apps/${id}/sync`, {
        method: 'POST',
        body: JSON.stringify(payload),
    });
}

export async function rollbackApp(id, payload) {
    return fetchJSON(`/api/apps/${id}/rollback`, {
        method: 'POST',
        body: JSON.stringify(payload),
    });
}

export async function freezeApp(id, payload) {
    return fetchJSON(`/api/apps/${id}/freeze`, {
        method: 'POST',
        body: JSON.stringify(payload),
    });
}
