/**
 * TimelineGraph Component
 * 
 * An interactive, zoomable timeline showing learning milestones as nodes.
 * Supports zoom, pan, and node selection for details.
 * 
 * @example
 * const timeline = new TimelineGraph(container, {
 *   milestones: [
 *     { title: 'Completed Ch1', timestamp: '2026-01-10', type: 'lesson', course: 'apprentice' },
 *     { title: 'Completed Ch2', timestamp: '2026-01-12', type: 'lesson', course: 'apprentice' }
 *   ],
 *   height: 300
 * });
 * timeline.render();
 */

class TimelineGraph {
  constructor(container, options = {}) {
    this.container = typeof container === 'string' 
      ? document.querySelector(container) 
      : container;
    
    this.options = {
      milestones: [],
      height: 300,
      nodeRadius: 12,
      lineColor: 'var(--accent-primary, #6366f1)',
      nodeColor: 'var(--accent-primary, #6366f1)',
      selectedColor: 'var(--accent-secondary, #22d3ee)',
      backgroundColor: 'var(--surface-elevated, #1e1e2e)',
      textColor: 'var(--text-primary, #e2e8f0)',
      mutedColor: 'var(--text-muted, #64748b)',
      animate: true,
      ...options
    };
    
    this.svg = null;
    this.selectedNode = null;
    this.zoom = 1;
    this.panX = 0;
    this.isDragging = false;
    this.dragStartX = 0;
    this.dragStartPanX = 0;
    
    // Process milestones
    this.processedMilestones = this._processMilestones();
  }
  
  _processMilestones() {
    const milestones = this.options.milestones
      .map(m => ({
        ...m,
        date: new Date(m.timestamp),
        displayDate: this._formatDate(new Date(m.timestamp)),
        displayTime: this._formatTime(new Date(m.timestamp))
      }))
      .filter(m => !isNaN(m.date.getTime()))
      .sort((a, b) => a.date - b.date);
    
    return milestones;
  }
  
