import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  addEdge,
  useNodesState,
  useEdgesState,
  Controls,
  Background,
  Handle,
  Position,
  useReactFlow,
} from '@xyflow/react';
import type { Connection, Edge } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Save, GitBranch, Trash2, MessageCircle } from 'lucide-react';

// ─── Branch Node ──────────────────────────────────────────────────────────────
const BranchNode = ({ data, selected }: any) => {
  const isActive = data.active === true; // only show indicator if explicitly set
  return (
    <div className={`custom-node ${selected ? 'selected' : ''}`}>
      <Handle type="target" position={Position.Top} />
      <div className="node-header">
        <GitBranch size={16} color="var(--accent)" />
        <h3>{data.name}</h3>
        {isActive && (
          <div className="active-indicator-wrap" title="Active branch">
            <span className="active-dot active" />
            <span className="active-dot-ring" />
          </div>
        )}
      </div>
      <div className="node-content">
        {data.commitMessage
          ? <span title={data.commitMessage}>{data.commitMessage.length > 40 ? data.commitMessage.substring(0, 40) + '…' : data.commitMessage}</span>
          : <span>SHA: {data.commit?.substring(0, 7)}</span>
        }
      </div>
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
};

// ─── Active Indicator Node (draggable standalone) ─────────────────────────────
const ActiveIndicatorNode = ({ id }: any) => {
  const { deleteElements } = useReactFlow();
  return (
    <div className="active-indicator-node" title="Active branch indicator — connect to a branch">
      <Handle type="source" position={Position.Bottom} />
      <div className="active-indicator-wrap">
        <span className="active-dot active" />
        <span className="active-dot-ring" />
      </div>
      <span className="active-indicator-label">Active</span>
      <button
        className="comment-delete-btn"
        style={{ marginLeft: 6, padding: 2 }}
        onClick={() => deleteElements({ nodes: [{ id }] })}
        title="Remove indicator"
      >
        <Trash2 size={11} />
      </button>
    </div>
  );
};

// ─── Comment Node (Figma-style) ───────────────────────────────────────────────
const CommentNode = ({ id, data }: any) => {
  const [open, setOpen] = useState(false);
  const { updateNodeData, deleteElements } = useReactFlow();

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    deleteElements({ nodes: [{ id }] });
  };

  const initials = (data.author || 'U').substring(0, 1).toUpperCase();
  const timestamp = data.time || 'just now';

  return (
    <div className="comment-node-wrap">
      {/* Small avatar pin */}
      <div
        className="comment-pin"
        onClick={() => setOpen(v => !v)}
        title="Toggle comment"
      >
        <span className="comment-pin-initial">{initials}</span>
      </div>

      {/* Popup card */}
      {open && (
        <div className="comment-card" onClick={e => e.stopPropagation()}>
          <div className="comment-card-header">
            <div className="comment-card-title">
              <MessageCircle size={13} />
              <span>Comment</span>
            </div>
            <button className="comment-delete-btn" onClick={handleDelete} title="Delete comment">
              <Trash2 size={13} />
            </button>
          </div>

          <div className="comment-author-row">
            <div className="comment-avatar">{initials}</div>
            <div>
              <p className="comment-author-name">{data.author || 'You'}</p>
              <p className="comment-timestamp">{timestamp}</p>
            </div>
          </div>

          <textarea
            className="comment-textarea"
            placeholder="Add a comment…"
            value={data.text || ''}
            onChange={e => {
              updateNodeData(id, { text: e.target.value });
            }}
            rows={3}
          />
        </div>
      )}
    </div>
  );
};

// ─── Sticky Note Node ─────────────────────────────────────────────────────────
const StickyNoteNode = ({ id, data }: any) => {
  const { updateNodeData, deleteElements } = useReactFlow();
  return (
    <div className="sticky-note-node">
      <div className="sticky-note-header">
        <span className="sticky-note-dots"><span/><span/><span/></span>
        <button
          className="sticky-note-delete"
          onClick={() => deleteElements({ nodes: [{ id }] })}
          title="Delete sticky note"
        >
          <Trash2 size={11} />
        </button>
      </div>
      <textarea
        className="sticky-note-textarea"
        placeholder="Write a note…"
        value={data.text || ''}
        onChange={e => updateNodeData(id, { text: e.target.value })}
      />
    </div>
  );
};

// ─── Node type registry ───────────────────────────────────────────────────────
const nodeTypes = {
  branch: BranchNode,
  sticky: CommentNode,
  stickyNote: StickyNoteNode,
  activeIndicator: ActiveIndicatorNode,
};

let id = 0;
const getId = () => `dndnode_${id++}`;

interface CanvasProps {
  savedState: any;
  onSave: (state: any) => void;
  userName: string;
}

// ─── Flow ─────────────────────────────────────────────────────────────────────
const Flow = ({ savedState, onSave, userName }: CanvasProps) => {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState<any>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<any>([]);
  const [reactFlowInstance, setReactFlowInstance] = useState<any>(null);

  useEffect(() => {
    if (savedState) {
      setNodes(savedState.nodes || []);
      setEdges(savedState.edges || []);
      id = savedState.nodes ? savedState.nodes.length + 100 : 0;
    } else {
      setNodes([]);
      setEdges([]);
    }
  }, [savedState, setNodes, setEdges]);

  const onConnect = useCallback(
    (params: Connection | Edge) =>
      setEdges((eds: any) =>
        addEdge(
          { ...params, animated: true, style: { stroke: 'var(--accent)', strokeWidth: 2 } } as any,
          eds,
        ),
      ),
    [setEdges],
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const type = event.dataTransfer.getData('application/reactflow/type');
      if (!type) return;

      const rawData = event.dataTransfer.getData('application/reactflow/data');
      const branchData = rawData ? JSON.parse(rawData) : {};

      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const newNode: any = {
        id: getId(),
        type,
        position,
        data: {
          ...branchData,
          ...(type === 'sticky' ? { author: userName, time: 'just now', text: '' } : {}),
          ...(type === 'stickyNote' ? { text: '' } : {}),
        },
      };

      setNodes((nds: any) => nds.concat(newNode));
    },
    [reactFlowInstance, setNodes, userName],
  );

  return (
    <div className="dndflow" style={{ width: '100%', height: '100%' }}>
      <div className="controls-overlay">
        <button
          className="btn"
          onClick={() => {
            const flow = reactFlowInstance?.toObject();
            if (flow) onSave(flow);
          }}
          disabled={!reactFlowInstance}
        >
          <Save size={16} /> Save Canvas
        </button>
      </div>
      <div className="reactflow-wrapper" ref={reactFlowWrapper} style={{ width: '100%', height: '100%' }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onInit={setReactFlowInstance}
          onDrop={onDrop}
          onDragOver={onDragOver}
          nodeTypes={nodeTypes}
          fitView
          attributionPosition="bottom-left"
          proOptions={{ hideAttribution: true }}
        >
          <Background color="#334155" size={2} />
          <Controls />
        </ReactFlow>
      </div>
    </div>
  );
};

export default function Canvas(props: CanvasProps) {
  return (
    <ReactFlowProvider>
      <Flow {...props} />
    </ReactFlowProvider>
  );
}
