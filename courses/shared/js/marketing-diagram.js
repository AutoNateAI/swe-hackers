/**
 * MarketingDiagram - Interactive animated diagrams for marketing pages
 * 
 * A lightweight, visually engaging diagram component for showcasing
 * the AutoNateAI platform on landing and marketing pages.
 * 
 * Features:
 *   - Auto-play animation when scrolled into view
 *   - Interactive hover states with tooltips
 *   - Smooth node/edge reveal animations
 *   - Click to explore nodes
 *   - Responsive design
 * 
 * Dependencies:
 *   - Anime.js
 */

class PlatformDiagram {
  constructor(containerId, config = {}) {
    this.containerId = containerId;
    this.container = document.getElementById(containerId);
    
    if (!this.container) {
      console.error(`PlatformDiagram: Container '${containerId}' not found`);
      return;
    }
    
    this.config = {
      autoPlay: true,
      autoPlayDelay: 500,
      nodeAnimationDuration: 600,
      edgeAnimationDuration: 400,
      nodeStaggerDelay: 150,
      edgeStaggerDelay: 100,
      loopAnimation: false,
      loopDelay: 5000,
      theme: 'dark',
      ...config
    };
    
    this.nodes = [];
    this.edges = [];
    this.isAnimating = false;
    this.hasAnimated = false;
    this.activeNode = null;
    this.tooltip = null;
    
    this.init();
  }
  
  init() {
    this.container.classList.add('marketing-diagram');
    this.createTooltip();
    this.setupScrollObserver();
    this.setupInteractivity();
  }
  
  /**
   * Set the diagram data and render
   */
  setData(nodes, edges) {
    this.nodes = nodes;
    this.edges = edges;
    this.render();
    
    if (this.config.autoPlay && this.isInViewport()) {
      setTimeout(() => this.animate(), this.config.autoPlayDelay);
    }
  }
  
  /**
   * Render the diagram SVG
   */
  render() {
    // Calculate bounding box of all nodes so diagram scales to fit any screen
    const padding = 40;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    this.nodes.forEach(node => {
      const halfW = (node.width || 140) / 2;
      const halfH = (node.height || 60) / 2;
      minX = Math.min(minX, node.x - halfW);
      minY = Math.min(minY, node.y - halfH);
      maxX = Math.max(maxX, node.x + halfW);
      maxY = Math.max(maxY, node.y + halfH);
    });
    const vbX = minX - padding;
    const vbY = minY - padding;
    const vbW = (maxX - minX) + padding * 2;
    const vbH = (maxY - minY) + padding * 2;

    // Create SVG canvas
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', '100%');
    svg.setAttribute('height', '100%');
    svg.setAttribute('viewBox', `${vbX} ${vbY} ${vbW} ${vbH}`);
    svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    svg.classList.add('marketing-diagram-svg');
    
    // Define gradients and filters
    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    defs.innerHTML = `
      <linearGradient id="edge-gradient-${this.containerId}" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" style="stop-color:#7986cb;stop-opacity:0.6" />
        <stop offset="50%" style="stop-color:#4db6ac;stop-opacity:1" />
        <stop offset="100%" style="stop-color:#7986cb;stop-opacity:0.6" />
      </linearGradient>
      <filter id="glow-${this.containerId}" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
        <feMerge>
          <feMergeNode in="coloredBlur"/>
          <feMergeNode in="SourceGraphic"/>
        </feMerge>
      </filter>
      <filter id="node-shadow-${this.containerId}" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="4" stdDeviation="8" flood-color="rgba(0,0,0,0.4)"/>
      </filter>
      <marker id="arrowhead-${this.containerId}" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
        <polygon points="0 0, 10 3.5, 0 7" fill="#4db6ac" />
      </marker>
    `;
    svg.appendChild(defs);
    
    // Create groups for edges and nodes (edges behind nodes)
    const edgeGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    edgeGroup.classList.add('edges-group');
    svg.appendChild(edgeGroup);
    
    const nodeGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    nodeGroup.classList.add('nodes-group');
    svg.appendChild(nodeGroup);
    
    // Render edges
    this.edges.forEach((edge, index) => {
      const edgeEl = this.createEdge(edge, index);
      edgeGroup.appendChild(edgeEl);
    });
    
    // Render nodes
    this.nodes.forEach((node, index) => {
      const nodeEl = this.createNode(node, index);
      nodeGroup.appendChild(nodeEl);
    });
    
    // Clear and add SVG
    this.container.innerHTML = '';
    this.container.appendChild(svg);
    this.container.appendChild(this.tooltip);
  }
  
