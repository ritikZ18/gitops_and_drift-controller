import { useSelector, useDispatch } from 'react-redux';
import { setSelectedApp, setSearchQuery, togglePin } from '../store/appRegistrySlice';
import { useEffect, useRef, useState } from 'react';
import StatusChip from './StatusChip';

export default function AppsList() {
    const dispatch = useDispatch();
    const { filteredApps, selectedAppId, searchQuery, pinnedAppIds, loading } = useSelector(s => s.appRegistry);
    const [focusIdx, setFocusIdx] = useState(0);
    const [isSearching, setIsSearching] = useState(false);
    const searchRef = useRef(null);
    const listRef = useRef(null);

    useEffect(() => {
        if (filteredApps.length > 0 && focusIdx >= 0 && focusIdx < filteredApps.length) {
            dispatch(setSelectedApp(filteredApps[focusIdx].id));
        }
    }, [focusIdx, filteredApps, dispatch]);

    useEffect(() => {
        const handler = (e) => {
            if (document.querySelector('.modal-overlay')) return;
            if (e.key === '/' && !isSearching) {
                e.preventDefault();
                setIsSearching(true);
                setTimeout(() => searchRef.current?.focus(), 0);
            }
            if (e.key === 'Escape' && isSearching) {
                setIsSearching(false);
                dispatch(setSearchQuery(''));
            }
            if (!isSearching) {
                if (e.key === 'j' || e.key === 'ArrowDown') {
                    e.preventDefault();
                    setFocusIdx(i => Math.min(i + 1, filteredApps.length - 1));
                }
                if (e.key === 'k' || e.key === 'ArrowUp') {
                    e.preventDefault();
                    setFocusIdx(i => Math.max(i - 1, 0));
                }
                if (e.key === 'g') setFocusIdx(0);
                if (e.key === 'G') setFocusIdx(filteredApps.length - 1);
                if (e.key === '*') {
                    const app = filteredApps[focusIdx];
                    if (app) dispatch(togglePin(app.id));
                }
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [isSearching, filteredApps.length, dispatch]);

    useEffect(() => {
        if (listRef.current) {
            const active = listRef.current.querySelector('.app-row.active');
            if (active) active.scrollIntoView({ block: 'nearest' });
        }
    }, [focusIdx]);

    return (
        <div className="pane pane-apps">
            <div className="pane-header">
                <span className="pane-title">APPS</span>
                <span className="pane-badge">{filteredApps.length}</span>
            </div>
            <div className="search-bar">
                {isSearching ? (
                    <input
                        ref={searchRef}
                        className="search-input"
                        value={searchQuery}
                        onChange={e => dispatch(setSearchQuery(e.target.value))}
                        onKeyDown={e => {
                            if (e.key === 'Escape') { setIsSearching(false); dispatch(setSearchQuery('')); }
                            if (e.key === 'Enter') { setIsSearching(false); searchRef.current?.blur(); }
                        }}
                        placeholder="search..."
                        autoFocus
                    />
                ) : (
                    <span className="search-hint" onClick={() => setIsSearching(true)}>
                        <span className="key-hint">/</span> search
                    </span>
                )}
            </div>
            <div className="apps-list" ref={listRef}>
                {loading && <div className="loading-indicator">loading...</div>}
                {filteredApps.map((app, idx) => (
                    <div
                        key={`${app.id}-${app.environment}`}
                        className={`app-row ${idx === focusIdx ? 'active' : ''} ${app.id === selectedAppId ? 'selected' : ''}`}
                        onClick={() => { setFocusIdx(idx); dispatch(setSelectedApp(app.id)); }}
                    >
                        <div className="app-row-main">
                            <span className="app-cursor">{idx === focusIdx ? '▸' : ' '}</span>
                            <span className="app-name">{app.name}</span>
                            {pinnedAppIds.includes(app.id) && <span style={{ color: 'var(--yellow)', marginLeft: '4px' }}>★</span>}
                            {app.frozen && <span className="frozen-badge">❄</span>}
                        </div>
                        <div className="app-row-meta">
                            <span className="env-tag">{app.environment}</span>
                            <StatusChip type="sync" value={app.syncStatus} />
                            <StatusChip type="health" value={app.healthStatus} />
                        </div>
                    </div>
                ))}
                {!loading && filteredApps.length === 0 && (
                    <div className="empty-state">no apps match filters</div>
                )}
            </div>
        </div>
    );
}
