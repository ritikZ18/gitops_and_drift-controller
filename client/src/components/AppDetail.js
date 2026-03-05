import React, { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { openModal } from '../store/actionsSlice';
import StatusChip from './StatusChip';

function timeAgo(dateStr) {
    if (!dateStr) return '—';
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
}

function buildGithubLinks(app, env) {
    if (!app || !app.repoUrl) return {};
    const repo = app.repoUrl.replace(/\/$/, '');
    const branch = app.defaultBranch || 'main';
    const desired = env?.desiredRevision;
    const live = env?.liveRevision;

    return {
        repo: repo,
        desired: desired ? `${repo}/commit/${desired}` : `${repo}/tree/${branch}`,
        live: live ? `${repo}/commit/${live}` : null,
        compare: (live && desired && live !== desired) ? `${repo}/compare/${live}...${desired}` : null,
        path: `${repo}/tree/${branch}/${app.path || app.manifestsPath || ''}`.replace(/\/$/, ''),
    };
}

export default function AppDetail() {
    const { app, loading } = useSelector(s => s.appDetail);
    const { selectedAppId, apps } = useSelector(s => s.appRegistry);

    const summary = apps.find(a => a.id === selectedAppId);
    const env = app?.environments?.find(e => e.name === summary?.environment) || app?.environments?.[0];
    const links = buildGithubLinks(app, env);

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

            let url = null;
            switch (e.key.toLowerCase()) {
                case 'g': url = links.repo; break;
                case 'd': url = links.desired; break;
                case 'l': url = links.live; break;
                case 'c': url = links.compare; break;
                case 'p': url = links.path; break;
                case 'y':
                    if (links.compare || links.repo) {
                        navigator.clipboard.writeText(links.compare || links.repo);
                    }
                    return;
                default: return;
            }

            if (url) window.open(url, '_blank');
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [links]);

    if (loading) {
        return (
            <div className="pane pane-detail">
                <div className="pane-header"><span className="pane-title">DETAILS</span></div>
                <div className="loading-indicator">loading...</div>
            </div>
        );
    }

    if (!app) {
        return (
            <div className="pane pane-detail">
                <div className="pane-header"><span className="pane-title">DETAILS</span></div>
                <div className="empty-state">select an app from the list</div>
            </div>
        );
    }

    return (
        <div className="pane pane-detail">
            <div className="pane-header">
                <span className="pane-title">DETAILS</span>
            </div>
            <div className="detail-content">
                <div className="detail-row">
                    <span className="detail-label">app:</span>
                    <span className="detail-value highlight">{app.name}</span>
                </div>
                <div className="detail-row">
                    <span className="detail-label">repo:</span>
                    <span className="detail-value dim mono clickable" onClick={() => window.open(links.repo, '_blank')}>
                        {app.repoUrl} <span className="key-hint">G</span> <span className="link-icon">↗</span>
                    </span>
                </div>
                <div className="detail-row">
                    <span className="detail-label">path:</span>
                    <span className="detail-value dim mono clickable" onClick={() => window.open(links.path, '_blank')}>
                        {app.path || app.manifestsPath} <span className="key-hint">P</span> <span className="link-icon">↗</span>
                    </span>
                </div>
                <div className="detail-row">
                    <span className="detail-label">owners:</span>
                    <span className="detail-value dim">{app.owners?.join(', ')}</span>
                </div>

                <div className="detail-divider" />

                {env && (
                    <>
                        <div className="detail-row">
                            <span className="detail-label">env:</span>
                            <span className="detail-value">{env.name}</span>
                        </div>
                        <div className="detail-row">
                            <span className="detail-label">desired:</span>
                            <span className="detail-value mono clickable" onClick={() => window.open(links.desired, '_blank')}>
                                {env.desiredRevision} <span className="dim">({app.defaultBranch || 'main'})</span> <span className="key-hint">D</span> <span className="link-icon">↗</span>
                            </span>
                        </div>
                        <div className="detail-row">
                            <span className="detail-label">live:</span>
                            <span className="detail-value mono clickable" onClick={() => env.liveRevision && window.open(links.live, '_blank')}>
                                {env.liveRevision} {env.liveRevision && <><span className="key-hint">L</span> <span className="link-icon">↗</span></>}
                            </span>
                        </div>
                        {links.compare && (
                            <div className="detail-row">
                                <span className="detail-label">compare:</span>
                                <span className="detail-value mono dim clickable" onClick={() => window.open(links.compare, '_blank')}>
                                    {env.liveRevision}..{env.desiredRevision} <span className="key-hint">C</span> <span className="link-icon">↗</span>
                                </span>
                            </div>
                        )}
                        <div className="detail-row">
                            <span className="detail-label">sync:</span>
                            <StatusChip type="sync" value={env.syncStatus} />
                        </div>
                        <div className="detail-row">
                            <span className="detail-label">health:</span>
                            <StatusChip type="health" value={env.healthStatus} />
                        </div>
                        <div className="detail-row">
                            <span className="detail-label">drift:</span>
                            <StatusChip type="drift" value={env.driftSeverity} />
                            {env.driftCount > 0 && <span className="drift-count">({env.driftCount} resources)</span>}
                        </div>
                        <div className="detail-row">
                            <span className="detail-label">last sync:</span>
                            <span className="detail-value dim">{timeAgo(env.lastSyncTime)}</span>
                        </div>
                        {env.frozen && (
                            <div className="detail-row frozen-notice">
                                <span className="detail-label">❄ FROZEN:</span>
                                <span className="detail-value">{env.freezeReason}</span>
                            </div>
                        )}
                    </>
                )}

                <div className="detail-divider" />

                <div className="detail-actions">
                    <button className="btn-action" onClick={() => dispatch(openModal('promote'))}>
                        <span className="key-hint">p</span> Promote
                    </button>
                    <button className="btn-action" onClick={() => dispatch(openModal('rollback'))}>
                        <span className="key-hint">r</span> Rollback
                    </button>
                    <button className="btn-action" onClick={() => dispatch(openModal('freeze'))}>
                        <span className="key-hint">f</span> Freeze
                    </button>
                    <button className="btn-action" onClick={() => {
                        if (links.compare || links.repo) {
                            navigator.clipboard.writeText(links.compare || links.repo);
                        }
                    }}>
                        <span className="key-hint">y</span> Copy Link
                    </button>
                </div>
            </div>
        </div>
    );
}

