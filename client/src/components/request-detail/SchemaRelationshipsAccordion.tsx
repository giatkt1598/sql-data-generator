import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Stack,
  Tab,
  Tabs,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { useEffect, useRef, useState } from 'react';
import dagre from '@dagrejs/dagre';
import {
  Background,
  Controls,
  type Edge,
  type Node,
  ReactFlow,
  useEdgesState,
  useNodesState,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { estimateRelationshipRows } from '../../utilities/relationshipEstimate';
import { useMockDataSchemaDetailContext } from './MockDataSchemaDetailContext';

type RelationshipNode = {
  count?: number;
  distribution?: number[];
  [childTableName: string]: RelationshipNode | number[] | number | undefined;
};

type RelationshipConfig = Array<Record<string, RelationshipNode>>;

type VisualNode = {
  name: string;
  count?: number;
  distribution?: number[];
  children: VisualNode[];
};

type GraphData = {
  nodes: Node[];
  edges: Edge[];
  error?: string;
};

const GRAPH_NODE_WIDTH = 170;
const GRAPH_NODE_HEIGHT = 48;
const GRAPH_NODE_GAP_X = 40;
const GRAPH_NODE_GAP_Y = 30;
const GRAPH_GROUP_GAP_X = 80;

function layoutGraph(nodes: Node[], edges: Edge[]): { nodes: Node[]; edges: Edge[] } {
  if (nodes.length === 0) {
    return { nodes, edges };
  }

  const nodeIds = nodes.map((node) => node.id);
  const adjacency = new Map<string, string[]>();
  const incomingCount = new Map<string, number>(nodeIds.map((id) => [id, 0]));

  nodeIds.forEach((id) => adjacency.set(id, []));
  edges.forEach((edge) => {
    adjacency.get(edge.source)?.push(edge.target);
    incomingCount.set(edge.target, (incomingCount.get(edge.target) ?? 0) + 1);
  });

  const roots = nodeIds.filter((id) => (incomingCount.get(id) ?? 0) === 0);
  const visited = new Set<string>();
  const groups: string[][] = [];

  function collectGroup(root: string) {
    const stack = [root];
    const group: string[] = [];
    while (stack.length > 0) {
      const current = stack.pop();
      if (!current || visited.has(current)) {
        continue;
      }
      visited.add(current);
      group.push(current);
      const children = adjacency.get(current) ?? [];
      for (const child of children) {
        stack.push(child);
      }
    }
    if (group.length > 0) {
      groups.push(group);
    }
  }

  roots.forEach((root) => collectGroup(root));
  nodeIds.forEach((nodeId) => {
    if (!visited.has(nodeId)) {
      collectGroup(nodeId);
    }
  });

  const groupsWithSize = groups.map((group) => ({
    nodes: group,
    size: group.length,
  }));
  groupsWithSize.sort((a, b) => b.size - a.size);

  const positionedNodes: Node[] = [];
  let offsetX = 0;

  for (const group of groupsWithSize) {
    const groupSet = new Set(group.nodes);
    const groupNodes = nodes.filter((node) => groupSet.has(node.id));
    const groupEdges = edges.filter(
      (edge) => groupSet.has(edge.source) && groupSet.has(edge.target),
    );

    const graph = new dagre.graphlib.Graph();
    graph.setDefaultEdgeLabel(() => ({}));
    graph.setGraph({
      rankdir: 'TB',
      nodesep: GRAPH_NODE_GAP_X,
      ranksep: GRAPH_NODE_GAP_Y,
      edgesep: 10,
    });

    groupNodes.forEach((node) => {
      graph.setNode(node.id, { width: GRAPH_NODE_WIDTH, height: GRAPH_NODE_HEIGHT });
    });
    groupEdges.forEach((edge) => {
      graph.setEdge(edge.source, edge.target);
    });

    dagre.layout(graph);

    let minX = Number.POSITIVE_INFINITY;
    let maxX = Number.NEGATIVE_INFINITY;

    groupNodes.forEach((node) => {
      const layoutNode = graph.node(node.id) as { x: number; y: number } | undefined;
      if (!layoutNode) {
        return;
      }
      const x = layoutNode.x - GRAPH_NODE_WIDTH / 2;
      const y = layoutNode.y - GRAPH_NODE_HEIGHT / 2;
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x + GRAPH_NODE_WIDTH);
      positionedNodes.push({
        ...node,
        position: {
          x: x + offsetX - minX,
          y,
        },
      });
    });

    const groupWidth = maxX - minX;
    offsetX += groupWidth + GRAPH_GROUP_GAP_X;
  }

  return { nodes: positionedNodes, edges };
}