  /**
   * Create an SVG node element
   */
  createNode(node, index) {
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.classList.add('diagram-node');
    g.setAttribute('data-node-id', node.id);
    g.setAttribute('data-index', index);
    g.style.opacity = '0';
    g.style.transform = `translate(${node.x}px, ${node.y}px)`;
    
    const nodeWidth = node.width || 140;
    const nodeHeight = node.height || 60;
    
    // Node background
    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('x', node.x - nodeWidth / 2);
    rect.setAttribute('y', node.y - nodeHeight / 2);
    rect.setAttribute('width', nodeWidth);
    rect.setAttribute('height', nodeHeight);
    rect.setAttribute('rx', '12');
    rect.setAttribute('ry', '12');
    rect.setAttribute('fill', node.color || '#16162a');
    rect.setAttribute('stroke', node.borderColor || '#7986cb');
    rect.setAttribute('stroke-width', '2');
    rect.setAttribute('filter', `url(#node-shadow-${this.containerId})`);
    g.appendChild(rect);
    
    // Icon
    if (node.icon) {
      const iconText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      iconText.setAttribute('x', node.x - nodeWidth / 2 + 20);
      iconText.setAttribute('y', node.y + 5);
      iconText.setAttribute('font-size', '20');
      iconText.setAttribute('text-anchor', 'middle');
      iconText.textContent = node.icon;
      g.appendChild(iconText);
    }
    
    // Label
    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.setAttribute('x', node.icon ? node.x + 10 : node.x);
    text.setAttribute('y', node.y + 5);
    text.setAttribute('text-anchor', 'middle');
    text.setAttribute('fill', '#e8e8f0');
    text.setAttribute('font-family', 'Inter, sans-serif');
    text.setAttribute('font-size', '13');
    text.setAttribute('font-weight', '500');
    text.textContent = node.label;
    g.appendChild(text);
    
    return g;
  }
  
  /**
   * Create an SVG edge element
   */
  createEdge(edge, index) {
    const sourceNode = this.nodes.find(n => n.id === edge.source);
    const targetNode = this.nodes.find(n => n.id === edge.target);
    
    if (!sourceNode || !targetNode) {
      console.warn(`PlatformDiagram: Edge references unknown node`, edge);
      return document.createElementNS('http://www.w3.org/2000/svg', 'g');
    }
    
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.classList.add('diagram-edge');
    g.setAttribute('data-edge-index', index);
    g.style.opacity = '0';
    
    // Calculate control points for curved edge
    const { path, labelPos } = this.calculateEdgePath(sourceNode, targetNode, edge);
    
    // Edge path
    const pathEl = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    pathEl.setAttribute('d', path);
    pathEl.setAttribute('fill', 'none');
    pathEl.setAttribute('stroke', edge.color || '#4db6ac');
    pathEl.setAttribute('stroke-width', edge.width || '2');
    pathEl.setAttribute('stroke-opacity', '0.7');
    pathEl.setAttribute('marker-end', `url(#arrowhead-${this.containerId})`);
    
    // Calculate path length for dash animation
    g.appendChild(pathEl);
    
    // Store path reference for animation
    pathEl.classList.add('edge-path');
    
    // Edge label (optional)
    if (edge.label) {
      const labelBg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      labelBg.setAttribute('x', labelPos.x - 30);
      labelBg.setAttribute('y', labelPos.y - 10);
      labelBg.setAttribute('width', '60');
      labelBg.setAttribute('height', '20');
      labelBg.setAttribute('rx', '4');
      labelBg.setAttribute('fill', '#0a0a0f');
      labelBg.setAttribute('fill-opacity', '0.8');
      g.appendChild(labelBg);
      
      const labelText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      labelText.setAttribute('x', labelPos.x);
      labelText.setAttribute('y', labelPos.y + 4);
      labelText.setAttribute('text-anchor', 'middle');
      labelText.setAttribute('fill', '#a0a0b8');
      labelText.setAttribute('font-family', 'Inter, sans-serif');
      labelText.setAttribute('font-size', '10');
      labelText.textContent = edge.label;
      g.appendChild(labelText);
    }
    
    return g;
  }
  