  _formatDate(date) {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
  
  _formatTime(date) {
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  }
  
  render() {
    if (!this.container) {
      console.error('TimelineGraph: No container provided');
      return this;
    }
    
    this.container.innerHTML = '';
    
    if (this.processedMilestones.length === 0) {
      this._renderEmptyState();
      return this;
    }
    
    this._createTimeline();
    this._setupEventListeners();
    
    if (this.options.animate && typeof anime !== 'undefined') {
      this._animate();
    }
    
    return this;
  }
  
  _renderEmptyState() {
    this.container.innerHTML = `
      <div class="timeline-graph-empty" style="
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: ${this.options.height}px;
        color: ${this.options.mutedColor};
        text-align: center;
        padding: 2rem;
      ">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
        </svg>
        <p style="margin-top: 1rem; font-size: 0.9rem;">No activity yet</p>
        <p style="font-size: 0.8rem; opacity: 0.7;">Complete lessons to see your progress timeline</p>
      </div>
    `;
  }
  
  _createTimeline() {
    const wrapper = document.createElement('div');
    wrapper.className = 'timeline-graph-wrapper';
    wrapper.style.cssText = `
      position: relative;
      height: ${this.options.height}px;
      background: ${this.options.backgroundColor};
      border-radius: 12px;
      overflow: hidden;
      cursor: grab;
    `;
    
    // Create SVG
    const width = this.container.offsetWidth || 600;
    const height = this.options.height;
    
    this.svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    this.svg.setAttribute('width', '100%');
    this.svg.setAttribute('height', height);
    this.svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    this.svg.style.cssText = 'display: block;';
    
    // Calculate timeline dimensions
    const padding = { top: 60, right: 40, bottom: 80, left: 40 };
    const timelineY = height / 2;
    const nodeSpacing = Math.max(100, (width - padding.left - padding.right) / Math.max(1, this.processedMilestones.length - 1));
    
    // Create group for zoom/pan
    this.mainGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    this.mainGroup.setAttribute('class', 'timeline-main');
    
    // Draw timeline line
    const lineLength = (this.processedMilestones.length - 1) * nodeSpacing + padding.left * 2;
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', padding.left);
    line.setAttribute('y1', timelineY);
    line.setAttribute('x2', Math.max(width - padding.right, padding.left + lineLength));
    line.setAttribute('y2', timelineY);
    line.setAttribute('stroke', this.options.lineColor);
    line.setAttribute('stroke-width', '3');
    line.setAttribute('stroke-linecap', 'round');
    line.setAttribute('opacity', '0.3');
    this.mainGroup.appendChild(line);
    
    // Draw nodes
    this.processedMilestones.forEach((milestone, index) => {
      const x = padding.left + (index * nodeSpacing);
      const y = timelineY;
      
      this._createNode(milestone, x, y, index);
    });
    
    this.svg.appendChild(this.mainGroup);
    wrapper.appendChild(this.svg);
    
    // Add zoom controls
    const controls = this._createControls();
    wrapper.appendChild(controls);
    
    // Add detail panel
    this.detailPanel = this._createDetailPanel();
    wrapper.appendChild(this.detailPanel);
    
    this.container.appendChild(wrapper);
    this.wrapper = wrapper;
    
    // Store dimensions for zoom/pan
    this.dimensions = { width, height, padding, timelineY, nodeSpacing };
  }
  
  _createNode(milestone, x, y, index) {
    const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    group.setAttribute('class', 'timeline-node');
    group.setAttribute('data-index', index);
    group.style.cursor = 'pointer';
    
    // Glow effect (hidden by default)
    const glow = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    glow.setAttribute('cx', x);
    glow.setAttribute('cy', y);
    glow.setAttribute('r', this.options.nodeRadius + 8);
    glow.setAttribute('fill', this.options.selectedColor);
    glow.setAttribute('opacity', '0');
    glow.setAttribute('class', 'node-glow');
    group.appendChild(glow);
    
    // Node circle
    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('cx', x);
    circle.setAttribute('cy', y);
    circle.setAttribute('r', this.options.nodeRadius);
    circle.setAttribute('fill', this.options.nodeColor);
    circle.setAttribute('class', 'node-circle');
    group.appendChild(circle);
    
    // Inner icon/checkmark
    const checkmark = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    checkmark.setAttribute('d', `M${x-4} ${y} L${x-1} ${y+3} L${x+5} ${y-3}`);
    checkmark.setAttribute('stroke', 'white');
    checkmark.setAttribute('stroke-width', '2');
    checkmark.setAttribute('fill', 'none');
    checkmark.setAttribute('stroke-linecap', 'round');
    checkmark.setAttribute('stroke-linejoin', 'round');
    group.appendChild(checkmark);
    
    // Date label (below)
    const dateLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    dateLabel.setAttribute('x', x);
    dateLabel.setAttribute('y', y + 35);
    dateLabel.setAttribute('text-anchor', 'middle');
    dateLabel.setAttribute('fill', this.options.mutedColor);
    dateLabel.setAttribute('font-size', '11');
    dateLabel.setAttribute('font-family', 'system-ui, sans-serif');
    dateLabel.textContent = milestone.displayDate;
    group.appendChild(dateLabel);
    
    // Title label (above, shown on hover/select)
    const titleLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    titleLabel.setAttribute('x', x);
    titleLabel.setAttribute('y', y - 25);
    titleLabel.setAttribute('text-anchor', 'middle');
    titleLabel.setAttribute('fill', this.options.textColor);
    titleLabel.setAttribute('font-size', '12');
    titleLabel.setAttribute('font-weight', '500');
    titleLabel.setAttribute('font-family', 'system-ui, sans-serif');
    titleLabel.setAttribute('opacity', '0');
    titleLabel.setAttribute('class', 'node-title');
    titleLabel.textContent = this._truncate(milestone.title, 20);
    group.appendChild(titleLabel);
    
    // Store milestone data
    group._milestone = milestone;
    group._x = x;
    group._y = y;
    
    this.mainGroup.appendChild(group);
  }
  
  _truncate(str, maxLength) {
    if (str.length <= maxLength) return str;
    return str.substring(0, maxLength - 3) + '...';
  }
  
  _createControls() {
    const controls = document.createElement('div');
    controls.className = 'timeline-controls';
    controls.style.cssText = `
      position: absolute;
      bottom: 12px;
      left: 12px;
      display: flex;
      gap: 8px;
      z-index: 10;
    `;
    
    const buttonStyle = `
      width: 32px;
      height: 32px;
      border: none;
      border-radius: 8px;
      background: rgba(255,255,255,0.1);
      color: ${this.options.textColor};
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 18px;
      transition: background 0.2s;
    `;
    
    const zoomIn = document.createElement('button');
    zoomIn.innerHTML = '+';
    zoomIn.style.cssText = buttonStyle;
    zoomIn.title = 'Zoom In';
    zoomIn.onclick = () => this._setZoom(this.zoom + 0.2);
    
    const zoomOut = document.createElement('button');
    zoomOut.innerHTML = '−';
    zoomOut.style.cssText = buttonStyle;
    zoomOut.title = 'Zoom Out';
    zoomOut.onclick = () => this._setZoom(this.zoom - 0.2);
    
    const reset = document.createElement('button');
    reset.innerHTML = '⟲';
    reset.style.cssText = buttonStyle;
    reset.title = 'Reset View';
    reset.onclick = () => this._resetView();
    
    controls.appendChild(zoomOut);
    controls.appendChild(reset);
    controls.appendChild(zoomIn);
    
    return controls;
  }
  
  _createDetailPanel() {
    const panel = document.createElement('div');
    panel.className = 'timeline-detail-panel';
    panel.style.cssText = `
      position: absolute;
      top: 12px;
      right: 12px;
      width: 200px;
      padding: 12px;
      background: rgba(0,0,0,0.6);
      backdrop-filter: blur(10px);
      border-radius: 10px;
      color: ${this.options.textColor};
      font-size: 13px;
      opacity: 0;
      transform: translateX(10px);
      transition: opacity 0.2s, transform 0.2s;
      pointer-events: none;
      z-index: 10;
    `;
    
    return panel;
  }
  
  _showDetailPanel(milestone) {
    const courseColors = {
      'apprentice': '#6366f1',
      'endless-opportunities': '#22c55e',
      'junior': '#f59e0b',
      'senior': '#ef4444',
      'undergrad': '#8b5cf6'
    };
    
    const courseColor = courseColors[milestone.course] || this.options.nodeColor;
    
    this.detailPanel.innerHTML = `
      <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
        <div style="width: 10px; height: 10px; border-radius: 50%; background: ${courseColor};"></div>
        <span style="font-weight: 600; font-size: 14px;">${milestone.title}</span>
      </div>
      <div style="color: ${this.options.mutedColor}; font-size: 12px;">
        <div style="margin-bottom: 4px;">📅 ${milestone.displayDate} at ${milestone.displayTime}</div>
        <div>📚 ${this._formatCourse(milestone.course)}</div>
      </div>
      <div style="margin-top: 10px; padding-top: 10px; border-top: 1px solid rgba(255,255,255,0.1); font-size: 11px; color: ${this.options.mutedColor};">
        Click elsewhere to close
      </div>
    `;
    
    this.detailPanel.style.opacity = '1';
    this.detailPanel.style.transform = 'translateX(0)';
    this.detailPanel.style.pointerEvents = 'auto';
  }
  
  _hideDetailPanel() {
    this.detailPanel.style.opacity = '0';
    this.detailPanel.style.transform = 'translateX(10px)';
    this.detailPanel.style.pointerEvents = 'none';
  }
  
  _formatCourse(courseId) {
    const names = {
      'apprentice': 'Apprentice Path',
      'endless-opportunities': 'Endless Opportunities',
      'junior': 'Junior Developer',
      'senior': 'Senior Track',
      'undergrad': 'Undergrad Program'
    };
    return names[courseId] || courseId;
  }
  
  _setupEventListeners() {
    // Node click
    this.svg.addEventListener('click', (e) => {
      const node = e.target.closest('.timeline-node');
      
      if (node) {
        const index = parseInt(node.getAttribute('data-index'));
        this._selectNode(index);
      } else {
        this._deselectNode();
      }
    });
    
    // Node hover
    this.svg.addEventListener('mouseover', (e) => {
      const node = e.target.closest('.timeline-node');
      if (node && this.selectedNode !== node) {
        this._highlightNode(node, true);
      }
    });
    
    this.svg.addEventListener('mouseout', (e) => {
      const node = e.target.closest('.timeline-node');
      if (node && this.selectedNode !== node) {
        this._highlightNode(node, false);
      }
    });
    
    // Pan with mouse drag
    this.wrapper.addEventListener('mousedown', (e) => {
      if (e.target.closest('.timeline-controls') || e.target.closest('.timeline-detail-panel')) return;
      if (e.target.closest('.timeline-node')) return;
      
      this.isDragging = true;
      this.dragStartX = e.clientX;
      this.dragStartPanX = this.panX;
      this.wrapper.style.cursor = 'grabbing';
    });
    
    document.addEventListener('mousemove', (e) => {
      if (!this.isDragging) return;
      
      const delta = e.clientX - this.dragStartX;
      this.panX = this.dragStartPanX + delta;
      this._updateTransform();
    });
    
    document.addEventListener('mouseup', () => {
      this.isDragging = false;
      if (this.wrapper) {
        this.wrapper.style.cursor = 'grab';
      }
    });
    
    // Zoom with scroll wheel
    this.wrapper.addEventListener('wheel', (e) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      this._setZoom(this.zoom + delta);
    });
  }
  
