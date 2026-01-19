/**
 * SWE Hackers Interactive Diagram Utilities
 * Cytoscape.js helper functions and common configurations
 */

// Track diagram animation states
const diagramAnimationState = new Map();

// Color palette matching CSS variables
const COLORS = {
  bgPrimary: '#0a0a0f',
  bgSecondary: '#12121a',
  bgTertiary: '#1a1a2e',
  bgCard: '#16162a',
  textPrimary: '#e8e8f0',
  textSecondary: '#a8a8b8',
  textMuted: '#6a6a80',
  accentPrimary: '#7986cb',
  accentSecondary: '#4db6ac',
  accentSuccess: '#66bb6a',
  accentWarning: '#ffd54f',
  accentError: '#ef5350',
  nodeService: '#7986cb',
  nodePage: '#4db6ac',
  nodeData: '#66bb6a',
  nodeAuth: '#ffd54f',
  nodeExternal: '#ef5350',
  nodeConfig: '#ab47bc',
  nodeUI: '#42a5f5'
};

// Node type to color mapping
const NODE_COLORS = {
  service: COLORS.nodeService,
  page: COLORS.nodePage,
  data: COLORS.nodeData,
  auth: COLORS.nodeAuth,
  external: COLORS.nodeExternal,
  config: COLORS.nodeConfig,
  ui: COLORS.nodeUI,
  default: COLORS.accentPrimary
};

/**
 * Base Cytoscape stylesheet for all diagrams
 */
function getBaseStylesheet() {
  return [
    {
      selector: 'node',
      style: {
        'background-color': COLORS.nodeService,
        'label': 'data(label)',
        'color': COLORS.textPrimary,
        'text-valign': 'center',
        'text-halign': 'center',
        'font-size': '12px',
        'font-family': 'Inter, sans-serif',
        'text-wrap': 'wrap',
        'text-max-width': '100px',
        'width': 'label',
        'height': 'label',
        'padding': '16px',
        'shape': 'roundrectangle',
        'border-width': 2,
        'border-color': COLORS.accentPrimary,
        'transition-property': 'background-color, border-color, width, height',
        'transition-duration': '0.2s'
      }
    },
    {
      selector: 'node[type="service"]',
      style: {
        'background-color': COLORS.nodeService,
        'border-color': '#5c6bc0'
      }
    },
    {
      selector: 'node[type="page"]',
      style: {
        'background-color': COLORS.nodePage,
        'border-color': '#26a69a'
      }
    },
    {
      selector: 'node[type="data"]',
      style: {
        'background-color': COLORS.nodeData,
        'border-color': '#43a047',
        'shape': 'barrel'
      }
    },
    {
      selector: 'node[type="auth"]',
      style: {
        'background-color': COLORS.nodeAuth,
        'border-color': '#ffb300',
        'color': COLORS.bgPrimary
      }
    },
    {
      selector: 'node[type="external"]',
      style: {
        'background-color': COLORS.nodeExternal,
        'border-color': '#e53935'
      }
    },
    {
      selector: 'node[type="config"]',
      style: {
        'background-color': COLORS.nodeConfig,
        'border-color': '#8e24aa'
      }
    },
    {
      selector: 'node[type="ui"]',
      style: {
        'background-color': COLORS.nodeUI,
        'border-color': '#1e88e5'
      }
    },
    {
      selector: 'node[type="group"]',
      style: {
        'background-color': COLORS.bgTertiary,
        'border-color': COLORS.accentPrimary,
        'border-style': 'dashed',
        'text-valign': 'top',
        'text-halign': 'center',
        'font-size': '14px',
        'font-weight': '600',
        'padding': '24px'
      }
    },
    {
      selector: 'node:selected',
      style: {
        'border-width': 4,
        'border-color': COLORS.accentSecondary,
        'background-color': ele => {
          const type = ele.data('type');
          return NODE_COLORS[type] || NODE_COLORS.default;
        }
      }
    },
    {
      selector: 'node:active',
      style: {
        'overlay-color': COLORS.accentPrimary,
        'overlay-padding': 8,
        'overlay-opacity': 0.2
      }
    },
    {
      selector: 'edge',
      style: {
        'width': 2,
        'line-color': COLORS.accentPrimary,
        'target-arrow-color': COLORS.accentPrimary,
        'target-arrow-shape': 'triangle',
        'curve-style': 'bezier',
        'arrow-scale': 1.2,
        'opacity': 0.7,
        'transition-property': 'line-color, target-arrow-color, width, opacity',
        'transition-duration': '0.2s'
      }
    },
    {
      selector: 'edge[type="data"]',
      style: {
        'line-color': COLORS.nodeData,
        'target-arrow-color': COLORS.nodeData,
        'line-style': 'dashed'
      }
    },
    {
      selector: 'edge[type="auth"]',
      style: {
        'line-color': COLORS.nodeAuth,
        'target-arrow-color': COLORS.nodeAuth
      }
    },
    {
      selector: 'edge[type="optional"]',
      style: {
        'line-color': COLORS.textMuted,
        'target-arrow-color': COLORS.textMuted,
        'line-style': 'dotted',
        'opacity': 0.5
      }
    },
    {
      selector: 'edge:selected',
      style: {
        'width': 4,
        'line-color': COLORS.accentSecondary,
        'target-arrow-color': COLORS.accentSecondary,
        'opacity': 1
      }
    },
    {
      selector: 'edge.highlighted',
      style: {
        'width': 4,
        'line-color': COLORS.accentSecondary,
        'target-arrow-color': COLORS.accentSecondary,
        'opacity': 1,
        'z-index': 999
      }
    },
    {
      selector: 'node.highlighted',
      style: {
        'border-width': 4,
        'border-color': COLORS.accentSecondary
      }
    },
    {
      selector: 'node.faded',
      style: {
        'opacity': 0.3
      }
    },
    {
      selector: 'edge.faded',
      style: {
        'opacity': 0.1
      }
    }
  ];
}

