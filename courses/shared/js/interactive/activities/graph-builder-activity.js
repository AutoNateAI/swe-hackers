/**
 * GraphBuilderActivity - Create diagrams from scratch with nodes and edges
 * 
 * Extends BaseActivity to provide a creative graph building experience.
 * Students add nodes from a toolbox and connect them to build diagrams.
 * Uses Cytoscape.js for the interactive canvas.
 * 
 * Usage:
 *   const builder = new GraphBuilderActivity('container-id', {
 *     id: 'build-auth-flow',
 *     type: 'graph-builder',
 *     instruction: 'Build a diagram showing how user authentication works',
 *     nodeTypes: [
 *       { type: 'user', label: '👤 User', color: '#ef5350' },
 *       { type: 'server', label: '📡 Server', color: '#7986cb' }
 *     ],
 *     validation: {
 *       requiredNodes: ['user', 'server'],
 *       requiredEdges: [{ from: 'user', to: 'server' }],
 *       minNodes: 2,
 *       maxNodes: 8
 *     },
 *     points: 50
 *   });
 *   builder.init();
 * 
 * Dependencies:
 *   - Cytoscape.js (https://cdnjs.cloudflare.com/ajax/libs/cytoscape/3.28.1/cytoscape.min.js)
 */

class GraphBuilderActivity extends BaseActivity {
  constructor(containerId, activityData, options = {}) {
    super(containerId, activityData, options);
    
    // Graph builder state
    this.cy = null;
    this.nodeCounter = 0;
    this.selectedNode = null;
    this.mode = 'add'; // 'add' | 'connect' | 'delete'
    this.pendingNodeType = null;
    this.hintIndex = 0;
    
    // Configuration
    this.nodeTypes = activityData.nodeTypes || [];
    this.validation = activityData.validation || {};
    this.hints = activityData.hints || [];
  }
  
  /**
   * Render the graph builder UI
   */
  render() {
    const nodeTypesHtml = this.nodeTypes.map(nt => `
      <button class="node-type-btn" data-type="${nt.type}" style="--node-color: ${nt.color};">
        ${nt.label}
      </button>
    `).join('');
    
    const checklistHtml = this.validation.requiredNodes?.map(type => {
      const nodeType = this.nodeTypes.find(n => n.type === type);
      return `
        <div class="checklist-item" data-req="${type}">
          <span class="check">○</span> ${nodeType?.label || type}
        </div>
      `;
    }).join('') || '';
    
    this.container.innerHTML = `
      <div class="graph-builder-activity">
        <div class="activity-instruction">${this.activityData.instruction}</div>
        
        <div class="builder-toolbox">
          <div class="toolbox-section">
            <div class="toolbox-label">Add Nodes:</div>
            <div class="toolbox-nodes">
              ${nodeTypesHtml}
            </div>
          </div>
          
          <div class="toolbox-section">
            <div class="toolbox-label">Tools:</div>
            <div class="toolbox-tools">
              <button class="tool-btn active" data-tool="add" title="Add nodes (click type then canvas)">➕</button>
              <button class="tool-btn" data-tool="connect" title="Connect nodes (click two nodes)">🔗</button>
              <button class="tool-btn" data-tool="delete" title="Delete (click to remove)">🗑️</button>
            </div>
          </div>
        </div>
        
        <div class="activity-canvas" id="${this.containerId}-canvas"></div>
        
        <div class="activity-canvas-controls">
          <button class="activity-canvas-btn" data-action="clear">Clear All</button>
          <button class="activity-canvas-btn" data-action="fit">Fit View</button>
          ${this.hints.length > 0 ? `
            <button class="activity-canvas-btn" data-action="hint">💡 Hint</button>
          ` : ''}
        </div>
        
        ${checklistHtml ? `
          <div class="builder-checklist">
            <div class="checklist-label">Requirements:</div>
            <div class="checklist-items">
              ${checklistHtml}
            </div>
          </div>
        ` : ''}
        
        <button class="activity-submit-btn" disabled>Submit Diagram</button>
        <div class="activity-feedback"></div>
      </div>
    `;
    
    this.applyStyles();
  }
  