  /**
   * Calculate curved edge path between two nodes
   */
  calculateEdgePath(source, target, edge) {
    const sourceWidth = source.width || 140;
    const sourceHeight = source.height || 60;
    const targetWidth = target.width || 140;
    const targetHeight = target.height || 60;
    
    // Determine edge direction and connection points
    const dx = target.x - source.x;
    const dy = target.y - source.y;
    
    let startX, startY, endX, endY;
    
    // Determine which sides to connect
    if (Math.abs(dx) > Math.abs(dy)) {
      // Horizontal connection
      if (dx > 0) {
        startX = source.x + sourceWidth / 2;
        endX = target.x - targetWidth / 2;
      } else {
        startX = source.x - sourceWidth / 2;
        endX = target.x + targetWidth / 2;
      }
      startY = source.y;
      endY = target.y;
    } else {
      // Vertical connection
      startX = source.x;
      endX = target.x;
      if (dy > 0) {
        startY = source.y + sourceHeight / 2;
        endY = target.y - targetHeight / 2;
      } else {
        startY = source.y - sourceHeight / 2;
        endY = target.y + targetHeight / 2;
      }
    }
    
    // Calculate control points for smooth curve
    const midX = (startX + endX) / 2;
    const midY = (startY + endY) / 2;
    
    let path;
    const curveOffset = edge.curveOffset || 0;
    
    if (Math.abs(dx) > Math.abs(dy)) {
      // Horizontal curve
      path = `M ${startX} ${startY} C ${midX} ${startY + curveOffset}, ${midX} ${endY + curveOffset}, ${endX} ${endY}`;
    } else {
      // Vertical curve
      path = `M ${startX} ${startY} C ${startX + curveOffset} ${midY}, ${endX + curveOffset} ${midY}, ${endX} ${endY}`;
    }
    
    return {
      path,
      labelPos: { x: midX, y: midY }
    };
  }
  
