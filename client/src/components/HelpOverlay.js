import { useEffect, useState } from 'react';

export default function HelpOverlay() {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        const handler = (e) => {
            if (e.key === '?' && !e.ctrlKey) {
                e.preventDefault();
                setVisible(v => !v);
            }
            if (e.key === 'Escape' && visible) setVisible(false);
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [visible]);

    if (!visible) return null;

    return (
        <div className="modal-overlay" onClick={() => setVisible(false)}>
            <div className="modal-box help-box" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <span className="modal-title">KEYBOARD SHORTCUTS</span>
                    <span className="modal-close" onClick={() => setVisible(false)}>esc</span>
                </div>
                <div className="modal-body help-content">
                    <div className="help-section">
                        <div className="help-title">Navigation</div>
                        <div className="help-row"><span className="key-hint">j</span> / <span className="key-hint">↓</span> move down</div>
                        <div className="help-row"><span className="key-hint">k</span> / <span className="key-hint">↑</span> move up</div>
                        <div className="help-row"><span className="key-hint">g</span> go to top</div>
                        <div className="help-row"><span className="key-hint">G</span> go to bottom</div>
                        <div className="help-row"><span className="key-hint">/</span> search apps</div>
                        <div className="help-row"><span className="key-hint">e</span> cycle environment</div>
                        <div className="help-row"><span className="key-hint">*</span> pin / unpin app</div>
                    </div>
                    <div className="help-section">
                        <div className="help-title">Tabs</div>
                        <div className="help-row"><span className="key-hint">Tab</span> next tab</div>
                        <div className="help-row"><span className="key-hint">1-5</span> jump to tab</div>
                        <div className="help-row"><span className="key-hint">v</span> events</div>
                        <div className="help-row"><span className="key-hint">d</span> drift</div>
                        <div className="help-row"><span className="key-hint">x</span> commands</div>
                    </div>
                    <div className="help-section">
                        <div className="help-title">Actions</div>
                        <div className="help-row"><span className="key-hint">p</span> promote / sync</div>
                        <div className="help-row"><span className="key-hint">r</span> rollback</div>
                        <div className="help-row"><span className="key-hint">f</span> freeze / unfreeze</div>
                        <div className="help-row"><span className="key-hint">a</span> register new app</div>
                    </div>
                    <div className="help-section">
                        <div className="help-title">GitHub Links</div>
                        <div className="help-row"><span className="key-hint">g</span> open repo</div>
                        <div className="help-row"><span className="key-hint">c</span> compare desired..live</div>
                        <div className="help-row"><span className="key-hint">d</span> desired commit</div>
                        <div className="help-row"><span className="key-hint">l</span> live commit</div>
                        <div className="help-row"><span className="key-hint">p</span> manifests path</div>
                        <div className="help-row"><span className="key-hint">y</span> copy link</div>
                    </div>
                    <div className="help-section">
                        <div className="help-title">Filters</div>
                        <div className="help-row"><span className="key-hint">H</span> healthy only</div>
                        <div className="help-row"><span className="key-hint">D</span> drifted only</div>
                        <div className="help-row"><span className="key-hint">O</span> out-of-sync only</div>
                        <div className="help-row"><span className="key-hint">F</span> frozen only</div>
                        <div className="help-row"><span className="key-hint">*</span> pinned only</div>
                        <div className="help-row"><span className="key-hint">.</span> refresh</div>
                        <div className="help-row"><span className="key-hint">?</span> toggle help</div>
                    </div>
                </div>
            </div>
        </div>
    );
}