function parseRelationshipsJson(rawJson: string): { roots: VisualNode[]; error?: string } {
  const trimmed = rawJson.trim();
  if (!trimmed) {
    return { roots: [] };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    return { roots: [], error: 'Schema Relationships JSON is not valid JSON.' };
  }

  const config: RelationshipConfig = Array.isArray(parsed)
    ? (parsed as RelationshipConfig)
    : ([parsed] as RelationshipConfig);

  function extractChildren(node: RelationshipNode): Array<[string, RelationshipNode]> {
    const children: Array<[string, RelationshipNode]> = [];
    for (const [key, value] of Object.entries(node)) {
      if (key === 'count' || key === 'distribution' || key.includes('.')) {
        continue;
      }
      if (!value || typeof value !== 'object' || Array.isArray(value)) {
        continue;
      }
      children.push([key, value as RelationshipNode]);
    }
    return children;
  }

  function buildNode(tableName: string, node: RelationshipNode): VisualNode {
    const count = Number.isInteger(node.count) ? (node.count as number) : undefined;
    const distribution = Array.isArray(node.distribution)
      ? node.distribution.filter((value) => Number.isInteger(value) && value >= 0)
      : undefined;

    return {
      name: tableName,
      count,
      distribution: distribution && distribution.length > 0 ? distribution : undefined,
      children: extractChildren(node).map(([childName, childNode]) =>
        buildNode(childName, childNode),
      ),
    };
  }

  const roots: VisualNode[] = [];
  for (const item of config) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      continue;
    }
    for (const [tableName, node] of Object.entries(item)) {
      if (!node || typeof node !== 'object' || Array.isArray(node)) {
        continue;
      }
      roots.push(buildNode(tableName, node as RelationshipNode));
    }
  }

  return { roots };
}

function buildGraphData(roots: VisualNode[]): GraphData {
  const nodesById = new Map<string, Node>();
  const edgesById = new Map<string, Edge>();
  const depthIndex: Record<number, number> = {};
  const maxDepthByNode = new Map<string, number>();
  const countByNode = new Map<string, number>();

  function ensureNode(name: string, depth: number) {
    const existingDepth = maxDepthByNode.get(name) ?? -1;
    if (depth > existingDepth) {
      maxDepthByNode.set(name, depth);
    }
  }

  function visit(node: VisualNode, depth: number) {
    ensureNode(node.name, depth);
    if (typeof node.count === 'number') {
      const current = countByNode.get(node.name);
      if (typeof current !== 'number' || node.count > current) {
        countByNode.set(node.name, node.count);
      }
    }
    for (const child of node.children) {
      ensureNode(child.name, depth + 1);
      const edgeId = `${node.name}->${child.name}`;
      if (!edgesById.has(edgeId)) {
        edgesById.set(edgeId, {
          id: edgeId,
          source: node.name,
          target: child.name,
          label:
            child.distribution && child.distribution.length > 0
              ? `[${child.distribution.join(',')}]`
              : undefined,
          type: 'smoothstep',
        });
      }
      visit(child, depth + 1);
    }
  }

  for (const root of roots) {
    visit(root, 0);
  }

  const orderedNodes = Array.from(maxDepthByNode.entries()).sort((a, b) => {
    if (a[1] !== b[1]) {
      return a[1] - b[1];
    }
    return a[0].localeCompare(b[0]);
  });

  for (const [name, depth] of orderedNodes) {
    depthIndex[depth] = depthIndex[depth] ?? 0;
    const index = depthIndex[depth];
    depthIndex[depth] += 1;

    const count = countByNode.get(name);
    const label = count ? `${name}\n(count: ${count})` : name;

    nodesById.set(name, {
      id: name,
      position: { x: depth * 280, y: index * 140 },
      data: { label },
      style: {
        padding: '8px 12px',
        borderRadius: 8,
        border: '1px solid #cbd5f5',
        background: '#f8fafc',
        fontSize: 12,
        whiteSpace: 'pre-line',
      },
    });
  }

  return layoutGraph(Array.from(nodesById.values()), Array.from(edgesById.values()));
}

