/**
 * ProgressChart Component
 * 
 * Interactive line/area chart showing progress over time.
 * Supports multiple series, tooltips, and animations.
 */

class ProgressChart {
  constructor(container, options = {}) {
    this.container = typeof container === 'string' 
      ? document.querySelector(container) 
      : container;
    
    this.options = {
      data: [], // Array of { date: 'YYYY-MM-DD', value: number, label?: string }
      height: 200,
      lineColor: 'var(--accent-primary, #6366f1)',
      areaColor: 'rgba(99, 102, 241, 0.2)',
      gridColor: 'rgba(255,255,255,0.1)',
      showArea: true,
      showDots: true,
      showGrid: true,
      animate: true,
      yMin: 0,
      yMax: 100,
      formatValue: (v) => `${Math.round(v)}%`,
      formatDate: (d) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      ...options
    };
    
    this.element = null;
    this.tooltip = null;
  }
  
  render() {
    if (!this.container) return this;
    
    this.container.innerHTML = '';
    
    if (this.options.data.length === 0) {
      this._renderEmpty();
      return this;
    }
    
    const data = [...this.options.data].sort((a, b) => new Date(a.date) - new Date(b.date));
    
    this.element = document.createElement('div');
    this.element.className = 'progress-chart';
    this.element.style.cssText = 'position: relative; width: 100%;';
    
    const padding = { top: 15, right: 15, bottom: 25, left: 35 };
    const width = this.container.offsetWidth || 300;
    const height = this.container.offsetHeight || this.options.height;
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;
    
    // Calculate scales
    const xScale = (i) => padding.left + (i / (data.length - 1 || 1)) * chartWidth;
    const yScale = (v) => height - padding.bottom - ((v - this.options.yMin) / (this.options.yMax - this.options.yMin)) * chartHeight;
    
    let svg = `
      <svg width="${width}" height="${height}" class="progress-chart__svg">
        <defs>
          <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="${this.options.lineColor}" stop-opacity="0.3"/>
            <stop offset="100%" stop-color="${this.options.lineColor}" stop-opacity="0.05"/>
          </linearGradient>
        </defs>
    `;
    
    // Grid lines
    if (this.options.showGrid) {
      svg += '<g class="progress-chart__grid">';
      const gridLines = 5;
      for (let i = 0; i <= gridLines; i++) {
        const y = padding.top + (chartHeight / gridLines) * i;
        const value = this.options.yMax - ((this.options.yMax - this.options.yMin) / gridLines) * i;
        svg += `
          <line x1="${padding.left}" y1="${y}" x2="${width - padding.right}" y2="${y}" 
                stroke="${this.options.gridColor}" stroke-dasharray="4,4"/>
          <text x="${padding.left - 8}" y="${y + 4}" 
                font-size="10" fill="var(--text-muted)" text-anchor="end">
            ${Math.round(value)}
          </text>
        `;
      }
      svg += '</g>';
    }
    
    // Build path points
    const points = data.map((d, i) => ({
      x: xScale(i),
      y: yScale(d.value),
      data: d
    }));
    
    // Area path
    if (this.options.showArea && points.length > 1) {
      const areaPath = `
        M ${points[0].x} ${height - padding.bottom}
        L ${points.map(p => `${p.x} ${p.y}`).join(' L ')}
        L ${points[points.length - 1].x} ${height - padding.bottom}
        Z
      `;
      svg += `<path d="${areaPath}" fill="url(#areaGradient)" class="progress-chart__area"/>`;
    }
    
    // Line path
    if (points.length > 1) {
      const linePath = `M ${points.map(p => `${p.x} ${p.y}`).join(' L ')}`;
      svg += `
        <path d="${linePath}" fill="none" stroke="${this.options.lineColor}" 
              stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"
              class="progress-chart__line"
              ${this.options.animate ? 'style="stroke-dasharray: 1000; stroke-dashoffset: 1000;"' : ''}
        />
      `;
    }
    
    // Data points
    if (this.options.showDots) {
      svg += '<g class="progress-chart__dots">';
      points.forEach((p, i) => {
        svg += `
          <circle cx="${p.x}" cy="${p.y}" r="5" 
                  fill="${this.options.lineColor}" stroke="var(--surface-base)" stroke-width="2"
                  class="progress-chart__dot"
                  data-index="${i}"
                  style="cursor: pointer; opacity: ${this.options.animate ? 0 : 1};"
          />
        `;
      });
      svg += '</g>';
    }
    
    // X-axis labels (show every few points to avoid crowding)
    const labelInterval = Math.max(1, Math.floor(data.length / 6));
    svg += '<g class="progress-chart__labels">';
    data.forEach((d, i) => {
      if (i % labelInterval === 0 || i === data.length - 1) {
        svg += `
          <text x="${xScale(i)}" y="${height - 8}" 
                font-size="10" fill="var(--text-muted)" text-anchor="middle">
            ${this.options.formatDate(d.date)}
          </text>
        `;
      }
    });
    svg += '</g>';
    
    svg += '</svg>';
    
    this.element.innerHTML = svg;
    this.container.appendChild(this.element);
    
    // Store points for tooltip
    this._points = points;
    this._data = data;
    
    this._createTooltip();
    this._setupEvents();
    
    if (this.options.animate) {
      this._animate();
    }
    
    return this;
  }
  
