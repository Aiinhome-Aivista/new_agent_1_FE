import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Handle,
  Position,
  NodeProps
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import './DiagramEditor.css';
import { parseMermaid, stringifyMermaid, CustomNode } from './mermaidParser';
import { Plus, Trash2, HelpCircle } from 'lucide-react';

// Custom Diagram Node Component (horizontal, Left/Right connection handles)
const CustomNodeComponent = ({ data, id }: NodeProps) => {
  const onDoubleClick = data.onDoubleClick as (event: React.MouseEvent, node: any) => void;
  const editingId = data.editingId as string | null;
  const editingValue = data.editingValue as string;
  const setEditingValue = data.setEditingValue as (val: string) => void;
  const finishEditing = data.finishEditing as (id: string) => void;
  const cancelEditing = data.cancelEditing as () => void;

  return (
    <div className="w-full h-full min-h-[40px] flex items-center justify-center relative select-none">
      {/* Target handle on the Left */}
      <Handle 
        type="target" 
        position={Position.Left} 
        style={{ background: '#d04a02', width: 8, height: 8, border: '2px solid #ffffff' }} 
      />
      
      <div className="w-full px-2 text-center">
        {editingId === id ? (
          <input
            className="node-rename-input w-full text-center bg-transparent outline-none font-bold text-xs border-none p-0 m-0"
            value={editingValue}
            onChange={(e) => setEditingValue(e.target.value)}
            onBlur={() => finishEditing(id)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') finishEditing(id);
              if (e.key === 'Escape') cancelEditing();
            }}
            autoFocus
          />
        ) : (
          <div 
            onDoubleClick={(e) => onDoubleClick(e, { id, data })}
            title="Double click to rename"
            className="py-1 cursor-pointer font-bold"
          >
            {data.label as string}
          </div>
        )}
      </div>

      {/* Source handle on the Right */}
      <Handle 
        type="source" 
        position={Position.Right} 
        style={{ background: '#d04a02', width: 8, height: 8, border: '2px solid #ffffff' }} 
      />
    </div>
  );
};

// Custom Diagram Subgraph/Group Container Component
const CustomGroupNode = ({ data, id, selected }: NodeProps) => {
  const onDoubleClick = data.onDoubleClick as (event: React.MouseEvent, node: any) => void;
  const editingId = data.editingId as string | null;
  const editingValue = data.editingValue as string;
  const setEditingValue = data.setEditingValue as (val: string) => void;
  const finishEditing = data.finishEditing as (id: string) => void;
  const cancelEditing = data.cancelEditing as () => void;

  return (
    <div className={`w-full h-full border-2 border-dashed border-[#cccccc] bg-[rgba(240,240,240,0.35)] rounded-lg flex flex-col pointer-events-none ${selected ? 'border-[#d04a02] bg-[rgba(240,240,240,0.45)]' : ''}`}>
      <div className="group-header pointer-events-auto text-[10px] font-extrabold uppercase tracking-wider text-[#4a4a4a] border-b border-dashed border-[#cccccc] bg-[rgba(240,240,240,0.55)] p-2 rounded-t-md">
        {editingId === id ? (
          <input
            className="group-rename-input font-extrabold outline-none bg-transparent w-full text-[10px] border-none p-0 m-0 text-[#2d2d2d]"
            value={editingValue}
            onChange={(e) => setEditingValue(e.target.value)}
            onBlur={() => finishEditing(id)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') finishEditing(id);
              if (e.key === 'Escape') cancelEditing();
            }}
            autoFocus
          />
        ) : (
          <div 
            onDoubleClick={(e) => onDoubleClick(e, { id, data })}
            title="Double click to rename group"
            className="cursor-pointer"
          >
            {data.label as string}
          </div>
        )}
      </div>
      <div className="flex-1 min-h-0" />
    </div>
  );
};

// Register custom nodes outside the component scope to avoid performance degradation/re-creation bugs
const nodeTypes = {
  customNode: CustomNodeComponent,
  customGroup: CustomGroupNode
};

interface DiagramEditorProps {
  initialMermaidCode: string;
  onChange: (newCode: string) => void;
}

