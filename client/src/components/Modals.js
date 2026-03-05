import { useSelector, useDispatch } from 'react-redux';
import { closeModal, actionStart, actionSuccess, actionError } from '../store/actionsSlice';
import { loadApps } from '../store/appRegistrySlice';
import { loadAppDetail } from '../store/appDetailSlice';
import { syncApp, rollbackApp, freezeApp } from '../api/appsApi';
import { useEffect, useState, useRef } from 'react';

export function PromoteModal() {
    const dispatch = useDispatch();
    const { app } = useSelector(s => s.appDetail);
    const { selectedAppId, apps } = useSelector(s => s.appRegistry);
    const { loading, result, error } = useSelector(s => s.actions);
    const [reason, setReason] = useState('');
    const summary = apps.find(a => a.id === selectedAppId);
    const env = app?.environments?.find(e => e.name === summary?.environment) || app?.environments?.[0];

    useEffect(() => {
        const handler = (e) => {
            if (e.key === 'Escape') dispatch(closeModal());
            if (e.key === 'y' && !loading && !result) handleSync();
            if (e.key === 'n') dispatch(closeModal());
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [loading, result]);

    const handleSync = async () => {
        if (!app || !env) return;
        dispatch(actionStart());
        try {
            const res = await syncApp(selectedAppId, {
                environment: env.name,
                targetRevision: env.desiredRevision,
                reason,
                actor: 'web-user',
            });
            dispatch(actionSuccess(res));
            dispatch(loadApps());
            dispatch(loadAppDetail(selectedAppId));
        } catch (err) {
            dispatch(actionError(err.message));
        }
    };

    if (!app || !env) return null;

    return (
        <div className="modal-overlay" onClick={() => dispatch(closeModal())}>
            <div className="modal-box" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <span className="modal-title">PROMOTE / SYNC</span>
                    <span className="modal-close" onClick={() => dispatch(closeModal())}>esc</span>
                </div>
                <div className="modal-body">
                    {result ? (
                        <div className="modal-result success">
                            <span>✓ {result.message}</span>
                        </div>
                    ) : error ? (
                        <div className="modal-result error">
                            <span>✗ {error}</span>
                        </div>
                    ) : (
                        <>
                            <div className="modal-row">
                                <span className="modal-label">app:</span>
                                <span className="modal-value">{app.name}</span>
                            </div>
                            <div className="modal-row">
                                <span className="modal-label">env:</span>
                                <span className="modal-value">{env.name}</span>
                            </div>
                            <div className="modal-row">
                                <span className="modal-label">target:</span>
                                <span className="modal-value mono">{env.desiredRevision}</span>
                            </div>
                            <div className="modal-row">
                                <span className="modal-label">current:</span>
                                <span className="modal-value mono">{env.liveRevision}</span>
                            </div>
                            {env.driftCount > 0 && (
                                <div className="modal-warning">
                                    ⚠ {env.driftCount} resources will be changed in {env.namespace}
                                </div>
                            )}
                            <div className="modal-input-row">
                                <span className="modal-label">reason:</span>
                                <input
                                    className="modal-input"
                                    value={reason}
                                    onChange={e => setReason(e.target.value)}
                                    placeholder="optional"
                                />
                            </div>
                            <div className="modal-actions">
                                {loading ? (
                                    <span className="modal-loading">syncing...</span>
                                ) : (
                                    <>
                                        <span className="modal-confirm"><span className="key-hint">y</span> confirm</span>
                                        <span className="modal-cancel"><span className="key-hint">n</span> cancel</span>
                                    </>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

export function RollbackModal() {
    const dispatch = useDispatch();
    const { app, releases } = useSelector(s => s.appDetail);
    const { selectedAppId, apps } = useSelector(s => s.appRegistry);
    const { loading, result, error } = useSelector(s => s.actions);
    const [selectedRev, setSelectedRev] = useState(0);
    const [reason, setReason] = useState('');
    const summary = apps.find(a => a.id === selectedAppId);
    const env = app?.environments?.find(e => e.name === summary?.environment) || app?.environments?.[0];

    const pastReleases = releases?.filter(r => r.status === 'success').slice(0, 10) || [];

    useEffect(() => {
        const handler = (e) => {
            if (e.key === 'Escape') dispatch(closeModal());
            if (e.key === 'ArrowDown' || e.key === 'j') {
                e.preventDefault();
                setSelectedRev(i => Math.min(i + 1, pastReleases.length - 1));
            }
            if (e.key === 'ArrowUp' || e.key === 'k') {
                e.preventDefault();
                setSelectedRev(i => Math.max(i - 1, 0));
            }
            if (e.key === 'y' && !loading && !result) handleRollback();
            if (e.key === 'n') dispatch(closeModal());
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [selectedRev, loading, result, pastReleases.length]);

    const handleRollback = async () => {
        if (!app || !env || pastReleases.length === 0) return;
        const target = pastReleases[selectedRev];
        dispatch(actionStart());
        try {
            const res = await rollbackApp(selectedAppId, {
                environment: env.name,
                targetRevision: target.revision,
                reason: reason || `Rollback to ${target.revision}`,
                actor: 'web-user',
            });
            dispatch(actionSuccess(res));
            dispatch(loadApps());
            dispatch(loadAppDetail(selectedAppId));
        } catch (err) {
            dispatch(actionError(err.message));
        }
    };

    if (!app || !env) return null;

    return (
        <div className="modal-overlay" onClick={() => dispatch(closeModal())}>
            <div className="modal-box modal-wide" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <span className="modal-title">ROLLBACK</span>
                    <span className="modal-close" onClick={() => dispatch(closeModal())}>esc</span>
                </div>
                <div className="modal-body">
                    {result ? (
                        <div className="modal-result success">
                            <span>✓ {result.message}</span>
                        </div>
                    ) : error ? (
                        <div className="modal-result error">
                            <span>✗ {error}</span>
                        </div>
                    ) : (
                        <>
                            <div className="modal-row">
                                <span className="modal-label">app:</span>
                                <span className="modal-value">{app.name} / {env.name}</span>
                            </div>
                            <div className="modal-section-title">Select revision to rollback to:</div>
                            <div className="revision-list">
                                {pastReleases.map((r, i) => (
                                    <div
                                        key={i}
                                        className={`revision-row ${i === selectedRev ? 'active' : ''}`}
                                        onClick={() => setSelectedRev(i)}
                                    >
                                        <span className="rev-cursor">{i === selectedRev ? '▸' : ' '}</span>
                                        <span className="rev-hash mono">{r.revision?.slice(0, 7)}</span>
                                        <span className="rev-action">{r.action}</span>
                                        <span className="rev-actor dim">{r.actor}</span>
                                        <span className="rev-time dim">{new Date(r.timestamp).toLocaleString()}</span>
                                    </div>
                                ))}
                                {pastReleases.length === 0 && (
                                    <div className="empty-state">no previous successful releases</div>
                                )}
                            </div>
                            <div className="modal-input-row">
                                <span className="modal-label">reason:</span>
                                <input
                                    className="modal-input"
                                    value={reason}
                                    onChange={e => setReason(e.target.value)}
                                    placeholder="reason for rollback"
                                />
                            </div>
                            <div className="modal-actions">
                                {loading ? (
                                    <span className="modal-loading">rolling back...</span>
                                ) : (
                                    <>
                                        <span className="modal-confirm"><span className="key-hint">y</span> confirm</span>
                                        <span className="modal-cancel"><span className="key-hint">n</span> cancel</span>
                                    </>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

export function FreezeModal() {
    const dispatch = useDispatch();
    const { app } = useSelector(s => s.appDetail);
    const { selectedAppId, apps } = useSelector(s => s.appRegistry);
    const { loading, result, error } = useSelector(s => s.actions);
    const [reason, setReason] = useState('');
    const summary = apps.find(a => a.id === selectedAppId);
    const env = app?.environments?.find(e => e.name === summary?.environment) || app?.environments?.[0];
    const isFrozen = env?.frozen;

    useEffect(() => {
        const handler = (e) => {
            if (e.key === 'Escape') dispatch(closeModal());
            if (e.key === 'y' && !loading && !result) handleFreeze();
            if (e.key === 'n') dispatch(closeModal());
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [loading, result, reason]);

    const handleFreeze = async () => {
        if (!app || !env) return;
        if (!isFrozen && !reason) return; // require reason for freeze
        dispatch(actionStart());
        try {
            const res = await freezeApp(selectedAppId, {
                environment: env.name,
                freeze: !isFrozen,
                reason: reason || 'Unfreezing',
                actor: 'web-user',
            });
            dispatch(actionSuccess(res));
            dispatch(loadApps());
            dispatch(loadAppDetail(selectedAppId));
        } catch (err) {
            dispatch(actionError(err.message));
        }
    };

    if (!app || !env) return null;

    return (
        <div className="modal-overlay" onClick={() => dispatch(closeModal())}>
            <div className="modal-box" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <span className="modal-title">{isFrozen ? 'UNFREEZE' : 'FREEZE'}</span>
                    <span className="modal-close" onClick={() => dispatch(closeModal())}>esc</span>
                </div>
                <div className="modal-body">
                    {result ? (
                        <div className="modal-result success">
                            <span>✓ {result.message}</span>
                        </div>
                    ) : error ? (
                        <div className="modal-result error">
                            <span>✗ {error}</span>
                        </div>
                    ) : (
                        <>
                            <div className="modal-row">
                                <span className="modal-label">app:</span>
                                <span className="modal-value">{app.name} / {env.name}</span>
                            </div>
                            {isFrozen ? (
                                <div className="modal-warning freeze-info">
                                    ❄ Currently frozen: {env.freezeReason}
                                </div>
                            ) : (
                                <div className="modal-warning">
                                    ⚠ Freezing will prevent all sync/rollback actions
                                </div>
                            )}
                            <div className="modal-input-row">
                                <span className="modal-label">reason:</span>
                                <input
                                    className="modal-input"
                                    value={reason}
                                    onChange={e => setReason(e.target.value)}
                                    placeholder={isFrozen ? 'optional' : 'required — incident ID or reason'}
                                    autoFocus
                                />
                            </div>
                            <div className="modal-actions">
                                {loading ? (
                                    <span className="modal-loading">{isFrozen ? 'unfreezing...' : 'freezing...'}</span>
                                ) : (
                                    <>
                                        <span className="modal-confirm"><span className="key-hint">y</span> confirm</span>
                                        <span className="modal-cancel"><span className="key-hint">n</span> cancel</span>
                                    </>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
