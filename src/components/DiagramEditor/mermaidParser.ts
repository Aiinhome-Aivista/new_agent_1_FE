import { Node, Edge } from '@xyflow/react';

// Custom node data type to extend React Flow Node
export interface CustomNode extends Node {
  parentId?: string;
  extent?: 'parent';
}

const SUBGRAPH_PRESETS: { [id: string]: { x: number; y: number } } = {
  // Reference Architecture Subgraphs
  External: { x: 30, y: 50 },
  Orchestration: { x: 420, y: 50 },
  Knowledge: { x: 880, y: 50 },
  Guardrails: { x: 880, y: 350 },
  Output: { x: 1320, y: 50 },

  // Cloud Landscape Subgraphs
  OnPrem: { x: 30, y: 50 },
  Cloud: { x: 420, y: 50 },
  DataFlow: { x: 1050, y: 50 },
  Monitoring: { x: 1050, y: 350 },
};

// Helper to parse individual node definitions like ID["Label"] or shapes DB[("Label")]
function parseNodePart(part: string): { id: string; label: string } | null {
  const match = part.trim().match(/^([a-zA-Z0-9_-]+)(?:\[\("?(.*?)"?\)\]|\(\("?(.*?)"?\)\)|\("?(.*?)"?\)|\["?(.*?)"?\]|\{\{"?(.*?)"?\}\})?/);
  if (match) {
    const id = match[1].trim();
    let label = match[2] || match[3] || match[4] || match[5] || match[6] || id;
    
    // Clean outer quotes from label
    label = label.trim().replace(/^"|"$/g, '').trim();
    return { id, label };
  }
  return null;
}

/**
 * Parses a Mermaid graph syntax string into React Flow nodes and edges.
 * Performs a simple BFS-based layer layout to position nodes.
 */