  _selectNode(index) {
    // Deselect previous
    if (this.selectedNode) {
      this._highlightNode(this.selectedNode, false);
    }
    
    const nodes = this.svg.querySelectorAll('.timeline-node');
    const node = nodes[index];
    
    if (node) {
      this.selectedNode = node;
      this._highlightNode(node, true, true);
      this._showDetailPanel(node._milestone);
    }
  }
  
  _deselectNode() {
    if (this.selectedNode) {
      this._highlightNode(this.selectedNode, false);
      this.selectedNode = null;
      this._hideDetailPanel();
    }
  }
  
  _highlightNode(node, highlight, isSelected = false) {
    const glow = node.querySelector('.node-glow');
    const circle = node.querySelector('.node-circle');
    const title = node.querySelector('.node-title');
    
    if (highlight) {
      glow.setAttribute('opacity', isSelected ? '0.4' : '0.2');
      circle.setAttribute('fill', this.options.selectedColor);
      circle.setAttribute('r', this.options.nodeRadius + 2);
      title.setAttribute('opacity', '1');
    } else {
      glow.setAttribute('opacity', '0');
      circle.setAttribute('fill', this.options.nodeColor);
      circle.setAttribute('r', this.options.nodeRadius);
      title.setAttribute('opacity', '0');
    }
  }
  
  _setZoom(newZoom) {
    this.zoom = Math.max(0.5, Math.min(3, newZoom));
    this._updateTransform();
  }
  
  _updateTransform() {
    const { width, height } = this.dimensions;
    const centerX = width / 2;
    const centerY = height / 2;
    
    // Apply transform: translate to center, scale, translate back, then apply pan
    this.mainGroup.setAttribute('transform', 
      `translate(${centerX + this.panX}, ${centerY}) scale(${this.zoom}) translate(${-centerX}, ${-centerY})`
    );
  }
  
  _resetView() {
    this.zoom = 1;
    this.panX = 0;
    this._updateTransform();
    this._deselectNode();
  }
  
  _animate() {
    const nodes = this.svg.querySelectorAll('.timeline-node');
    
    anime({
      targets: nodes,
      opacity: [0, 1],
      scale: [0.5, 1],
      delay: anime.stagger(80),
      easing: 'easeOutElastic(1, 0.6)',
      duration: 800
    });
  }
  
  destroy() {
    if (this.container) {
      this.container.innerHTML = '';
    }
  }
}

// Export for global access
if (typeof window !== 'undefined') {
  window.TimelineGraph = TimelineGraph;
}