  /**
   * Initialize the activity (override to setup Cytoscape)
   */
  init() {
    this.render();
    this.initCytoscape();
    this.bindEvents();
    this.loadPreviousAttempt();
    return this;
  }
  
  /**
   * Initialize Cytoscape canvas
   */
  initCytoscape() {
    const container = document.getElementById(`${this.containerId}-canvas`);
    
    if (!container) {
      console.error('GraphBuilderActivity: Canvas container not found');
      return;
    }
    
    // Check if Cytoscape is loaded
    if (typeof cytoscape === 'undefined') {
      console.error('GraphBuilderActivity: Cytoscape.js is not loaded. Add the CDN script.');
      container.innerHTML = `
        <div class="cytoscape-error">
          ⚠️ Graph library not loaded. Please add Cytoscape.js.
        </div>
      `;
      return;
    }
    
    this.cy = cytoscape({
      container,
      elements: [],
      style: this.getCytoscapeStyles(),
      layout: { name: 'preset' },
      userZoomingEnabled: true,
      userPanningEnabled: true,
      boxSelectionEnabled: false,
      minZoom: 0.5,
      maxZoom: 2.5
    });
    
    // Node tap handler
    this.cy.on('tap', 'node', (e) => this.handleNodeTap(e));
    
    // Edge tap handler (for delete mode)
    this.cy.on('tap', 'edge', (e) => this.handleEdgeTap(e));
    
    // Canvas tap handler (for adding nodes)
    this.cy.on('tap', (e) => {
      if (e.target === this.cy && this.mode === 'add' && this.pendingNodeType) {
        this.addNode(this.pendingNodeType, e.position);
      }
    });
    
    // Clear selection on background click
    this.cy.on('tap', (e) => {
      if (e.target === this.cy && this.mode !== 'add') {
        this.clearSelection();
      }
    });
  }
  
  /**
   * Get Cytoscape styles
   */
  getCytoscapeStyles() {
    return [
      {
        selector: 'node',
        style: {
          'label': 'data(label)',
          'text-valign': 'center',
          'text-halign': 'center',
          'background-color': 'data(color)',
          'color': '#fff',
          'font-size': '11px',
          'width': 90,
          'height': 45,
          'shape': 'roundrectangle',
          'border-width': 2,
          'border-color': 'data(borderColor)',
          'text-wrap': 'wrap',
          'text-max-width': '80px',
          'cursor': 'pointer',
          'transition-property': 'border-color, border-width',
          'transition-duration': '0.2s'
        }
      },
      {
        selector: 'node.selected',
        style: {
          'border-width': 3,
          'border-color': '#ffd54f'
        }
      },
      {
        selector: 'node.delete-hover',
        style: {
          'border-color': '#ef5350',
          'border-width': 3
        }
      },
      {
        selector: 'edge',
        style: {
          'width': 2,
          'line-color': '#7986cb',
          'target-arrow-color': '#7986cb',
          'target-arrow-shape': 'triangle',
          'curve-style': 'bezier',
          'arrow-scale': 1.2
        }
      },
      {
        selector: 'edge.delete-hover',
        style: {
          'line-color': '#ef5350',
          'target-arrow-color': '#ef5350',
          'width': 3
        }
      }
    ];
  }
  