/**
 * Create a Cytoscape instance with common configuration
 */
function createDiagram(containerId, elements, options = {}) {
  const container = document.getElementById(containerId);
  if (!container) {
    console.error(`Container #${containerId} not found`);
    return null;
  }

  const cy = cytoscape({
    container: container,
    elements: elements,
    style: getBaseStylesheet(),
    layout: options.layout || {
      name: 'dagre',
      rankDir: 'TB',
      nodeSep: 50,
      rankSep: 80,
      padding: 30
    },
    minZoom: 0.3,
    maxZoom: 3,
    wheelSensitivity: 0.3,
    boxSelectionEnabled: true,
    selectionType: 'single',
    ...options
  });

  // Add interactivity
  setupNodeInteractivity(cy, containerId);
  
  return cy;
}

/**
 * Setup node hover and click interactions
 */
function setupNodeInteractivity(cy, containerId) {
  const container = document.getElementById(containerId);
  const tooltip = createTooltip(container);

  // Hover effects - highlight connected nodes
  cy.on('mouseover', 'node', function(e) {
    const node = e.target;
    
    // Skip group nodes
    if (node.data('type') === 'group') return;
    
    // Highlight this node and connected elements
    const connected = node.connectedEdges().connectedNodes();
    cy.elements().addClass('faded');
    node.removeClass('faded').addClass('highlighted');
    node.connectedEdges().removeClass('faded').addClass('highlighted');
    connected.removeClass('faded');
    
    // Show tooltip
    showTooltip(tooltip, node, container);
  });

  cy.on('mouseout', 'node', function(e) {
    cy.elements().removeClass('faded highlighted');
    hideTooltip(tooltip);
  });

  // Click to select and keep highlighted
  cy.on('tap', 'node', function(e) {
    const node = e.target;
    if (node.data('type') === 'group') return;
    
    // Toggle selection
    if (node.selected()) {
      node.unselect();
      cy.elements().removeClass('faded highlighted');
    } else {
      cy.nodes().unselect();
      node.select();
    }
  });

  // Click on background to deselect
  cy.on('tap', function(e) {
    if (e.target === cy) {
      cy.elements().removeClass('faded highlighted');
      cy.nodes().unselect();
      hideTooltip(tooltip);
    }
  });

  // Pan/zoom reset on double tap background
  cy.on('dbltap', function(e) {
    if (e.target === cy) {
      cy.fit(50);
    }
  });
}

/**
 * Create tooltip element
 */
function createTooltip(container) {
  let tooltip = container.querySelector('.node-tooltip');
  if (!tooltip) {
    tooltip = document.createElement('div');
    tooltip.className = 'node-tooltip';
    container.appendChild(tooltip);
  }
  return tooltip;
}

/**
 * Show tooltip with node info
 */
