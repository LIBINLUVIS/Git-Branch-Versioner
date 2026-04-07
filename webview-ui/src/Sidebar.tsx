import React, { useState } from 'react';
import { GitPullRequest, GitBranch, MessageCircle, StickyNote, Search } from 'lucide-react';

interface Repo { id: number; name: string; full_name: string; }
interface Branch { name: string; commit: string; commitMessage: string; }

interface SidebarProps {
  repos: Repo[];
  selectedRepo: string | null;
  branches: Branch[];
  userName: string;
  onFetchRepos: () => void;
  onRepoSelect: (e: React.ChangeEvent<HTMLSelectElement>) => void;
}

export default function Sidebar({ repos, selectedRepo, branches, userName, onFetchRepos, onRepoSelect }: SidebarProps) {
  const [branchSearch, setBranchSearch] = useState('');

  const onDragStart = (event: React.DragEvent, nodeType: string, branchData: any) => {
    event.dataTransfer.setData('application/reactflow/type', nodeType);
    event.dataTransfer.setData('application/reactflow/data', JSON.stringify(branchData));
    event.dataTransfer.effectAllowed = 'move';
  };

  // Filter branches: if no search query show first 3, else show all matching
  const filteredBranches = branchSearch.trim()
    ? branches.filter(b => b.name.toLowerCase().includes(branchSearch.toLowerCase()))
    : branches.slice(0, 3);

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <h1>Git Canvas</h1>
        <p>Visual Branch Manager</p>
        {repos.length > 0 && userName !== 'You' && (
          <div className="sidebar-user-badge">
            <span className="sidebar-user-avatar">{userName.substring(0, 1).toUpperCase()}</span>
            <span className="sidebar-user-name">{userName}</span>
          </div>
        )}
      </div>

      {!repos.length ? (
        <button className="btn" onClick={onFetchRepos}>
          <GitPullRequest size={18} /> Connect GitHub
        </button>
      ) : (
        <select className="select-input" value={selectedRepo || ''} onChange={onRepoSelect}>
          <option value="">Select a repository...</option>
          {repos.map(repo => (
            <option key={repo.id} value={repo.full_name}>{repo.name}</option>
          ))}
        </select>
      )}

      {selectedRepo && (
        <div className="drag-tools">
          <p className="drag-tools-label">Canvas Tools</p>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>

            {/* Comment drag tool */}
            <div
              className="branch-item tool-item"
              draggable
              onDragStart={(e) => onDragStart(e, 'sticky', {})}
              title="Drag to add a Figma-style comment"
            >
              <MessageCircle size={14} color="var(--accent)" />
              <p>Comment</p>
            </div>

            {/* Sticky Note drag tool */}
            <div
              className="branch-item tool-item"
              style={{ borderColor: 'rgba(251,191,36,0.4)', background: 'rgba(251,191,36,0.08)' }}
              draggable
              onDragStart={(e) => onDragStart(e, 'stickyNote', {})}
              title="Drag to add a sticky note"
            >
              <StickyNote size={14} color="#fbbf24" />
              <p style={{ color: '#fbbf24' }}>Sticky</p>
            </div>

            {/* Active indicator drag tool */}
            <div
              className="branch-item tool-item"
              style={{ borderColor: 'rgba(34,197,94,0.4)', background: 'rgba(34,197,94,0.08)' }}
              draggable
              onDragStart={(e) => onDragStart(e, 'activeIndicator', {})}
              title="Drag to add an active status indicator"
            >
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 6px #22c55e', flexShrink: 0, display: 'inline-block' }} />
              <p style={{ color: '#22c55e' }}>Active</p>
            </div>

          </div>
        </div>
      )}

      {selectedRepo && branches.length > 0 && (
        <>
          <div className="branches-header">
            <h4 className="branches-title">Branches</h4>
            <span className="branches-count">{branches.length} total</span>
          </div>

          {/* Search bar */}
          <div className="branch-search-wrap">
            <Search size={13} className="branch-search-icon" />
            <input
              className="branch-search-input"
              type="text"
              placeholder="Search branches…"
              value={branchSearch}
              onChange={e => setBranchSearch(e.target.value)}
            />
            {branchSearch && (
              <button className="branch-search-clear" onClick={() => setBranchSearch('')}>✕</button>
            )}
          </div>

          <div className="branch-list">
            {filteredBranches.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textAlign: 'center', margin: '8px 0' }}>No branches found</p>
            ) : (
              filteredBranches.map(branch => (
                <div
                  key={branch.name}
                  className="branch-item"
                  draggable
                  onDragStart={(e) => onDragStart(e, 'branch', branch)}
                >
                  <GitBranch size={15} color="var(--accent)" style={{ flexShrink: 0 }} />
                  <div style={{ overflow: 'hidden', minWidth: 0 }}>
                    <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{branch.name}</p>
                    {branch.commitMessage && (
                      <p style={{ margin: 0, fontSize: '0.72rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {branch.commitMessage}
                      </p>
                    )}
                  </div>
                </div>
              ))
            )}
            {!branchSearch && branches.length > 3 && (
              <p style={{ margin: '4px 0 0', fontSize: '0.72rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                Search to find more branches…
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