  /**
   * Setup scroll observer for auto-play
   */
  setupScrollObserver() {
    if (!this.config.autoPlay) return;
    
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting && !this.hasAnimated && !this.isAnimating) {
          setTimeout(() => this.animate(), this.config.autoPlayDelay);
        }
      });
    }, { threshold: 0.3 });
    
    observer.observe(this.container);
  }
  
  /**
   * Check if container is in viewport
   */
  isInViewport() {
    const rect = this.container.getBoundingClientRect();
    return (
      rect.top >= 0 &&
      rect.left >= 0 &&
      rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
      rect.right <= (window.innerWidth || document.documentElement.clientWidth)
    );
  }
  
  /**
   * Animate the diagram build
   */
  animate() {
    if (this.isAnimating) return;
    
    this.isAnimating = true;
    this.container.classList.add('animating');
    
    const nodeElements = this.container.querySelectorAll('.diagram-node');
    const edgeElements = this.container.querySelectorAll('.diagram-edge');
    
    // Animate nodes first
    nodeElements.forEach((node, index) => {
      const delay = index * this.config.nodeStaggerDelay;
      
      setTimeout(() => {
        anime({
          targets: node,
          opacity: [0, 1],
          scale: [0.8, 1],
          duration: this.config.nodeAnimationDuration,
          easing: 'easeOutBack'
        });
        
        // Add glow effect to rect
        const rect = node.querySelector('rect');
        if (rect) {
          setTimeout(() => {
            rect.setAttribute('filter', `url(#glow-${this.containerId})`);
            setTimeout(() => {
              rect.setAttribute('filter', `url(#node-shadow-${this.containerId})`);
            }, 300);
          }, this.config.nodeAnimationDuration / 2);
        }
      }, delay);
    });
    
    // Then animate edges
    const edgeStartDelay = nodeElements.length * this.config.nodeStaggerDelay + this.config.nodeAnimationDuration;
    
    edgeElements.forEach((edge, index) => {
      const delay = edgeStartDelay + index * this.config.edgeStaggerDelay;
      
      setTimeout(() => {
        anime({
          targets: edge,
          opacity: [0, 1],
          duration: this.config.edgeAnimationDuration,
          easing: 'easeOutQuad'
        });
        
        // Animate the path drawing
        const path = edge.querySelector('.edge-path');
        if (path) {
          const length = path.getTotalLength();
          path.style.strokeDasharray = length;
          path.style.strokeDashoffset = length;
          
          anime({
            targets: path,
            strokeDashoffset: [length, 0],
            duration: this.config.edgeAnimationDuration * 1.5,
            easing: 'easeInOutQuad'
          });
        }
      }, delay);
    });
    
    // Complete animation
    const totalDuration = edgeStartDelay + edgeElements.length * this.config.edgeStaggerDelay + this.config.edgeAnimationDuration * 2;
    
    setTimeout(() => {
      this.isAnimating = false;
      this.hasAnimated = true;
      this.container.classList.remove('animating');
      
      // Start continuous animations
      this.startIdleAnimations();
      
      // Loop if configured
      if (this.config.loopAnimation) {
        setTimeout(() => this.replay(), this.config.loopDelay);
      }
    }, totalDuration);
  }
  
  /**
   * Start idle animations (subtle movements)
   */
  startIdleAnimations() {
    const nodes = this.container.querySelectorAll('.diagram-node');
    
    nodes.forEach((node, index) => {
      // Subtle floating animation
      anime({
        targets: node,
        translateY: [0, -3, 0],
        duration: 3000 + index * 200,
        easing: 'easeInOutSine',
        loop: true,
        delay: index * 150
      });
    });
  }
  
  /**
   * Replay the animation
   */
  replay() {
    this.hasAnimated = false;
    
    // Reset all elements
    const nodeElements = this.container.querySelectorAll('.diagram-node');
    const edgeElements = this.container.querySelectorAll('.diagram-edge');
    
    nodeElements.forEach(node => {
      node.style.opacity = '0';
    });
    
    edgeElements.forEach(edge => {
      edge.style.opacity = '0';
    });
    
    // Restart animation
    setTimeout(() => this.animate(), 100);
  }
  
  /**
   * Create tooltip element
   */
  createTooltip() {
    this.tooltip = document.createElement('div');
    this.tooltip.className = 'diagram-tooltip';
    this.tooltip.innerHTML = `
      <div class="tooltip-icon"></div>
      <div class="tooltip-content">
        <h4 class="tooltip-title"></h4>
        <p class="tooltip-description"></p>
      </div>
    `;
  }
  
  /**
   * Setup hover and click interactivity
   */
  setupInteractivity() {
    this.container.addEventListener('mouseover', (e) => {
      const node = e.target.closest('.diagram-node');
      if (node) {
        this.showTooltip(node);
        this.highlightNode(node);
      }
    });
    
    this.container.addEventListener('mouseout', (e) => {
      const node = e.target.closest('.diagram-node');
      if (node) {
        this.hideTooltip();
        this.unhighlightNode(node);
      }
    });
    
    this.container.addEventListener('click', (e) => {
      const node = e.target.closest('.diagram-node');
      if (node) {
        this.selectNode(node);
      }
    });
  }
  
  /**
   * Show tooltip for a node
   */
  showTooltip(nodeEl) {
    const nodeId = nodeEl.getAttribute('data-node-id');
    const nodeData = this.nodes.find(n => n.id === nodeId);
    
    if (!nodeData) return;
    
    const icon = this.tooltip.querySelector('.tooltip-icon');
    const title = this.tooltip.querySelector('.tooltip-title');
    const description = this.tooltip.querySelector('.tooltip-description');
    
    icon.textContent = nodeData.icon || '';
    title.textContent = nodeData.label;
    description.textContent = nodeData.description || '';
    
    // Position tooltip
    const rect = nodeEl.getBoundingClientRect();
    const containerRect = this.container.getBoundingClientRect();
    
    let left = rect.left - containerRect.left + rect.width / 2;
    let top = rect.top - containerRect.top - 10;
    
    // Keep tooltip in bounds
    if (left + 150 > containerRect.width) {
      left = containerRect.width - 160;
    }
    if (left < 10) {
      left = 10;
    }
    
    this.tooltip.style.left = `${left}px`;
    this.tooltip.style.top = `${top}px`;
    this.tooltip.classList.add('visible');
  }
  
  /**
   * Hide tooltip
   */
  hideTooltip() {
    this.tooltip.classList.remove('visible');
  }
  
  /**
   * Highlight a node on hover
   */
  highlightNode(nodeEl) {
    const rect = nodeEl.querySelector('rect');
    if (rect) {
      rect.setAttribute('stroke-width', '3');
      rect.setAttribute('filter', `url(#glow-${this.containerId})`);
    }
    nodeEl.style.cursor = 'pointer';
  }
  
  /**
   * Remove highlight from node
   */
  unhighlightNode(nodeEl) {
    if (nodeEl === this.activeNode) return;
    
    const rect = nodeEl.querySelector('rect');
    if (rect) {
      rect.setAttribute('stroke-width', '2');
      rect.setAttribute('filter', `url(#node-shadow-${this.containerId})`);
    }
  }
  
  /**
   * Select a node (click)
   */
  selectNode(nodeEl) {
    // Deselect previous
    if (this.activeNode) {
      this.activeNode.classList.remove('selected');
      this.unhighlightNode(this.activeNode);
    }
    
    // Select new
    this.activeNode = nodeEl;
    nodeEl.classList.add('selected');
    this.highlightNode(nodeEl);
    
    // Dispatch custom event
    const nodeId = nodeEl.getAttribute('data-node-id');
    const nodeData = this.nodes.find(n => n.id === nodeId);
    
    this.container.dispatchEvent(new CustomEvent('nodeselect', {
      detail: { node: nodeData }
    }));
  }
  
  /**
   * Destroy the diagram
   */
  destroy() {
    anime.remove(this.container.querySelectorAll('.diagram-node'));
    this.container.innerHTML = '';
  }
}