function showTooltip(tooltip, node, container) {
  const data = node.data();
  const pos = node.renderedPosition();
  const containerRect = container.getBoundingClientRect();
  
  // Build connections list
  const incomers = node.incomers('node').map(n => n.data('label')).join(', ') || 'None';
  const outgoers = node.outgoers('node').map(n => n.data('label')).join(', ') || 'None';
  
  tooltip.innerHTML = `
    <h4>${data.label}</h4>
    <p>${data.description || 'No description available'}</p>
    <div class="connections">
      <strong>← From:</strong> <span>${incomers}</span><br>
      <strong>→ To:</strong> <span>${outgoers}</span>
    </div>
  `;
  
  // Position tooltip
  let left = pos.x + 20;
  let top = pos.y - 20;
  
  // Keep tooltip in bounds
  if (left + 300 > containerRect.width) {
    left = pos.x - 320;
  }
  if (top + 150 > containerRect.height) {
    top = containerRect.height - 160;
  }
  if (top < 10) top = 10;
  
  tooltip.style.left = `${left}px`;
  tooltip.style.top = `${top}px`;
  tooltip.classList.add('visible');
}

/**
 * Hide tooltip
 */
function hideTooltip(tooltip) {
  tooltip.classList.remove('visible');
}

/**
 * Fit diagram to container
 */
function fitDiagram(cy) {
  cy.fit(50);
}

/**
 * Reset diagram to initial layout
 */
function resetDiagram(cy, layout) {
  cy.layout(layout).run();
  setTimeout(() => cy.fit(50), 100);
}

/**
 * Export diagram as PNG
 */
function exportDiagram(cy, filename = 'diagram') {
  const png = cy.png({
    output: 'blob',
    bg: COLORS.bgSecondary,
    scale: 2
  });
  
  const link = document.createElement('a');
  link.href = URL.createObjectURL(png);
  link.download = `${filename}.png`;
  link.click();
}

/**
 * Animate diagram build - nodes appear then edges connect
 * @param {Object} cy - Cytoscape instance
 * @param {Object} options - Animation options
 */
function animateDiagramBuild(cy, options = {}) {
  const {
    nodeDelay = 80,
    edgeDelay = 50,
    nodeDuration = 400,
    edgeDuration = 300,
    containerId = null,
    onComplete = () => {}
  } = options;

  const nodes = cy.nodes();
  const edges = cy.edges();
  
  // Get topological order for nodes (dependencies first)
  const nodeOrder = getTopologicalOrder(cy);
  
  // Add visual feedback class
  const canvas = cy.container();
  const container = canvas?.closest('.diagram-container');
  const replayBtn = container?.querySelector('.replay-btn');
  
  canvas?.classList.add('animating');
  replayBtn?.classList.add('playing');
  
  // Initially hide all elements
  nodes.style({ 'opacity': 0, 'transform': 'scale(0.5)' });
  edges.style({ 'opacity': 0, 'line-style': 'solid' });
  
  // Animate nodes appearing in order
  nodeOrder.forEach((node, index) => {
    setTimeout(() => {
      anime({
        targets: {},
        opacity: [0, 1],
        scale: [0.5, 1],
        duration: nodeDuration,
        easing: 'easeOutBack',
        update: (anim) => {
          const progress = anim.progress / 100;
          node.style({
            'opacity': progress,
            'transform': `scale(${0.5 + (0.5 * progress)})`
          });
        },
        complete: () => {
          node.style({ 'transform': 'scale(1)' });
        }
      });
    }, index * nodeDelay);
  });
  
  // After nodes, animate edges with a "draw" effect
  const edgeStartDelay = nodeOrder.length * nodeDelay + nodeDuration;
  
  edges.forEach((edge, index) => {
    setTimeout(() => {
      // Flash the connected nodes briefly
      const sourceNode = edge.source();
      const targetNode = edge.target();
      
      sourceNode.addClass('highlighted');
      targetNode.addClass('highlighted');
      
      anime({
        targets: {},
        opacity: [0, 0.7],
        duration: edgeDuration,
        easing: 'easeOutQuad',
        update: (anim) => {
          const progress = anim.progress / 100;
          edge.style({ 'opacity': progress * 0.7 });
        },
        complete: () => {
          // Remove highlight after brief delay
          setTimeout(() => {
            sourceNode.removeClass('highlighted');
            targetNode.removeClass('highlighted');
          }, 150);
        }
      });
    }, edgeStartDelay + (index * edgeDelay));
  });
  
  // Call onComplete when all animations finish
  const totalDuration = edgeStartDelay + (edges.length * edgeDelay) + edgeDuration + 200;
  setTimeout(() => {
    canvas?.classList.remove('animating');
    replayBtn?.classList.remove('playing');
    onComplete();
  }, totalDuration);
  
  return totalDuration;
}

/**
 * Get nodes in topological order (root/independent nodes first)
 */
