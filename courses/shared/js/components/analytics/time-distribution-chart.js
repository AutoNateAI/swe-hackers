/**
 * TimeDistributionChart Component
 * 
 * Donut chart showing time spent by activity type.
 */

class TimeDistributionChart {
  constructor(container, options = {}) {
    this.container = typeof container === 'string' 
      ? document.querySelector(container) 
      : container;
    
    this.options = {
      data: {}, // { 'Stories': 45, 'Quizzes': 35, 'Review': 20 }
      height: 140,
      colors: ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6'],
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
    const containerHeight = this.container.offsetHeight || this.options.height;
    const size = Math.min(this.container.offsetWidth || 120, containerHeight - 30);
    const cx = size / 2;
    const cy = size / 2;
    const radius = size * 0.42;
    const innerRadius = radius * 0.55;
    
    let svg = `<svg width="${size}" height="${size}" style="display: block; margin: 0 auto;">`;
    
    // Draw arcs
    let startAngle = -Math.PI / 2;
    entries.forEach(([label, value], i) => {
      const angle = (value / total) * Math.PI * 2;
      const endAngle = startAngle + angle;
      
      const x1 = cx + radius * Math.cos(startAngle);
      const y1 = cy + radius * Math.sin(startAngle);
      const x2 = cx + radius * Math.cos(endAngle);
      const y2 = cy + radius * Math.sin(endAngle);
      
      const ix1 = cx + innerRadius * Math.cos(startAngle);
      const iy1 = cy + innerRadius * Math.sin(startAngle);
      const ix2 = cx + innerRadius * Math.cos(endAngle);
      const iy2 = cy + innerRadius * Math.sin(endAngle);
      
      const largeArc = angle > Math.PI ? 1 : 0;
      const color = this.options.colors[i % this.options.colors.length];
      
      svg += `
        <path d="M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} 
                 L ${ix2} ${iy2} A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${ix1} ${iy1} Z"
              fill="${color}" opacity="0.85" style="cursor: pointer;">
          <title>${label}: ${Math.round(value / total * 100)}%</title>
        </path>
      `;
      
      startAngle = endAngle;
    });
    
    // Center text - total time
    const totalHours = Math.round(total / 60);
    svg += `<text x="${cx}" y="${cy - 5}" font-size="16" font-weight="600" fill="var(--text-primary)" text-anchor="middle">${totalHours}h</text>`;
    svg += `<text x="${cx}" y="${cy + 10}" font-size="9" fill="var(--text-muted)" text-anchor="middle">total</text>`;
    
    svg += `</svg>`;
    
    // Legend
    let legend = `<div style="display: flex; flex-wrap: wrap; justify-content: center; gap: 0.5rem; margin-top: 0.25rem; font-size: 10px;">`;
    entries.forEach(([label, value], i) => {
      const color = this.options.colors[i % this.options.colors.length];
      legend += `
        <div style="display: flex; align-items: center; gap: 4px;">
          <div style="width: 8px; height: 8px; border-radius: 2px; background: ${color};"></div>
          <span style="color: var(--text-muted);">${label}</span>
        </div>
      `;
    });
    legend += `</div>`;
    
    this.container.innerHTML = svg + legend;
    return this;
  }
  
  _renderEmpty() {
    this.container.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: center; height: ${this.options.height}px; color: var(--text-muted);">
        <div style="text-align: center; font-size: 0.8rem;">
          <div style="font-size: 1.5rem; opacity: 0.5;">⏱️</div>
          <div>No time data yet</div>
        </div>
      </div>
    `;
  }
}

if (typeof window !== 'undefined') {
  window.TimeDistributionChart = TimeDistributionChart;
}
