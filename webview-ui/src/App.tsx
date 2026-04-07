import React, { useState, useEffect, useCallback } from 'react';
import Sidebar from './Sidebar';
import Canvas from './Canvas';

interface Repo { id: number; name: string; full_name: string; }
interface Branch { name: string; commit: string; commitMessage: string; }

function App() {
  const [repos, setRepos] = useState<Repo[]>([]);
  const [selectedRepo, setSelectedRepo] = useState<string | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [savedState, setSavedState] = useState<any>(null);
  const [userName, setUserName] = useState<string>('You');
  const [toast, setToast] = useState<{ visible: boolean; message: string }>({ visible: false, message: '' });

  const showToast = useCallback((message: string) => {
    setToast({ visible: true, message });
    setTimeout(() => setToast({ visible: false, message: '' }), 2500);
  }, []);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const message = event.data;
      switch (message.type) {
        case 'reposFetched':
          setRepos(message.repos);
          if (message.userName) setUserName(message.userName);
          break;
        case 'branchesFetched':
          setBranches(message.branches);
          break;
        case 'stateLoaded':
          setSavedState(message.state);
          break;
        case 'stateSaved':
          showToast('Canvas saved ✓');
          break;
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [showToast]);

  const handleFetchRepos = () => {
    window.vscode?.postMessage({ type: 'fetchRepos' });
  };

  const handleRepoSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const repoFullName = e.target.value;
    setSelectedRepo(repoFullName);
    setSavedState(null);
    if (repoFullName) {
      window.vscode?.postMessage({ type: 'fetchBranches', repoFullName });
    } else {
      setBranches([]);
    }
  };

  const handleSaveState = useCallback((state: any) => {
    if (selectedRepo) {
      window.vscode?.postMessage({ type: 'saveState', repoId: selectedRepo, state });
    }
  }, [selectedRepo]);

  return (
    <div className="app-container">
      {/* Toast notification */}
      {toast.visible && (
        <div className="toast">
          {toast.message}
        </div>
      )}

      <Sidebar
        repos={repos}
        selectedRepo={selectedRepo}
        branches={branches}
        userName={userName}
        onFetchRepos={handleFetchRepos}
        onRepoSelect={handleRepoSelect}
      />
      <div className="canvas-container">
        <Canvas
          savedState={savedState}
          onSave={handleSaveState}
          userName={userName}
        />
      </div>
    </div>
  );
}

export default App;