export function parseMermaid(mermaidCode: string): { nodes: CustomNode[]; edges: Edge[] } {
  const nodes: CustomNode[] = [];
  const edges: Edge[] = [];

  if (!mermaidCode) return { nodes, edges };

  // Clean markdown backticks/code fences
  let clean = mermaidCode.trim();
  if (clean.startsWith('```mermaid')) {
    clean = clean.substring(10);
  } else if (clean.startsWith('```')) {
    clean = clean.substring(3);
  }
  if (clean.endsWith('```')) {
    clean = clean.substring(0, clean.length - 3);
  }
  clean = clean.trim();

  // Replace semicolons with newlines if they exist
  if (clean.includes(';')) {
    clean = clean.replace(/;/g, '\n');
  }

  const lines = clean.split('\n');
  let currentSubgraphId: string | null = null;
  let currentSubgraphLabel = '';
  
  // Track defined subgraphs
  const subgraphs: { id: string; label: string; nodeIds: string[] }[] = [];

  // Parse lines to extract subgraphs, nodes, and edges
  for (let line of lines) {
    line = line.trim();
    if (!line || line.startsWith('%%') || line.startsWith('graph')) {
      continue;
    }

    // Match subgraph start: subgraph External [External Sources] or subgraph External
    const subgraphMatch = line.match(/^subgraph\s+([a-zA-Z0-9_-]+)(?:\s+\[(.*?)\])?/i);
    if (subgraphMatch) {
      currentSubgraphId = subgraphMatch[1];
      currentSubgraphLabel = subgraphMatch[2] || currentSubgraphId;
      subgraphs.push({ id: currentSubgraphId, label: currentSubgraphLabel, nodeIds: [] });
      continue;
    }

    // Match subgraph end
    if (line.toLowerCase() === 'end') {
      currentSubgraphId = null;
      continue;
    }

    // Match edge definition: ID1 --> ID2 or ID1 -->|Label| ID2, handles inline node styling as well
    if (line.includes('-->') || line.includes('--')) {
      let sourcePart = '';
      let targetPart = '';
      let edgeLabel: string | undefined = undefined;

      const arrowMatch = line.match(/(.*?)(?:--+>(?:\|([^|]+)\|)?|--\s*([^-]+)\s*-->)(.*)/);
      if (arrowMatch) {
        sourcePart = arrowMatch[1].trim();
        edgeLabel = arrowMatch[2] || arrowMatch[3];
        targetPart = arrowMatch[4].trim();
        if (edgeLabel) edgeLabel = edgeLabel.trim();
      } else {
        const arrowIdx = line.indexOf('-->');
        if (arrowIdx !== -1) {
          sourcePart = line.substring(0, arrowIdx).trim();
          targetPart = line.substring(arrowIdx + 3).trim();
        }
      }

      if (sourcePart && targetPart) {
        const sourceNode = parseNodePart(sourcePart);
        const targetNode = parseNodePart(targetPart);

        if (sourceNode && targetNode) {
          // Ensure nodes exist and are typed
          let srcNode = nodes.find(n => n.id === sourceNode.id);
          if (!srcNode) {
            srcNode = {
              id: sourceNode.id,
              data: { label: sourceNode.label },
              position: { x: 0, y: 0 },
              type: 'customNode',
            };
            nodes.push(srcNode);
          } else if (srcNode.data.label === srcNode.id && sourceNode.label !== sourceNode.id) {
            srcNode.data.label = sourceNode.label;
          }

          if (currentSubgraphId) {
            const sg = subgraphs.find(s => s.id === currentSubgraphId);
            if (sg && !sg.nodeIds.includes(sourceNode.id)) {
              sg.nodeIds.push(sourceNode.id);
            }
          }

          let tgtNode = nodes.find(n => n.id === targetNode.id);
          if (!tgtNode) {
            tgtNode = {
              id: targetNode.id,
              data: { label: targetNode.label },
              position: { x: 0, y: 0 },
              type: 'customNode',
            };
            nodes.push(tgtNode);
          } else if (tgtNode.data.label === tgtNode.id && targetNode.label !== targetNode.id) {
            tgtNode.data.label = targetNode.label;
          }

          if (currentSubgraphId) {
            const sg = subgraphs.find(s => s.id === currentSubgraphId);
            if (sg && !sg.nodeIds.includes(targetNode.id)) {
              sg.nodeIds.push(targetNode.id);
            }
          }

          edges.push({
            id: `e-${sourceNode.id}-${targetNode.id}`,
            source: sourceNode.id,
            target: targetNode.id,
            label: edgeLabel,
            type: 'smoothstep',
            animated: true,
            style: { stroke: '#d04a02', strokeWidth: 2 },
          });
        }
      }
      continue;
    }

    // Match standalone node definitions
    const nodeInfo = parseNodePart(line);
    if (nodeInfo) {
      let node = nodes.find(n => n.id === nodeInfo.id);
      if (node) {
        if (nodeInfo.label !== nodeInfo.id) {
          node.data.label = nodeInfo.label;
        }
      } else {
        node = {
          id: nodeInfo.id,
          data: { label: nodeInfo.label },
          position: { x: 0, y: 0 },
          type: 'customNode',
        };
        nodes.push(node);
      }

      if (currentSubgraphId) {
        const sg = subgraphs.find(s => s.id === currentSubgraphId);
        if (sg && !sg.nodeIds.includes(nodeInfo.id)) {
          sg.nodeIds.push(nodeInfo.id);
        }
      }
    }
  }

  // Set parentId for nodes in subgraphs
  nodes.forEach(node => {
    const parentSg = subgraphs.find(s => s.nodeIds.includes(node.id));
    if (parentSg) {
      node.parentId = parentSg.id;
      node.extent = 'parent';
    }
  });

  // Subgraph-aware BFS layout logic
  const LOCAL_X_SPACING = 180;
  const LOCAL_Y_SPACING = 75;
  const PADDING_X = 30;
  const PADDING_Y = 50;

  const groupNodes: CustomNode[] = [];
  let nextDynamicX = 30;

  subgraphs.forEach(sg => {
    const sgNodes = nodes.filter(n => n.parentId === sg.id);
    if (sgNodes.length === 0) return;

    // Run local BFS layout to assign columns within this subgraph
    const localInDegree: { [id: string]: number } = {};
    const localAdj: { [id: string]: string[] } = {};

    sgNodes.forEach(n => {
      localInDegree[n.id] = 0;
      localAdj[n.id] = [];
    });

    edges.forEach(e => {
      // Only consider edges where source and target are both in this subgraph
      if (localInDegree[e.source] !== undefined && localInDegree[e.target] !== undefined) {
        localAdj[e.source].push(e.target);
        localInDegree[e.target]++;
      }
    });

    const queue: string[] = [];
    const localLayers: { [id: string]: number } = {};

    sgNodes.forEach(n => {
      if (localInDegree[n.id] === 0) {
        queue.push(n.id);
        localLayers[n.id] = 0;
      }
    });

    if (queue.length === 0 && sgNodes.length > 0) {
      queue.push(sgNodes[0].id);
      localLayers[sgNodes[0].id] = 0;
    }

    let head = 0;
    while (head < queue.length) {
      const u = queue[head++];
      const currentLayer = localLayers[u] || 0;
      const neighbors = localAdj[u] || [];
      neighbors.forEach(v => {
        const nextLayer = currentLayer + 1;
        if (localLayers[v] === undefined || localLayers[v] < nextLayer) {
          localLayers[v] = nextLayer;
          if (!queue.includes(v)) {
            queue.push(v);
          }
        }
      });
    }

    sgNodes.forEach(n => {
      if (localLayers[n.id] === undefined) {
        localLayers[n.id] = 0;
      }
    });

    // Group nodes by local layer
    const nodesByLocalLayer: { [layer: number]: CustomNode[] } = {};
    sgNodes.forEach(n => {
      const l = localLayers[n.id];
      if (!nodesByLocalLayer[l]) nodesByLocalLayer[l] = [];
      nodesByLocalLayer[l].push(n);
    });

    // Assign relative coordinates to nodes inside this subgraph
    let maxLayer = 0;
    let maxNodesCount = 0;

    Object.keys(nodesByLocalLayer).forEach(lStr => {
      const l = parseInt(lStr);
      maxLayer = Math.max(maxLayer, l);
      const layerNodes = nodesByLocalLayer[l];
      maxNodesCount = Math.max(maxNodesCount, layerNodes.length);

      layerNodes.forEach((n, idx) => {
        n.position = {
          x: l * LOCAL_X_SPACING + PADDING_X,
          y: idx * LOCAL_Y_SPACING + PADDING_Y,
        };
      });
    });

    // Calculate dimensions of the subgraph node container
    const width = maxLayer * LOCAL_X_SPACING + 160 + PADDING_X; // 160 accounts for default node width
    const height = maxNodesCount * LOCAL_Y_SPACING + 30 + PADDING_Y;

    // Position of the group node
    let preset = SUBGRAPH_PRESETS[sg.id];
    if (!preset) {
      preset = { x: nextDynamicX, y: 50 };
      nextDynamicX += width + 50;
    }

    groupNodes.push({
      id: sg.id,
      data: { label: sg.label },
      position: preset,
      type: 'customGroup',
      style: {
        width,
        height,
      },
    });
  });

  // Lay out top-level nodes (nodes not inside any subgraph)
  const topLevelNodes = nodes.filter(n => !n.parentId);
  if (topLevelNodes.length > 0) {
    topLevelNodes.forEach((n, idx) => {
      n.position = {
        x: 1500, // Place far to the right
        y: idx * LOCAL_Y_SPACING + PADDING_Y,
      };
    });
  }

  return {
    nodes: [...groupNodes, ...nodes],
    edges,
  };
}

