import { useSelector, useDispatch } from 'react-redux';
import {
    setHealthFilter, setDriftFilter, setSyncFilter, setFrozenFilter, setPinnedOnlyFilter, clearFilters
} from '../store/appRegistrySlice';
import { useEffect } from 'react';

export default function QuickFilters() {
    const dispatch = useDispatch();
    const { healthFilter, driftFilter, syncFilter, frozenFilter, pinnedOnlyFilter } = useSelector(s => s.appRegistry);
    const { activeModal } = useSelector(s => s.actions);

    useEffect(() => {
        const handler = (e) => {
            if (activeModal) return;
            if (e.key === 'H' && e.shiftKey) dispatch(setHealthFilter('HEALTHY'));
            if (e.key === 'D' && e.shiftKey) dispatch(setDriftFilter('HIGH'));
            if (e.key === 'O' && e.shiftKey) dispatch(setSyncFilter('OUT_OF_SYNC'));
            if (e.key === 'F' && e.shiftKey) dispatch(setFrozenFilter());
            if (e.key === '*') dispatch(setPinnedOnlyFilter());
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [activeModal, dispatch]);

    const hasFilters = healthFilter || driftFilter || syncFilter || frozenFilter;

    return (
        <div className="quick-filters">
            <button
                className={`filter-btn ${healthFilter === 'HEALTHY' ? 'active' : ''}`}
                onClick={() => dispatch(setHealthFilter('HEALTHY'))}
            >
                <span className="key-hint">H</span> healthy
            </button>
            <button
                className={`filter-btn ${driftFilter === 'HIGH' ? 'active' : ''}`}
                onClick={() => dispatch(setDriftFilter('HIGH'))}
            >
                <span className="key-hint">D</span> drift
            </button>
            <button
                className={`filter-btn ${syncFilter === 'OUT_OF_SYNC' ? 'active' : ''}`}
                onClick={() => dispatch(setSyncFilter('OUT_OF_SYNC'))}
            >
                <span className="key-hint">O</span> out-of-sync
            </button>
            <button
                className={`filter-btn ${frozenFilter ? 'active' : ''}`}
                onClick={() => dispatch(setFrozenFilter())}
            >
                <span className="key-hint">F</span> frozen
            </button>
            <button
                className={`filter-btn ${pinnedOnlyFilter ? 'active' : ''}`}
                onClick={() => dispatch(setPinnedOnlyFilter())}
                style={{ color: pinnedOnlyFilter ? 'var(--yellow)' : 'inherit' }}
            >
                <span className="key-hint">*</span> pinned
            </button>
            {hasFilters && (
                <button className="filter-btn filter-clear" onClick={() => dispatch(clearFilters())}>
                    clear
                </button>
            )}
        </div>
    );
}