function getTopologicalOrder(cy) {
  const nodes = cy.nodes();
  const ordered = [];
  const visited = new Set();
  
  // Find root nodes (no incoming edges)
  const roots = nodes.filter(node => node.incomers('edge').length === 0);
  
  // BFS from roots
  const queue = [...roots];
  roots.forEach(node => visited.add(node.id()));
  
  while (queue.length > 0) {
    const node = queue.shift();
    ordered.push(node);
    
    node.outgoers('node').forEach(neighbor => {
      if (!visited.has(neighbor.id())) {
        visited.add(neighbor.id());
        queue.push(neighbor);
      }
    });
  }
  
  // Add any remaining nodes (cycles or disconnected)
  nodes.forEach(node => {
    if (!visited.has(node.id())) {
      ordered.push(node);
    }
  });
  
  return ordered;
}

/**
 * Setup scroll-triggered diagram animation
 */
function setupDiagramScrollAnimation(cy, containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  
  const diagramContainer = container.closest('.diagram-container');
  if (!diagramContainer) return;
  
  // Mark as not yet animated
  diagramAnimationState.set(containerId, {
    hasAnimated: false,
    isAnimating: false,
    cy: cy
  });
  
  // Initially hide elements
  cy.nodes().style({ 'opacity': 0 });
  cy.edges().style({ 'opacity': 0 });
  
  // Setup IntersectionObserver
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const state = diagramAnimationState.get(containerId);
        if (state && !state.hasAnimated && !state.isAnimating) {
          state.isAnimating = true;
          
          // Small delay to ensure layout is complete
          setTimeout(() => {
            animateDiagramBuild(cy, {
              onComplete: () => {
                state.hasAnimated = true;
                state.isAnimating = false;
              }
            });
          }, 200);
        }
      }
    });
  }, { threshold: 0.3 });
  
  observer.observe(diagramContainer);
}

/**
 * Replay diagram build animation
 */
function replayDiagramAnimation(containerId) {
  const state = diagramAnimationState.get(containerId);
  if (!state || state.isAnimating) return;
  
  state.isAnimating = true;
  
  animateDiagramBuild(state.cy, {
    onComplete: () => {
      state.isAnimating = false;
    }
  });
}

/**
 * Common layout configurations
 */
const LAYOUTS = {
  hierarchical: {
    name: 'dagre',
    rankDir: 'TB',
    nodeSep: 50,
    rankSep: 80,
    padding: 30
  },
  hierarchicalLR: {
    name: 'dagre',
    rankDir: 'LR',
    nodeSep: 50,
    rankSep: 100,
    padding: 30
  },
  circular: {
    name: 'circle',
    padding: 50,
    avoidOverlap: true
  },
  grid: {
    name: 'grid',
    padding: 30,
    avoidOverlap: true
  },
  concentric: {
    name: 'concentric',
    padding: 30,
    minNodeSpacing: 50,
    concentric: node => node.degree(),
    levelWidth: () => 2
  },
  force: {
    name: 'cose',
    padding: 50,
    nodeRepulsion: 8000,
    idealEdgeLength: 100,
    edgeElasticity: 100,
    nestingFactor: 1.2,
    gravity: 1,
    numIter: 1000,
    animate: true
  }
};

/**
 * Initialize page animations with Anime.js
 */
function initPageAnimations() {
  // Header fade in
  anime({
    targets: '.header',
    opacity: [0, 1],
    translateY: [-20, 0],
    duration: 600,
    easing: 'easeOutExpo'
  });

  // Hero section
  anime({
    targets: '.hero',
    opacity: [0, 1],
    translateY: [20, 0],
    duration: 800,
    delay: 200,
    easing: 'easeOutExpo'
  });

  // Page header
  anime({
    targets: '.page-header',
    opacity: [0, 1],
    translateY: [20, 0],
    duration: 800,
    delay: 200,
    easing: 'easeOutExpo'
  });

  // Cards stagger
  anime({
    targets: '.card',
    opacity: [0, 1],
    translateY: [30, 0],
    duration: 600,
    delay: anime.stagger(100, { start: 400 }),
    easing: 'easeOutExpo'
  });

  // Sections on scroll
  const sections = document.querySelectorAll('.section');
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting && !entry.target.classList.contains('animated')) {
        entry.target.classList.add('animated');
        anime({
          targets: entry.target,
          opacity: [0, 1],
          translateY: [30, 0],
          duration: 600,
          easing: 'easeOutExpo'
        });
      }
    });
  }, { threshold: 0.1 });

  sections.forEach(section => observer.observe(section));

  // Page nav
  anime({
    targets: '.page-nav',
    opacity: [0, 1],
    translateX: [20, 0],
    duration: 600,
    delay: 800,
    easing: 'easeOutExpo'
  });
}

