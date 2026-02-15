import { createLogger } from '../../lib/logger.mjs';

const log = createLogger('cytoscape-generator');

const DEFAULT_STYLE = [
  {
    selector: 'node',
    style: {
      'background-color': '#7986cb',
      'label': 'data(label)',
      'color': '#e8e8f0',
      'text-valign': 'center',
      'text-halign': 'center',
      'font-size': '11px',
      'width': '60px',
      'height': '60px',
      'border-width': '2px',
      'border-color': '#5c6bc0'
    }
  },
  {
    selector: 'node.highlight',
    style: {
      'background-color': '#4db6ac',
      'border-color': '#26a69a',
      'width': '80px',
      'height': '80px',
      'font-size': '13px',
      'font-weight': 'bold'
    }
  },
  {
    selector: 'edge',
    style: {
      'width': 2,
      'line-color': 'rgba(121, 134, 203, 0.5)',
      'target-arrow-color': 'rgba(121, 134, 203, 0.5)',
      'target-arrow-shape': 'triangle',
      'curve-style': 'bezier',
      'arrow-scale': 0.8
    }
  },
  {
    selector: 'edge.strong',
    style: {
      'width': 4,
      'line-color': '#4db6ac',
      'target-arrow-color': '#4db6ac'
    }
  }
];

const DEFAULT_LAYOUT = {
  name: 'cose',
  idealEdgeLength: 100,
  nodeOverlap: 20,
  refresh: 20,
  fit: true,
  padding: 30,
  randomize: false,
  componentSpacing: 100,
  nodeRepulsion: 400000,
  edgeElasticity: 100,
  nestingFactor: 5,
  gravity: 80,
  numIter: 1000,
  animate: false
};

export function validateCytoscapeData(data) {
  if (!data || typeof data !== 'object') return false;
  if (!data.elements || typeof data.elements !== 'object') return false;
  if (!Array.isArray(data.elements.nodes) || data.elements.nodes.length === 0) return false;

  for (const node of data.elements.nodes) {
    if (!node.data || !node.data.id) return false;
  }

  if (data.elements.edges) {
    for (const edge of data.elements.edges) {
      if (!edge.data || !edge.data.source || !edge.data.target) return false;
    }
  }

  return true;
}

export function normalizeCytoscapeData(data) {
  if (!validateCytoscapeData(data)) {
    log.warn('Invalid Cytoscape data, returning null');
    return null;
  }

  return {
    elements: data.elements,
    style: data.style || DEFAULT_STYLE,
    layout: data.layout || DEFAULT_LAYOUT
  };
}

export function createSimpleGraph(nodes, edges) {
  return normalizeCytoscapeData({
    elements: {
      nodes: nodes.map(n => ({
        data: { id: n.id, label: n.label },
        classes: n.highlight ? 'highlight' : ''
      })),
      edges: edges.map(e => ({
        data: { source: e.source, target: e.target },
        classes: e.strong ? 'strong' : ''
      }))
    }
  });
}