  /**
   * Apply component-specific styles
   */
  applyStyles() {
    if (document.getElementById('graph-builder-activity-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'graph-builder-activity-styles';
    style.textContent = `
      .graph-builder-activity {
        padding: 0.5rem;
      }
      
      .builder-toolbox {
        display: flex;
        flex-wrap: wrap;
        gap: 1.5rem;
        padding: 1rem;
        background: var(--bg-tertiary, rgba(30, 30, 50, 0.5));
        border-radius: 8px;
        margin-bottom: 1rem;
      }
      
      .toolbox-section {
        flex: 1;
        min-width: 150px;
      }
      
      .toolbox-label {
        font-size: 0.8rem;
        color: var(--text-muted, #8888a8);
        margin-bottom: 0.5rem;
      }
      
      .toolbox-nodes {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
      }
      
      .node-type-btn {
        background: var(--bg-card, #1a1a2e);
        border: 2px solid var(--node-color, var(--border-color, #333355));
        color: var(--text-primary, #e8e8f0);
        padding: 0.5rem 0.75rem;
        border-radius: 6px;
        cursor: pointer;
        transition: all 0.2s;
        font-size: 0.85rem;
      }
      
      .node-type-btn:hover {
        background: color-mix(in srgb, var(--node-color) 30%, transparent);
      }
      
      .node-type-btn.active {
        background: var(--node-color);
        color: white;
        box-shadow: 0 0 12px color-mix(in srgb, var(--node-color) 50%, transparent);
      }
      
      .toolbox-tools {
        display: flex;
        gap: 0.5rem;
      }
      
      .tool-btn {
        width: 40px;
        height: 40px;
        border-radius: 6px;
        background: var(--bg-card, #1a1a2e);
        border: 1px solid var(--border-color, #333355);
        cursor: pointer;
        font-size: 1.1rem;
        transition: all 0.2s;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      
      .tool-btn:hover {
        background: var(--bg-tertiary, rgba(30, 30, 50, 0.8));
      }
      
      .tool-btn.active {
        background: var(--accent-primary, #7986cb);
        border-color: var(--accent-primary, #7986cb);
      }
      
      .activity-canvas {
        width: 100%;
        height: 350px;
        background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
        border: 2px solid var(--border-color, #333355);
        border-radius: 8px;
        margin-bottom: 1rem;
        position: relative;
      }
      
      .activity-canvas-controls {
        display: flex;
        gap: 0.5rem;
        margin-bottom: 1rem;
        flex-wrap: wrap;
      }
      
      .activity-canvas-btn {
        background: var(--bg-card, #1a1a2e);
        border: 1px solid var(--border-color, #333355);
        color: var(--text-secondary, #b8b8c8);
        padding: 0.5rem 0.75rem;
        border-radius: 6px;
        cursor: pointer;
        font-size: 0.85rem;
        transition: all 0.2s;
      }
      
      .activity-canvas-btn:hover {
        background: var(--bg-tertiary, rgba(30, 30, 50, 0.8));
        color: var(--text-primary, #e8e8f0);
      }
      
      .builder-checklist {
        margin: 1rem 0;
        padding: 0.75rem 1rem;
        background: var(--bg-tertiary, rgba(30, 30, 50, 0.5));
        border-radius: 8px;
      }
      
      .checklist-label {
        font-size: 0.8rem;
        color: var(--text-muted, #8888a8);
        margin-bottom: 0.5rem;
      }
      
      .checklist-items {
        display: flex;
        flex-wrap: wrap;
        gap: 1rem;
      }
      
      .checklist-item {
        color: var(--text-muted, #8888a8);
        font-size: 0.85rem;
        transition: color 0.2s;
      }
      
      .checklist-item.complete {
        color: var(--accent-success, #4db6ac);
      }
      
      .checklist-item .check {
        margin-right: 0.25rem;
      }
      
      .cytoscape-error {
        display: flex;
        align-items: center;
        justify-content: center;
        height: 100%;
        color: var(--accent-warning, #ffa726);
        font-size: 0.9rem;
      }
      
      .hint-toast {
        position: fixed;
        bottom: 2rem;
        left: 50%;
        transform: translateX(-50%);
        background: var(--bg-card, #1a1a2e);
        border: 1px solid var(--accent-secondary, #4db6ac);
        padding: 0.75rem 1.25rem;
        border-radius: 8px;
        color: var(--text-primary, #e8e8f0);
        font-size: 0.9rem;
        z-index: 1000;
        box-shadow: 0 8px 32px rgba(0,0,0,0.3);
        animation: slideUp 0.3s ease-out;
      }
      
      @keyframes slideUp {
        from { opacity: 0; transform: translateX(-50%) translateY(20px); }
        to { opacity: 1; transform: translateX(-50%) translateY(0); }
      }
    `;
    document.head.appendChild(style);
  }
  
  /**
   * Bind event handlers
   */
  bindEvents() {
    super.bindEvents();
    
    // Node type buttons
    this.container.querySelectorAll('.node-type-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const type = btn.dataset.type;
        this.selectNodeType(type);
        this.setMode('add');
      });
    });
    