  _renderEmpty() {
    this.container.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: center; 
                  height: ${this.options.height}px; color: var(--text-muted); text-align: center;">
        <div>
          <div style="font-size: 2rem; opacity: 0.5;">📈</div>
          <div style="font-size: 0.85rem;">No progress data yet</div>
        </div>
      </div>
    `;
  }
  
  _createTooltip() {
    this.tooltip = document.createElement('div');
    this.tooltip.className = 'progress-chart__tooltip';
    this.tooltip.style.cssText = `
      position: fixed;
      background: rgba(0,0,0,0.9);
      color: white;
      padding: 8px 12px;
      border-radius: 8px;
      font-size: 12px;
      pointer-events: none;
      opacity: 0;
      transition: opacity 0.15s;
      z-index: 1000;
    `;
    document.body.appendChild(this.tooltip);
  }
  
  _setupEvents() {
    const dots = this.element.querySelectorAll('.progress-chart__dot');
    const svg = this.element.querySelector('svg');
    
    dots.forEach((dot, i) => {
      dot.addEventListener('mouseenter', () => {
        const d = this._data[i];
        const p = this._points[i];
        
        this.tooltip.innerHTML = `
          <div style="font-weight: 600; margin-bottom: 4px;">
            ${this.options.formatValue(d.value)}
          </div>
          <div style="color: #aaa;">${this.options.formatDate(d.date)}</div>
          ${d.label ? `<div style="margin-top: 4px; color: #888;">${d.label}</div>` : ''}
        `;
        this.tooltip.style.opacity = '1';
        
        const rect = dot.getBoundingClientRect();
        this.tooltip.style.left = rect.left - this.tooltip.offsetWidth/2 + rect.width/2 + 'px';
        this.tooltip.style.top = rect.top - this.tooltip.offsetHeight - 10 + 'px';
        
        dot.setAttribute('r', '7');
      });
      
      dot.addEventListener('mouseleave', () => {
        this.tooltip.style.opacity = '0';
        dot.setAttribute('r', '5');
      });
    });
  }
  
  _animate() {
    const line = this.element.querySelector('.progress-chart__line');
    const dots = this.element.querySelectorAll('.progress-chart__dot');
    
    if (typeof anime !== 'undefined') {
      // Animate line drawing
      if (line) {
        anime({
          targets: line,
          strokeDashoffset: [1000, 0],
          easing: 'easeOutQuart',
          duration: 1500
        });
      }
      
      // Animate dots appearing
      anime({
        targets: dots,
        opacity: [0, 1],
        scale: [0, 1],
        delay: anime.stagger(100, { start: 500 }),
        easing: 'easeOutElastic(1, 0.5)',
        duration: 600
      });
    } else {
      // Fallback without anime.js
      if (line) line.style.strokeDashoffset = '0';
      dots.forEach(d => d.style.opacity = '1');
    }
  }
  
  destroy() {
    if (this.tooltip) this.tooltip.remove();
    if (this.container) this.container.innerHTML = '';
  }
}

// Export
if (typeof window !== 'undefined') {
  window.ProgressChart = ProgressChart;
}
