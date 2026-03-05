export default function StatusChip({ type, value }) {
    const configs = {
        sync: {
            SYNCED: { symbol: '✓', cls: 'chip-green' },
            OUT_OF_SYNC: { symbol: '≠', cls: 'chip-red' },
            UNKNOWN: { symbol: '?', cls: 'chip-dim' },
        },
        health: {
            HEALTHY: { symbol: '●', cls: 'chip-green' },
            PROGRESSING: { symbol: '▲', cls: 'chip-yellow' },
            DEGRADED: { symbol: '✗', cls: 'chip-red' },
            UNKNOWN: { symbol: '?', cls: 'chip-dim' },
        },
        drift: {
            NONE: { symbol: '—', cls: 'chip-dim' },
            LOW: { symbol: '▪', cls: 'chip-yellow' },
            MEDIUM: { symbol: '▪▪', cls: 'chip-yellow' },
            HIGH: { symbol: '▪▪▪', cls: 'chip-red' },
        },
    };

    const cfg = configs[type]?.[value] || { symbol: '?', cls: 'chip-dim' };
    return (
        <span className={`status-chip ${cfg.cls}`}>
            <span className="chip-symbol">{cfg.symbol}</span>
            <span className="chip-label">{value}</span>
        </span>
    );
}
