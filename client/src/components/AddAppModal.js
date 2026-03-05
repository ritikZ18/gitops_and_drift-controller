import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { closeModal } from '../store/actionsSlice';
import { registerApp } from '../api/appsApi';
import { loadApps } from '../store/appRegistrySlice';

const AddAppModal = () => {
    const dispatch = useDispatch();
    const { activeModal } = useSelector(state => state.actions);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        repoUrl: '',
        defaultBranch: 'main',
        manifestsPath: 'k8s/',
        owner: 'platform-team',
        fetchHistory: true,
    });

    if (activeModal !== 'register') return null;

    const handleSubmit = async (e) => {
        if (e) e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            if (formData.fetchHistory) {
                // Simulate network delay for git operations
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
            await registerApp(formData);
            dispatch(loadApps());
            dispatch(closeModal());
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Escape') dispatch(closeModal());
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleSubmit();
    };

    return (
        <div className="modal-overlay" onClick={() => dispatch(closeModal())} onKeyDown={handleKeyDown}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h3 className="modal-title">REGISTER_NEW_APP</h3>
                    <button className="modal-close" onClick={() => dispatch(closeModal())}>×</button>
                </div>

                <form onSubmit={handleSubmit} className="modal-body">
                    {error && <div className="modal-error">{error}</div>}

                    <div className="form-group">
                        <label className="form-label">APP_NAME</label>
                        <input
                            type="text"
                            className="form-input"
                            autoFocus
                            placeholder="e.g. inventory-svc"
                            value={formData.name}
                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">REPO_URL</label>
                        <input
                            type="text"
                            className="form-input"
                            placeholder="github.com/org/repo"
                            value={formData.repoUrl}
                            onChange={e => setFormData({ ...formData, repoUrl: e.target.value })}
                            required
                        />
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label">DEFAULT_BRANCH</label>
                            <input
                                type="text"
                                className="form-input"
                                value={formData.defaultBranch}
                                onChange={e => setFormData({ ...formData, defaultBranch: e.target.value })}
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">MANIFESTS_PATH</label>
                            <input
                                type="text"
                                className="form-input"
                                value={formData.manifestsPath}
                                onChange={e => setFormData({ ...formData, manifestsPath: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="form-group">
                        <label className="form-label">OWNER_TEAM</label>
                        <input
                            type="text"
                            className="form-input"
                            value={formData.owner}
                            onChange={e => setFormData({ ...formData, owner: e.target.value })}
                        />
                    </div>

                    <div className="form-group checkbox-group" style={{ marginTop: '8px' }}>
                        <label className="form-checkbox">
                            <input
                                type="checkbox"
                                checked={formData.fetchHistory}
                                onChange={e => setFormData({ ...formData, fetchHistory: e.target.checked })}
                            />
                            <span className="checkbox-label">FETCH_GIT_HISTORY_FROM_URL (Simulated)</span>
                        </label>
                    </div>

                    <div className="modal-footer">
                        <div className="modal-hint">
                            <span className="key-hint">Ctrl+Enter</span> to submit
                        </div>
                        <button type="button" className="btn-secondary" onClick={() => dispatch(closeModal())}>CANCEL</button>
                        <button type="submit" className="btn-primary" disabled={loading}>
                            {loading ? (formData.fetchHistory ? 'FETCHING_GIT_HISTORY...' : 'REGISTERING...') : 'REGISTER_APP'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AddAppModal;