// Platform Flow Diagram data for landing page
const PLATFORM_FLOW_DATA = {
  nodes: [
    { 
      id: 'landing', 
      label: 'Landing Page', 
      icon: '🏠', 
      x: 400, 
      y: 50,
      description: 'Discover the AutoNateAI platform',
      color: '#1a1a2e',
      borderColor: '#7986cb'
    },
    { 
      id: 'signup', 
      label: 'Create Account', 
      icon: '📝', 
      x: 250, 
      y: 140,
      description: 'Quick signup with Google or email',
      color: '#1a1a2e',
      borderColor: '#ffd54f'
    },
    { 
      id: 'courses', 
      label: 'Browse Courses', 
      icon: '📚', 
      x: 550, 
      y: 140,
      description: 'Explore learning paths for all levels',
      color: '#1a1a2e',
      borderColor: '#7986cb'
    },
    { 
      id: 'dashboard', 
      label: 'Your Dashboard', 
      icon: '📊', 
      x: 250, 
      y: 240,
      description: 'Track progress and view analytics',
      color: '#16162a',
      borderColor: '#4db6ac'
    },
    { 
      id: 'lessons', 
      label: 'Interactive Lessons', 
      icon: '🎓', 
      x: 550, 
      y: 240,
      description: 'Learn with animations and activities',
      color: '#16162a',
      borderColor: '#4db6ac'
    },
    { 
      id: 'activities', 
      label: 'Quizzes & Activities', 
      icon: '⚡', 
      x: 400, 
      y: 330,
      description: 'Test your knowledge interactively',
      color: '#16162a',
      borderColor: '#66bb6a'
    },
    { 
      id: 'community', 
      label: 'Join Community', 
      icon: '💬', 
      x: 200, 
      y: 380,
      description: 'Connect on Discord with peers',
      color: '#1a1a2e',
      borderColor: '#ab47bc'
    },
    { 
      id: 'challenges', 
      label: 'Daily Challenges', 
      icon: '🎯', 
      x: 600, 
      y: 380,
      description: 'Compete and build your streak',
      color: '#1a1a2e',
      borderColor: '#ef5350'
    }
  ],
  edges: [
    { source: 'landing', target: 'signup', label: '' },
    { source: 'landing', target: 'courses', label: '' },
    { source: 'signup', target: 'dashboard', label: '' },
    { source: 'courses', target: 'lessons', label: '' },
    { source: 'dashboard', target: 'lessons', label: '', curveOffset: 20 },
    { source: 'lessons', target: 'activities', label: '' },
    { source: 'dashboard', target: 'activities', label: '', curveOffset: -20 },
    { source: 'activities', target: 'community', label: '' },
    { source: 'activities', target: 'challenges', label: '' }
  ]
};

