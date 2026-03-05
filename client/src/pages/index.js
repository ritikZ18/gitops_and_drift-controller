import Head from 'next/head';
import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { loadApps, setSelectedEnv } from '../store/appRegistrySlice';
import { loadAppDetail, loadDrift } from '../store/appDetailSlice';
import { openModal } from '../store/actionsSlice';
import AppsList from '../components/AppsList';
import AppDetail from '../components/AppDetail';
import ContextPanel from '../components/ContextPanel';
import QuickFilters from '../components/QuickFilters';
import HelpOverlay from '../components/HelpOverlay';
import { PromoteModal, RollbackModal, FreezeModal } from '../components/Modals';
import AddAppModal from '../components/AddAppModal';

const ENVS = ['', 'staging', 'production'];

export default function Home() {
  const dispatch = useDispatch();
  const { selectedAppId, selectedEnv, lastUpdated } = useSelector(s => s.appRegistry);
  const { activeModal } = useSelector(s => s.actions);

  // Initial load + polling
  useEffect(() => {
    dispatch(loadApps(selectedEnv));
    const interval = setInterval(() => dispatch(loadApps(selectedEnv)), 15000);
    return () => clearInterval(interval);
  }, [dispatch, selectedEnv]);

  // Load detail when selection changes
  useEffect(() => {
    if (selectedAppId) {
      dispatch(loadAppDetail(selectedAppId));
      const env = selectedEnv || 'staging';
      dispatch(loadDrift({ id: selectedAppId, env }));
      const interval = setInterval(() => {
        dispatch(loadAppDetail(selectedAppId));
        dispatch(loadDrift({ id: selectedAppId, env }));
      }, 8000);
      return () => clearInterval(interval);
    }
  }, [selectedAppId, selectedEnv, dispatch]);

  // Global keybindings for actions + env cycling + refresh
  useEffect(() => {
    const handler = (e) => {
      if (activeModal) return;
      if (e.target.tagName === 'INPUT') return;
      if (e.key === 'p') dispatch(openModal('promote'));
      if (e.key === 'r') dispatch(openModal('rollback'));
      if (e.key === 'f') dispatch(openModal('freeze'));
      if (e.key === 'a') dispatch(openModal('register'));
      if (e.key === 'e') {
        const idx = ENVS.indexOf(selectedEnv);
        dispatch(setSelectedEnv(ENVS[(idx + 1) % ENVS.length]));
      }
      if (e.key === '.') {
        dispatch(loadApps(selectedEnv));
        if (selectedAppId) dispatch(loadAppDetail(selectedAppId));
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [activeModal, selectedEnv, selectedAppId, dispatch]);

  return (
    <>
      <Head>
        <title>gitopsctl-web</title>
        <meta name="description" content="GitOps Release & Drift Controller — terminalistic web interface for OpenShift GitOps management" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <div className="shell">
        <header className="top-bar">
          <span className="brand">gitopsctl-web</span>
          <span className="separator">▸</span>
          <span className="ctx">cluster: <strong>prod-us1</strong></span>
          <span className="separator">▸</span>
          <span className="ctx">env: <strong>{selectedEnv || 'all'}</strong></span>
          <span className="separator">▸</span>
          <span className="ctx">user: <strong>ritik</strong></span>
          <span className="spacer" />
          <span className="last-update dim">
            {lastUpdated ? `updated ${new Date(lastUpdated).toLocaleTimeString()}` : ''}
          </span>
          <span className="help-hint"><span className="key-hint">?</span> help</span>
        </header>

        <QuickFilters />

        <main className="three-pane">
          <AppsList />
          <AppDetail />
          <ContextPanel />
        </main>

        <footer className="bottom-bar">
          <span className="shortcut"><span className="key-hint">p</span>romote</span>
          <span className="shortcut"><span className="key-hint">r</span>ollback</span>
          <span className="shortcut"><span className="key-hint">f</span>reeze</span>
          <span className="shortcut"><span className="key-hint">a</span>dd app</span>
          <span className="shortcut"><span className="key-hint">x</span>commands</span>
          <span className="shortcut"><span className="key-hint">/</span>search</span>
          <span className="shortcut"><span className="key-hint">e</span>nv</span>
          <span className="shortcut"><span className="key-hint">.</span>refresh</span>
          <span className="shortcut"><span className="key-hint">?</span>help</span>
        </footer>

        {activeModal === 'promote' && <PromoteModal />}
        {activeModal === 'rollback' && <RollbackModal />}
        {activeModal === 'freeze' && <FreezeModal />}
        {activeModal === 'register' && <AddAppModal />}
        <HelpOverlay />
      </div>
    </>
  );
}
