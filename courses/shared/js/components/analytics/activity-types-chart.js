/**
 * ActivityTypesChart Component
 * 
 * Pie chart showing distribution of activity types.
 */

class ActivityTypesChart {
  constructor(container, options = {}) {
    this.container = typeof container === 'string' 
      ? document.querySelector(container) 
      : container;
    
    this.options = {
      data: {}, // { 'Quiz': 45, 'Story': 30, 'Practice': 25 }
      height: 140,
      colors: ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#22d3ee'],
      ...options
    };
  }
  
  render() {
    if (!this.container) return this;
    this.container.innerHTML = '';
    
    const entries = Object.entries(this.options.data).filter(([_, v]) => v > 0);
    if (entries.length === 0) {
      this._renderEmpty();
      return this;
    }
    
    const total = entries.reduce((sum, [_, v]) => sum + v, 0);
    const height = this.options.height;
    const chartSize = Math.min(80, height - 20);
    const cx = chartSize / 2;
    const cy = chartSize / 2;
    const radius = chartSize * 0.45;
    
    let svg = `<svg viewBox="0 0 ${chartSize} ${chartSize}" style="width: ${chartSize}px; height: ${chartSize}px; flex-shrink: 0;">`;
    
    // Draw pie slices
    let startAngle = -Math.PI / 2;
    entries.forEach(([label, value], i) => {
      const angle = (value / total) * Math.PI * 2;
      const endAngle = startAngle + angle;
      
      const x1 = cx + radius * Math.cos(startAngle);
      const y1 = cy + radius * Math.sin(startAngle);
      const x2 = cx + radius * Math.cos(endAngle);
      const y2 = cy + radius * Math.sin(endAngle);
      
      const largeArc = angle > Math.PI ? 1 : 0;
      const color = this.options.colors[i % this.options.colors.length];
      
      svg += `
        <path d="M ${cx} ${cy} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z"
              fill="${color}" opacity="0.85" style="cursor: pointer;">
          <title>${label}: ${value} (${Math.round(value / total * 100)}%)</title>
        </path>
      `;
      
      startAngle = endAngle;
    });
    
    svg += `</svg>`;
    
    // Legend - percentages on left, labels on right
    let legend = `<div style="display: flex; flex-direction: column; gap: 6px; font-size: 11px; flex: 1; min-width: 0;">`;
    entries.slice(0, 4).forEach(([label, value], i) => {
      const color = this.options.colors[i % this.options.colors.length];
      const pct = Math.round(value / total * 100);
      legend += `
        <div style="display: flex; align-items: center; gap: 8px;">
          <span style="color: var(--text-primary); font-weight: 600; font-size: 12px; min-width: 32px;">${pct}%</span>
          <div style="width: 8px; height: 8px; border-radius: 2px; background: ${color}; flex-shrink: 0;"></div>
          <span style="color: var(--text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${label}</span>
        </div>
      `;
    });
    legend += `</div>`;
    
    this.container.innerHTML = `
      <div style="display: flex; align-items: center; gap: 1rem; height: 100%;">
        ${svg}
        ${legend}
      </div>
    `;
    return this;
  }
  
  _renderEmpty() {
    this.container.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: center; height: ${this.options.height}px; color: var(--text-muted);">
        <div style="text-align: center; font-size: 0.8rem;">
          <div style="font-size: 1.5rem; opacity: 0.5;">🎮</div>
          <div>No activities yet</div>
        </div>
      </div>
    `;
  }
}

if (typeof window !== 'undefined') {
  window.ActivityTypesChart = ActivityTypesChart;
}