export const DiagramEditor: React.FC<DiagramEditorProps> = ({
  initialMermaidCode,
  onChange
}) => {
  const [nodes, setNodes, onNodesChange] = useNodesState<CustomNode>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  
  // Track node editing state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState<string>('');
  
  // Subgraph assignment selection for new nodes
  const [selectedSubgraph, setSelectedSubgraph] = useState<string>('none');

  // Extract subgraph categories from nodes to build the select dropdown options
  const subgraphOptions = useMemo(() => {
    const list = new Set<string>();
    nodes.forEach(n => {
      if (n.type === 'customGroup') {
        list.add(n.id);
      }
    });
    return Array.from(list);
  }, [nodes]);

  // Track if we have already initialized the nodes and edges from the mermaid code
  const isInitialized = React.useRef(false);

  // Load initial nodes & edges from mermaid code when it becomes available
  useEffect(() => {
    console.log("DiagramEditor: initialMermaidCode =", initialMermaidCode);
    if (initialMermaidCode && !isInitialized.current) {
      const parsed = parseMermaid(initialMermaidCode);
      console.log("DiagramEditor: parsed nodes =", parsed.nodes);
      console.log("DiagramEditor: parsed edges =", parsed.edges);
      setNodes(parsed.nodes);
      setEdges(parsed.edges as any);
      isInitialized.current = true;
    }
  }, [initialMermaidCode, setNodes, setEdges]);

  // Save changes and trigger onChange callback
  const saveChanges = useCallback((updatedNodes: CustomNode[], updatedEdges: Edge[]) => {
    try {
      const newMermaid = stringifyMermaid(updatedNodes, updatedEdges);
      onChange(newMermaid);
    } catch (e) {
      console.error('Error generating mermaid:', e);
    }
  }, [onChange]);

  // Handle node connections
  const onConnect = useCallback(
    (params: Connection) => {
      const newEdge: Edge = {
        id: `e-${params.source}-${params.target}`,
        source: params.source,
        target: params.target,
        sourceHandle: params.sourceHandle,
        targetHandle: params.targetHandle,
        type: 'smoothstep',
        animated: true,
        style: { stroke: '#d04a02', strokeWidth: 2 }
      };
      setEdges((eds) => {
        const updated = addEdge(newEdge, eds);
        // Defer saving to avoid state cycle
        setTimeout(() => saveChanges(nodes, updated), 50);
        return updated;
      });
    },
    [nodes, setEdges, saveChanges]
  );

  // Handle double clicking node to start rename
  const onNodeDoubleClick = useCallback((event: React.MouseEvent, node: any) => {
    event.stopPropagation();
    setEditingId(node.id);
    setEditingValue(node.data.label as string || node.id);
  }, []);

  // Save rename changes
  const finishEditing = useCallback((id: string) => {
    if (!editingValue.trim()) {
      setEditingId(null);
      return;
    }

    setNodes((nds) => {
      const updated = nds.map((node) => {
        if (node.id === id) {
          return {
            ...node,
            data: {
              ...node.data,
              label: editingValue.trim()
            }
          };
        }
        return node;
      });
      setTimeout(() => saveChanges(updated, edges), 50);
      return updated;
    });
    setEditingId(null);
  }, [editingValue, edges, setNodes, saveChanges]);

  // Cancel node renaming
  const cancelEditing = useCallback(() => {
    setEditingId(null);
  }, []);

  // Map nodes to pass handlers to custom nodes
  const displayNodes = useMemo(() => {
    return nodes.map((node) => ({
      ...node,
      data: {
        ...node.data,
        editingId,
        editingValue,
        setEditingValue,
        finishEditing,
        cancelEditing,
        onDoubleClick: onNodeDoubleClick
      }
    }));
  }, [nodes, editingId, editingValue, onNodeDoubleClick, finishEditing, cancelEditing]);

  // Add a new node (box)
  const addNode = useCallback(() => {
    const id = `node_${Date.now().toString().slice(-6)}`;
    const label = `New Box ${nodes.filter(n => n.type !== 'customGroup').length + 1}`;
    
    let position = { x: 100, y: 100 };
    let parentId: string | undefined = undefined;
    let extent: 'parent' | undefined = undefined;

    if (selectedSubgraph !== 'none') {
      parentId = selectedSubgraph;
      extent = 'parent';
      // Put position relative inside parent
      position = { x: 30, y: 50 };
    }

    const newNode: CustomNode = {
      id,
      position,
      data: { label },
      parentId,
      extent,
      type: 'customNode'
    };

    setNodes((nds) => {
      const updated = [...nds, newNode];
      setTimeout(() => saveChanges(updated, edges), 50);
      return updated;
    });

    // Start editing new node instantly
    setEditingId(id);
    setEditingValue(label);
  }, [nodes, edges, selectedSubgraph, setNodes, saveChanges]);

  // Delete selected nodes or edges
  const deleteSelected = useCallback(() => {
    const selectedNodeIds = nodes.filter(n => n.selected).map(n => n.id);
    const selectedEdgeIds = edges.filter(e => e.selected).map(e => e.id);

    if (selectedNodeIds.length === 0 && selectedEdgeIds.length === 0) {
      alert('Please click on a node or edge first to select it.');
      return;
    }

    setNodes((nds) => {
      // Don't delete parent groups unless specifically selected, and if a group is deleted, delete children or unparent them
      const updatedNodes = nds.filter(n => !selectedNodeIds.includes(n.id)).map(n => {
        if (n.parentId && selectedNodeIds.includes(n.parentId)) {
          // Unparent children if parent group is deleted
          const { parentId, extent, ...rest } = n;
          return rest as CustomNode;
        }
        return n;
      });

      setEdges((eds) => {
        // Remove connected edges for deleted nodes
        const updatedEdges = eds.filter(
          (e) =>
            !selectedEdgeIds.includes(e.id) &&
            !selectedNodeIds.includes(e.source) &&
            !selectedNodeIds.includes(e.target)
        );
        setTimeout(() => saveChanges(updatedNodes, updatedEdges), 50);
        return updatedEdges;
      });

      return updatedNodes;
    });
  }, [nodes, edges, setNodes, setEdges, saveChanges]);

  // Handle direct node/edge deletions (e.g. delete key pressed)
  const onNodesDelete = useCallback((deleted: CustomNode[]) => {
    const deletedIds = deleted.map(d => d.id);
    setNodes((nds) => {
      const updatedNodes = nds.filter(n => !deletedIds.includes(n.id));
      setTimeout(() => saveChanges(updatedNodes, edges), 50);
      return updatedNodes;
    });
  }, [edges, setNodes, saveChanges]);

  const onEdgesDelete = useCallback((deleted: Edge[]) => {
    const deletedIds = deleted.map(d => d.id);
    setEdges((eds) => {
      const updatedEdges = eds.filter(e => !deletedIds.includes(e.id));
      setTimeout(() => saveChanges(nodes, updatedEdges), 50);
      return updatedEdges;
    });
  }, [nodes, setEdges, saveChanges]);

  // Handle node drag stop (to save position changes)
  const onNodeDragStop = useCallback(() => {
    saveChanges(nodes, edges);
  }, [nodes, edges, saveChanges]);

  return (
    <div className="diagram-editor-container">
      {/* Top Toolbar */}
      <div className="diagram-editor-toolbar">
        <div className="diagram-editor-toolbar-actions">
          <button 
            type="button" 
            className="diagram-toolbar-btn primary"
            onClick={addNode}
          >
            <Plus size={14} /> Add Box
          </button>
          
          <select 
            className="text-[10px] font-bold border border-gray-300 rounded px-1.5 py-1 bg-white"
            value={selectedSubgraph}
            onChange={(e) => setSelectedSubgraph(e.target.value)}
          >
            <option value="none">No Subgraph (Top level)</option>
            {subgraphOptions.map(sg => (
              <option key={sg} value={sg}>Inside: {sg}</option>
            ))}
          </select>

          <button 
            type="button" 
            className="diagram-toolbar-btn danger"
            onClick={deleteSelected}
          >
            <Trash2 size={14} /> Delete Selected
          </button>
        </div>

        <div className="flex items-center gap-1.5 text-[10px] text-gray-500 font-medium">
          <HelpCircle size={12} className="text-gray-400" />
          <span>Double-click box/group header to rename. Drag handles to connect. Drag box to move.</span>
        </div>
      </div>

      {/* React Flow Canvas */}
      <div className="diagram-editor-flow">
        <ReactFlow
          nodes={displayNodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodesDelete={onNodesDelete}
          onEdgesDelete={onEdgesDelete}
          onNodeDragStop={onNodeDragStop}
          fitView
          attributionPosition="bottom-left"
        >
          <Controls />
          <MiniMap zoomable pannable />
          <Background color="#ccc" gap={16} />
        </ReactFlow>
      </div>
    </div>
  );
};