/**
 * Serializes React Flow nodes and edges back into Mermaid graph syntax.
 */
export function stringifyMermaid(nodes: CustomNode[], edges: Edge[]): string {
  let mermaid = 'graph LR\n';

  // Group nodes by parentId
  const subgraphs: { [parentId: string]: CustomNode[] } = {};
  const topLevelNodes: CustomNode[] = [];

  nodes.forEach(n => {
    if (n.type === 'customGroup' || n.type === 'group') {
      // It's a subgraph container node
      if (!subgraphs[n.id]) subgraphs[n.id] = [];
    } else if (n.parentId) {
      if (!subgraphs[n.parentId]) subgraphs[n.parentId] = [];
      subgraphs[n.parentId].push(n);
    } else {
      topLevelNodes.push(n);
    }
  });

  // Write subgraphs
  Object.keys(subgraphs).forEach(sgId => {
    const parentNode = nodes.find(n => n.id === sgId);
    const sgLabel = parentNode?.data?.label || sgId;
    mermaid += `    subgraph ${sgId} [${sgLabel}]\n`;
    subgraphs[sgId].forEach(n => {
      mermaid += `        ${n.id}[${n.data.label}]\n`;
    });
    mermaid += '    end\n\n';
  });

  // Write top level nodes
  if (topLevelNodes.length > 0) {
    topLevelNodes.forEach(n => {
      mermaid += `    ${n.id}[${n.data.label}]\n`;
    });
    mermaid += '\n';
  }

  // Write edges
  edges.forEach(e => {
    if (e.label) {
      mermaid += `    ${e.source} -->|${e.label}| ${e.target}\n`;
    } else {
      mermaid += `    ${e.source} --> ${e.target}\n`;
    }
  });

  return mermaid;
}