// Learning Journey Diagram data
const LEARNING_JOURNEY_DATA = {
  nodes: [
    { 
      id: 'beginner', 
      label: 'Apprentice', 
      icon: '🌱', 
      x: 150, 
      y: 200,
      width: 120,
      description: 'Start your journey from zero',
      color: '#2a1a3a',
      borderColor: '#ab47bc'
    },
    { 
      id: 'junior', 
      label: 'Junior', 
      icon: '🚀', 
      x: 400, 
      y: 120,
      width: 120,
      description: 'Accelerate to professional level',
      color: '#2a2a1a',
      borderColor: '#ffd54f'
    },
    { 
      id: 'senior', 
      label: 'Senior', 
      icon: '⭐', 
      x: 650, 
      y: 200,
      width: 120,
      description: 'Multiply your impact',
      color: '#1a2a2a',
      borderColor: '#4db6ac'
    },
    { 
      id: 'systems', 
      label: 'Systems Thinking', 
      icon: '🧠', 
      x: 280, 
      y: 280,
      width: 140,
      description: 'See the big picture',
      color: '#1a1a2e',
      borderColor: '#7986cb'
    },
    { 
      id: 'ai', 
      label: 'AI Workflows', 
      icon: '🤖', 
      x: 520, 
      y: 280,
      width: 140,
      description: 'Master AI-augmented development',
      color: '#1a1a2e',
      borderColor: '#66bb6a'
    }
  ],
  edges: [
    { source: 'beginner', target: 'junior', label: '' },
    { source: 'junior', target: 'senior', label: '' },
    { source: 'beginner', target: 'systems', label: '' },
    { source: 'junior', target: 'systems', label: '', curveOffset: -15 },
    { source: 'junior', target: 'ai', label: '', curveOffset: 15 },
    { source: 'senior', target: 'ai', label: '' },
    { source: 'systems', target: 'ai', label: '' }
  ]
};

// Export for use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { PlatformDiagram, PLATFORM_FLOW_DATA, LEARNING_JOURNEY_DATA };
} else if (typeof window !== 'undefined') {
  window.PlatformDiagram = PlatformDiagram;
  window.PLATFORM_FLOW_DATA = PLATFORM_FLOW_DATA;
  window.LEARNING_JOURNEY_DATA = LEARNING_JOURNEY_DATA;
}