    // Tool buttons
    this.container.querySelectorAll('.tool-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.setMode(btn.dataset.tool);
      });
    });
    
    // Canvas control buttons
    this.container.querySelectorAll('.activity-canvas-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const action = btn.dataset.action;
        if (action === 'clear') this.clearAll();
        if (action === 'fit') this.fitView();
        if (action === 'hint') this.showHint();
      });
    });
    
    // Hover effects for delete mode
    if (this.cy) {
      this.cy.on('mouseover', 'node, edge', (e) => {
        if (this.mode === 'delete') {
          e.target.addClass('delete-hover');
        }
      });
      
      this.cy.on('mouseout', 'node, edge', (e) => {
        e.target.removeClass('delete-hover');
      });
    }
  }
  
  /**
   * Select a node type for adding
   */
  selectNodeType(type) {
    this.pendingNodeType = type;
    
    // Update button state
    this.container.querySelectorAll('.node-type-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.type === type);
    });
    
    this.start(); // Start activity on first interaction
  }
  
  /**
   * Set interaction mode
   */
  setMode(mode) {
    this.mode = mode;
    
    // Update tool button state
    this.container.querySelectorAll('.tool-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tool === mode);
    });
    
    // Clear node type selection if not in add mode
    if (mode !== 'add') {
      this.pendingNodeType = null;
      this.container.querySelectorAll('.node-type-btn').forEach(btn => {
        btn.classList.remove('active');
      });
    }
    
    // Clear selection when switching modes
    this.clearSelection();
    
    // Update cursor style
    const canvas = this.container.querySelector('.activity-canvas');
    if (canvas) {
      canvas.style.cursor = mode === 'delete' ? 'crosshair' : 'default';
    }
  }
  
  /**
   * Add a node to the canvas
   */
  addNode(type, position) {
    if (!this.cy) return;
    
    const nodeType = this.nodeTypes.find(t => t.type === type);
    if (!nodeType) return;
    
    // Check max nodes
    if (this.validation.maxNodes && this.cy.nodes().length >= this.validation.maxNodes) {
      this.showToast(`Maximum ${this.validation.maxNodes} nodes allowed`);
      return;
    }
    
    this.nodeCounter++;
    const id = `node-${this.nodeCounter}`;
    
    // Lighten the color for border
    const borderColor = this.lightenColor(nodeType.color, 30);
    
    this.cy.add({
      group: 'nodes',
      data: {
        id,
        label: nodeType.label,
        nodeType: type,
        color: nodeType.color,
        borderColor
      },
      position: position || { x: 200 + Math.random() * 100, y: 150 + Math.random() * 100 }
    });
    
    // Animate the node in
    if (typeof anime !== 'undefined') {
      const node = this.cy.getElementById(id);
      node.style({ 'opacity': 0 });
      anime({
        targets: { opacity: 0 },
        opacity: 1,
        duration: 200,
        easing: 'easeOutCubic',
        update: (anim) => {
          node.style({ 'opacity': anim.animations[0].currentValue });
        }
      });
    }
    
    this.updateChecklist();
    this.updateSubmitButton();
  }
  
  /**
   * Handle node tap based on current mode
   */
  handleNodeTap(e) {
    const node = e.target;
    
    if (this.mode === 'connect') {
      this.handleConnect(node);
    } else if (this.mode === 'delete') {
      node.remove();
      this.updateChecklist();
      this.updateSubmitButton();
    }
  }
  
  /**
   * Handle edge tap (delete mode)
   */
  handleEdgeTap(e) {
    if (this.mode === 'delete') {
      e.target.remove();
      this.updateChecklist();
      this.updateSubmitButton();
    }
  }
  
  /**
   * Handle connect mode - link two nodes
   */
  handleConnect(node) {
    if (!this.selectedNode) {
      this.selectedNode = node;
      node.addClass('selected');
    } else if (this.selectedNode.id() !== node.id()) {
      // Check if edge already exists
      const existingEdge = this.cy.edges().filter(e => 
        (e.source().id() === this.selectedNode.id() && e.target().id() === node.id()) ||
        (e.source().id() === node.id() && e.target().id() === this.selectedNode.id())
      );
      
      if (existingEdge.length === 0) {
        // Create edge
        this.cy.add({
          group: 'edges',
          data: {
            source: this.selectedNode.id(),
            target: node.id()
          }
        });
        
        this.updateChecklist();
        this.updateSubmitButton();
      }
      
      this.clearSelection();
    } else {
      // Clicked same node, deselect
      this.clearSelection();
    }
  }
  
  /**
   * Clear node selection
   */
  clearSelection() {
    if (this.selectedNode) {
      this.selectedNode.removeClass('selected');
      this.selectedNode = null;
    }
  }
  
  /**
   * Update the requirements checklist
   */
  updateChecklist() {
    if (!this.cy) return;
    
    const nodes = this.cy.nodes();
    const edges = this.cy.edges();
    
    // Update node checks
    this.validation.requiredNodes?.forEach(type => {
      const item = this.container.querySelector(`.checklist-item[data-req="${type}"]`);
      if (item) {
        const hasNode = nodes.some(n => n.data('nodeType') === type);
        item.querySelector('.check').textContent = hasNode ? '✓' : '○';
        item.classList.toggle('complete', hasNode);
      }
    });
  }
  
  /**
   * Clear all nodes and edges
   */
  clearAll() {
    if (!this.cy) return;
    
    this.cy.elements().remove();
    this.nodeCounter = 0;
    this.clearSelection();
    this.updateChecklist();
    this.updateSubmitButton();
  }
  
  /**
   * Fit view to content
   */
  fitView() {
    if (!this.cy) return;
    
    if (this.cy.nodes().length > 0) {
      this.cy.animate({
        fit: { padding: 40 },
        duration: 300,
        easing: 'ease-out-cubic'
      });
    } else {
      this.cy.reset();
    }
  }
  
  /**
   * Show a hint
   */
  showHint() {
    if (this.hints.length === 0) return;
    
    const hint = this.hints[this.hintIndex];
    this.hintIndex = (this.hintIndex + 1) % this.hints.length;
    
    this.showToast(`💡 ${hint}`);
  }
  
  /**
   * Show a toast message
   */
  showToast(message) {
    // Remove existing toast
    const existingToast = document.querySelector('.hint-toast');
    if (existingToast) existingToast.remove();
    
    const toast = document.createElement('div');
    toast.className = 'hint-toast';
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
      toast.remove();
    }, 3000);
  }
  
  /**
   * Lighten a hex color
   */
  lightenColor(hex, percent) {
    const num = parseInt(hex.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = Math.min(255, (num >> 16) + amt);
    const G = Math.min(255, ((num >> 8) & 0x00FF) + amt);
    const B = Math.min(255, (num & 0x0000FF) + amt);
    return `rgb(${R}, ${G}, ${B})`;
  }
  
  /**
   * Check if graph meets minimum requirements for submission
   */
  validate() {
    if (!this.cy) return false;
    
    const nodeCount = this.cy.nodes().length;
    const edgeCount = this.cy.edges().length;
    const minNodes = this.validation.minNodes || 2;
    
    return nodeCount >= minNodes && edgeCount > 0;
  }
  
  /**
   * Get validation message
   */
  getValidationMessage() {
    if (!this.cy) return 'Graph not initialized';
    
    const nodeCount = this.cy.nodes().length;
    const edgeCount = this.cy.edges().length;
    const minNodes = this.validation.minNodes || 2;
    
    if (nodeCount < minNodes) {
      return `Add at least ${minNodes - nodeCount} more node${minNodes - nodeCount !== 1 ? 's' : ''}.`;
    }
    if (edgeCount === 0) {
      return 'Connect your nodes with at least one edge.';
    }
    return 'Complete the diagram to submit.';
  }
  
  /**
   * Get result with validation scoring
   */
  getResult() {
    if (!this.cy) {
      return { correct: false, score: 0, response: {}, message: 'Graph not initialized' };
    }
    
    const nodes = this.cy.nodes().map(n => n.data());
    const edges = this.cy.edges().map(e => ({
      from: e.source().data('nodeType'),
      to: e.target().data('nodeType'),
      fromId: e.source().id(),
      toId: e.target().id()
    }));
    
    // Check required nodes
    const requiredNodes = this.validation.requiredNodes || [];
    let requiredNodesMet = 0;
    requiredNodes.forEach(type => {
      if (nodes.some(n => n.nodeType === type)) {
        requiredNodesMet++;
      }
    });
    
    // Check required edges
    const requiredEdges = this.validation.requiredEdges || [];
    let requiredEdgesMet = 0;
    requiredEdges.forEach(req => {
      // Find if the required edge exists (by node types)
      const hasEdge = edges.some(e => e.from === req.from && e.to === req.to);
      if (hasEdge) requiredEdgesMet++;
    });
    
    // Calculate score
    const reqNodesTotal = requiredNodes.length || 1;
    const reqEdgesTotal = requiredEdges.length || 1;
    
    const nodeScore = requiredNodesMet / reqNodesTotal;
    const edgeScore = requiredEdgesMet / reqEdgesTotal;
    
    // Weight edges more heavily (they show understanding of flow)
    const score = (nodeScore * 0.4) + (edgeScore * 0.6);
    
    // Build missing elements message
    const missingNodes = requiredNodes.length - requiredNodesMet;
    const missingEdges = requiredEdges.length - requiredEdgesMet;
    
    let message;
    if (score >= 0.9) {
      message = 'Excellent diagram! All requirements met.';
    } else if (score >= 0.7) {
      message = 'Good work!';
      if (missingNodes > 0) message += ` Missing ${missingNodes} required node(s).`;
      if (missingEdges > 0) message += ` Missing ${missingEdges} connection(s).`;
    } else {
      message = `Keep going!`;
      if (missingNodes > 0) message += ` Add ${missingNodes} more required node(s).`;
      if (missingEdges > 0) message += ` Make ${missingEdges} more required connection(s).`;
    }
    
    return {
      correct: score >= 0.8,
      score,
      response: {
        nodes: nodes.map(n => ({ id: n.id, type: n.nodeType, label: n.label })),
        edges,
        requiredNodesMet,
        requiredEdgesMet,
        totalNodes: nodes.length,
        totalEdges: edges.length
      },
      message
    };
  }
  
  /**
   * Show feedback with visual highlighting
   */
  showFeedback(result) {
    // Highlight correct/missing elements on the graph
    if (this.cy && result.score < 1.0) {
      // Could add visual indicators here for missing connections
    }
    
    // Call parent feedback
    super.showFeedback(result);
    
    // Disable further editing after submission
    if (result.correct) {
      this.cy?.nodes().ungrabify();
      this.setMode('add'); // Reset mode
      this.container.querySelectorAll('.node-type-btn, .tool-btn, .activity-canvas-btn').forEach(btn => {
        btn.disabled = true;
        btn.style.opacity = '0.5';
        btn.style.pointerEvents = 'none';
      });
    }
  }
  
  /**
   * Reset to initial state
   */
  reset() {
    this.clearAll();
    this.hintIndex = 0;
    this.setMode('add');
    
    // Re-enable controls
    this.container.querySelectorAll('.node-type-btn, .tool-btn, .activity-canvas-btn').forEach(btn => {
      btn.disabled = false;
      btn.style.opacity = '1';
      btn.style.pointerEvents = 'auto';
    });
    
    if (this.cy) {
      this.cy.nodes().grabify();
    }
    
    super.reset();
  }
  
  /**
   * Cleanup when destroyed
   */
  destroy() {
    if (this.cy) {
      this.cy.destroy();
      this.cy = null;
    }
    super.destroy();
  }
}

// Register with ActivityRegistry
if (typeof ActivityRegistry !== 'undefined') {
  ActivityRegistry.register('graph-builder', GraphBuilderActivity);
}

// Export for use as module or global
if (typeof module !== 'undefined' && module.exports) {
  module.exports = GraphBuilderActivity;
} else if (typeof window !== 'undefined') {
  window.GraphBuilderActivity = GraphBuilderActivity;
}
