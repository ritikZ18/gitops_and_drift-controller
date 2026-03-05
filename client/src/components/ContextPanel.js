import { useSelector, useDispatch } from 'react-redux';
import { setActiveTab } from '../store/appDetailSlice';
import { useEffect } from 'react';

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

const TABS = ['events', 'drift', 'history', 'audit', 'commands'];

export default function ContextPanel() {
    const dispatch = useDispatch();
    const { events, drift, releases, audit, activeTab, driftLoading } = useSelector(s => s.appDetail);
    const { activeModal } = useSelector(s => s.actions);

    useEffect(() => {
        const handler = (e) => {
            if (activeModal) return;
            if (e.key === 'Tab') {
                e.preventDefault();
                const idx = TABS.indexOf(activeTab);
                const next = e.shiftKey
                    ? TABS[(idx - 1 + TABS.length) % TABS.length]
                    : TABS[(idx + 1) % TABS.length];
                dispatch(setActiveTab(next));
            }
            if (e.key === '1') dispatch(setActiveTab('events'));
            if (e.key === '2') dispatch(setActiveTab('drift'));
            if (e.key === '3') dispatch(setActiveTab('history'));
            if (e.key === '4') dispatch(setActiveTab('audit'));
            if (e.key === '5') dispatch(setActiveTab('commands'));
            if (e.key === 'v') dispatch(setActiveTab('events'));
            if (e.key === 'd' && !e.ctrlKey) dispatch(setActiveTab('drift'));
            if (e.key === 'x') dispatch(setActiveTab('commands'));
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [activeTab, activeModal, dispatch]);

    return (
        <div className="pane pane-context">
            <div className="pane-header">
                <div className="tab-bar">
                    {TABS.map((tab, i) => (
                        <button
                            key={tab}
                            className={`tab-btn ${activeTab === tab ? 'active' : ''}`}
                            onClick={() => dispatch(setActiveTab(tab))}
                        >
                            <span className="tab-num">{i + 1}</span>{tab}
                        </button>
                    ))}
                </div>
            </div>
            <div className="context-content">
                {activeTab === 'events' && <EventsView events={events} />}
                {activeTab === 'drift' && <DriftView drift={drift} loading={driftLoading} />}
                {activeTab === 'history' && <HistoryView releases={releases} />}
                {activeTab === 'audit' && <AuditView audit={audit} />}
                {activeTab === 'commands' && <CommandsView appName={summary?.name} env={summary?.environment} />}
            </div>
        </div>
    );
}

function EventsView({ events }) {
    if (!events || events.length === 0) {
        return <div className="empty-state">no events</div>;
    }
    return (
        <div className="events-list">
            {events.map((ev, i) => (
                <div key={i} className={`event-row event-${ev.type.toLowerCase()}`}>
                    <span className="event-type">{ev.type === 'Warning' ? '⚠' : 'ℹ'}</span>
                    <div className="event-body">
                        <div className="event-reason">{ev.reason}</div>
                        <div className="event-message">{ev.message}</div>
                        <div className="event-meta">
                            <span className="dim">{ev.object}</span>
                            <span className="dim">{timeAgo(ev.timestamp)}</span>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}

function DriftView({ drift, loading }) {
    if (loading) return <div className="loading-indicator">computing drift...</div>;
    if (!drift) return <div className="empty-state">select an app to view drift</div>;
    if (drift.severity === 'NONE') {
        return (
            <div className="drift-clean">
                <span className="chip-green">✓ No drift detected</span>
                <p className="dim">{drift.summary}</p>
            </div>
        );
    }

    return (
        <div className="drift-report">
            <div className="drift-header">
                <span className={`drift-severity severity-${drift.severity.toLowerCase()}`}>
                    {drift.severity} DRIFT
                </span>
                <span className="drift-count">{drift.resourceCount} resources affected</span>
            </div>
            <p className="drift-summary">{drift.summary}</p>

            <div className="drift-resources">
                {drift.resources?.map((r, i) => (
                    <div key={i} className="drift-resource">
                        <div className="drift-resource-header">
                            <span className="resource-kind">{r.kind}</span>
                            <span className="resource-name">{r.name}</span>
                            <span className={`drift-sev severity-${r.severity.toLowerCase()}`}>{r.severity}</span>
                        </div>
                        <div className="drift-diff">
                            <div className="diff-line diff-remove">- {r.field}: {r.liveValue}</div>
                            <div className="diff-line diff-add">+ {r.field}: {r.desiredValue}</div>
                        </div>
                    </div>
                ))}
            </div>

            {drift.triageSteps?.length > 0 && (
                <div className="triage-steps">
                    <div className="triage-title">TRIAGE & DIAGNOSTICS</div>
                    {drift.triageSteps.map((step, i) => (
                        <div key={i} className="triage-step">
                            <span className="step-num">{i + 1}.</span> {step}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

function HistoryView({ releases }) {
    if (!releases || releases.length === 0) {
        return <div className="empty-state">no release history</div>;
    }
    return (
        <div className="history-list">
            {releases.map((r, i) => (
                <div key={i} className={`history-row status-${r.status}`}>
                    <div className="history-main">
                        <span className={`history-action action-${r.action}`}>{r.action}</span>
                        <span className="history-revision mono">{r.revision?.slice(0, 7)}</span>
                        <span className={`history-status status-badge-${r.status}`}>{r.status}</span>
                    </div>
                    <div className="history-meta">
                        <span className="dim">{r.actor}</span>
                        <span className="dim">{r.env}</span>
                        <span className="dim">{timeAgo(r.timestamp)}</span>
                    </div>
                    {r.message && <div className="history-message">{r.message}</div>}
                </div>
            ))}
        </div>
    );
}

function AuditView({ audit }) {
    if (!audit || audit.length === 0) {
        return <div className="empty-state">no audit entries</div>;
    }
    return (
        <div className="audit-list">
            {audit.map((a, i) => (
                <div key={i} className="audit-row">
                    <div className="audit-main">
                        <span className={`audit-action action-${a.action}`}>{a.action}</span>
                        <span className={`audit-result result-${a.result}`}>{a.result}</span>
                        <span className="dim">{a.env}</span>
                    </div>
                    <div className="audit-meta">
                        <span className="audit-actor">{a.actor}</span>
                        <span className="dim">{timeAgo(a.timestamp)}</span>
                    </div>
                    {a.message && <div className="audit-message dim">{a.message}</div>}
                </div>
            ))}
        </div>
    );
}

function CommandsView({ appName, env }) {
    const [idx, setIdx] = useState(0);
    const ns = env === 'production' ? `${appName}-prod` : `${appName}-staging`;
    const commands = [
        { label: 'get pods', cmd: `oc -n ${ns} get pods` },
        { label: 'describe deploy', cmd: `oc -n ${ns} describe deploy/${appName}` },
        { label: 'rollout status', cmd: `oc -n ${ns} rollout status deploy/${appName}` },
        { label: 'view logs', cmd: `oc -n ${ns} logs deploy/${appName} --tail=200` },
        { label: 'get events', cmd: `oc -n ${ns} get events --sort-by='.lastTimestamp'` },
    ];

    useEffect(() => {
        const handler = (e) => {
            if (e.key === 'j' || e.key === 'ArrowDown') setIdx(i => Math.min(i + 1, commands.length - 1));
            if (e.key === 'k' || e.key === 'ArrowUp') setIdx(i => Math.max(i - 1, 0));
            if (e.key === 'Enter' || e.key === 'c') {
                navigator.clipboard.writeText(commands[idx].cmd);
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [idx, commands]);

    if (!appName) return <div className="empty-state">select an app</div>;

    return (
        <div className="commands-list">
            <div className="pane-title" style={{ marginBottom: '8px', fontSize: '10px' }}>CLI HELPER (OC/KUBECTL)</div>
            {commands.map((c, i) => (
                <div
                    key={i}
                    className={`app-row ${i === idx ? 'active' : ''}`}
                    onClick={() => setIdx(i)}
                    style={{ border: '1px solid var(--border)', marginBottom: '4px', borderRadius: '3px' }}
                >
                    <div className="app-row-main" style={{ padding: '4px 8px' }}>
                        <span className="app-cursor">{i === idx ? '▸' : ' '}</span>
                        <span className="app-name" style={{ fontSize: '11px', color: 'var(--blue)' }}>{c.label}</span>
                    </div>
                    <div className="mono" style={{ padding: '4px 8px', fontSize: '10px', background: 'var(--bg-primary)', wordBreak: 'break-all' }}>
                        $ {c.cmd}
                    </div>
                </div>
            ))}
            <div className="action-hints" style={{ marginTop: '12px' }}>
                <span className="key-hint">Enter</span> / <span className="key-hint">c</span> Copy to clipboard
                <br />
                <span className="key-hint">j</span> / <span className="key-hint">k</span> Navigate
            </div>
        </div>
    );
}