export function SchemaRelationshipsAccordion() {
  const context = useMockDataSchemaDetailContext();
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [activeTab, setActiveTab] = useState(0);
  const [estimate, setEstimate] = useState(() =>
    estimateRelationshipRows(context.form.schemaRelationshipsJson, context.designerModel),
  );
  const [visualization, setVisualization] = useState(() =>
    parseRelationshipsJson(context.form.schemaRelationshipsJson),
  );
  const lastGraphSignatureRef = useRef('');
  const lastTextRef = useRef(context.form.schemaRelationshipsJson ?? '');
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) {
      return;
    }

    if (textarea.value !== context.form.schemaRelationshipsJson) {
      textarea.value = context.form.schemaRelationshipsJson;
    }
  }, [context.form.schemaRelationshipsJson]);

  useEffect(() => {
    const calculateEstimate = () => {
      const currentText =
        textareaRef.current?.value ?? lastTextRef.current ?? context.form.schemaRelationshipsJson ?? '';
      lastTextRef.current = currentText;
      setEstimate(estimateRelationshipRows(currentText, context.designerModel));
      const nextVisualization = parseRelationshipsJson(currentText);
      setVisualization(nextVisualization);

      const nextSignature = currentText.trim();
      if (nextSignature !== lastGraphSignatureRef.current) {
        lastGraphSignatureRef.current = nextSignature;
        const nextGraphData = nextVisualization.error
          ? { nodes: [], edges: [], error: nextVisualization.error }
          : buildGraphData(nextVisualization.roots);
        setNodes(nextGraphData.nodes);
        setEdges(nextGraphData.edges);
      }
    };

    calculateEstimate();
    const intervalId = window.setInterval(calculateEstimate, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [context.designerModel]);

  const estimateTooltip = estimate
    ? estimate.error
      ? estimate.error
      : estimate.overflow
        ? 'Estimated rows exceeded 9999999. Estimation stopped early.'
        : Object.entries(estimate.rowCountByTable)
            .sort((left, right) => right[1] - left[1])
            .map(([tableName, rowCount]) => `${tableName}: ${rowCount.toLocaleString()} rows`)
            .join('\n')
    : '';

  return (
    <Accordion
      expanded={context.relationshipsExpanded}
      onChange={(_event, value) => context.setRelationshipsExpanded(value)}
    >
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Typography sx={{ fontWeight: 700 }}>Schema Relationships</Typography>
      </AccordionSummary>
      <AccordionDetails>
        <Stack spacing={1.5}>
          <Tabs
            value={activeTab}
            onChange={(_event, value) => {
              if (activeTab === 0 && textareaRef.current) {
                lastTextRef.current = textareaRef.current.value;
              }
              setActiveTab(value);
            }}
          >
            <Tab label="Raw JSON" />
            <Tab label="Visualization View" />
          </Tabs>
          {activeTab === 0 && (
            <TextField
              label="Schema Relationships JSON"
              defaultValue={context.form.schemaRelationshipsJson}
              multiline
              minRows={6}
              maxRows={12}
              inputRef={textareaRef}
              onBlur={(event) =>
                context.setForm((prev) => ({
                  ...prev,
                  schemaRelationshipsJson: event.target.value,
                }))
              }
              helperText="Use strict JSON array format (no comments). Default distribution is [1]."
              fullWidth
            />
          )}
          {activeTab === 1 && (
            <Box
              sx={{
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 1,
                px: 2,
                py: 1.5,
                minHeight: 180,
              }}
            >
              {visualization.error && (
                <Typography color="error.main">{visualization.error}</Typography>
              )}
              {!visualization.error && visualization.roots.length === 0 && (
                <Typography color="text.secondary">
                  No relationship data to visualize.
                </Typography>
              )}
              {!visualization.error && visualization.roots.length > 0 && (
                <Box sx={{ height: 420 }}>
                  <ReactFlow
                    nodes={nodes}
                    edges={edges}
                    onNodesChange={onNodesChange}
                    onEdgesChange={onEdgesChange}
                    fitView
                    nodesDraggable
                    nodesConnectable={false}
                    panOnDrag
                  >
                    <Background gap={16} size={0.6} />
                    <Controls />
                  </ReactFlow>
                </Box>
              )}
            </Box>
          )}
          {estimate?.summary && (
            <Tooltip
              title={<Box sx={{ whiteSpace: 'pre-line', fontSize: 12 }}>{estimateTooltip}</Box>}
              placement="top-start"
              arrow
            >
              <Box
                sx={{
                  display: 'inline-flex',
                  width: 'fit-content',
                  px: 1.5,
                  py: 0.75,
                  borderRadius: 1,
                  border: '1px solid',
                  borderColor: estimate.error || estimate.overflow ? 'error.main' : 'divider',
                  backgroundColor:
                    estimate.error || estimate.overflow ? 'error.lighter' : 'background.paper',
                  cursor: 'help',
                }}
              >
                <Typography
                  variant="body2"
                  color={estimate.error || estimate.overflow ? 'error.main' : 'text.secondary'}
                >
                  {estimate.summary}
                </Typography>
              </Box>
            </Tooltip>
          )}
        </Stack>
      </AccordionDetails>
    </Accordion>
  );
}