/**
 * Setup back to top button
 */
function setupBackToTop() {
  const btn = document.querySelector('.back-to-top');
  if (!btn) return;

  window.addEventListener('scroll', () => {
    if (window.scrollY > 300) {
      btn.classList.add('visible');
    } else {
      btn.classList.remove('visible');
    }
  });

  btn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

/**
 * Setup diagram control buttons
 */
function setupDiagramControls(cy, diagramId, options = {}) {
  const { enableScrollAnimation = true } = options;
  
  const container = document.querySelector(`#${diagramId}`).closest('.diagram-container');
  if (!container) return;

  const controls = container.querySelector('.diagram-controls');
  if (!controls) return;

  // Add Replay button if it doesn't exist
  if (!controls.querySelector('[data-action="replay"]')) {
    const replayBtn = document.createElement('button');
    replayBtn.className = 'diagram-btn replay-btn';
    replayBtn.setAttribute('data-action', 'replay');
    replayBtn.innerHTML = '▶ Replay';
    replayBtn.title = 'Replay build animation';
    controls.insertBefore(replayBtn, controls.firstChild);
  }

  // Replay button
  const replayBtn = controls.querySelector('[data-action="replay"]');
  if (replayBtn) {
    replayBtn.addEventListener('click', () => {
      replayDiagramAnimation(diagramId);
    });
  }

  // Fit button
  const fitBtn = controls.querySelector('[data-action="fit"]');
  if (fitBtn) {
    fitBtn.addEventListener('click', () => fitDiagram(cy));
  }

  // Reset button
  const resetBtn = controls.querySelector('[data-action="reset"]');
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      const layout = cy.options().layout || LAYOUTS.hierarchical;
      resetDiagram(cy, layout);
    });
  }

  // Export button
  const exportBtn = controls.querySelector('[data-action="export"]');
  if (exportBtn) {
    exportBtn.addEventListener('click', () => {
      exportDiagram(cy, diagramId);
    });
  }

  // Layout buttons
  controls.querySelectorAll('[data-layout]').forEach(btn => {
    btn.addEventListener('click', () => {
      const layoutName = btn.dataset.layout;
      const layout = LAYOUTS[layoutName];
      if (layout) {
        cy.layout(layout).run();
        setTimeout(() => cy.fit(50), 100);
      }
    });
  });

  // Setup scroll animation if enabled
  if (enableScrollAnimation) {
    setupDiagramScrollAnimation(cy, diagramId);
  }
}

// Export for use in pages
window.DiagramUtils = {
  COLORS,
  NODE_COLORS,
  LAYOUTS,
  createDiagram,
  fitDiagram,
  resetDiagram,
  exportDiagram,
  setupDiagramControls,
  initPageAnimations,
  setupBackToTop,
  getBaseStylesheet,
  animateDiagramBuild,
  replayDiagramAnimation,
  setupDiagramScrollAnimation
};

/**
 * Fix navbar links to point to the correct course dashboard
 * Auto-runs on page load for lesson pages
 */
(function fixNavbarLinks() {
  // Get course ID from body data attribute
  const body = document.body;
  const courseId = body?.dataset?.course;
  
  if (!courseId) return;
  
  const courseDashboardUrl = `../../dashboard/course.html?id=${courseId}`;
  
  // Course display names
  const courseNames = {
    'endless-opportunities': 'Endless Opportunities',
    'apprentice': 'Apprentice',
    'undergrad': 'Undergrad',
    'junior': 'Junior',
    'senior': 'Senior'
  };
  
  const courseName = courseNames[courseId] || courseId;
  
  // Fix nav-links
  document.querySelectorAll('.nav-links a').forEach(link => {
    const href = link.getAttribute('href');
    if (href && (
      href.includes('../index.html') ||
      href.includes('../../course/') ||
      href.match(/^\.\.\/?$/)
    )) {
      link.href = courseDashboardUrl;
      if (link.textContent.includes('←') || 
          link.textContent.toLowerCase().includes('course') ||
          link.textContent.toLowerCase().includes('apprentice') ||
          link.textContent.toLowerCase().includes('endless')) {
        link.textContent = `← ${courseName}`;
      }
    }
  });
  
  // Fix breadcrumb links
  document.querySelectorAll('.breadcrumb a').forEach(link => {
    const href = link.getAttribute('href');
    if (href && (
      href.includes('../index.html') ||
      href.includes('../../course/')
    )) {
      link.href = courseDashboardUrl;
      link.textContent = courseName;
    }
  });
})();
