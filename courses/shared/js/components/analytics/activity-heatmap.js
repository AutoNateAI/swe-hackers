/**
 * ActivityHeatmap Component
 * 
 * GitHub-style contribution heatmap showing daily activity over time.
 * Interactive with hover tooltips showing details.
 */

class ActivityHeatmap {
  constructor(container, options = {}) {
    this.container = typeof container === 'string' 
      ? document.querySelector(container) 
      : container;
    
    this.options = {
      data: [], // Array of { date: 'YYYY-MM-DD', count: number }
      weeks: 12, // Number of weeks to show
      cellSize: 14,
      cellGap: 3,
      colors: {
        empty: 'rgba(255,255,255,0.05)',
        level1: '#0e4429',
        level2: '#006d32',
        level3: '#26a641',
        level4: '#39d353'
      },
      ...options
    };
    
    this.element = null;
    this.tooltip = null;
  }
  
  render() {
    if (!this.container) return this;
    
    this.container.innerHTML = '';
    
    // Process data into a map
    const activityMap = new Map();
    this.options.data.forEach(d => {
      activityMap.set(d.date, d.count);
    });
    
    // Calculate date range
    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - (this.options.weeks * 7));
    
    // Find max for color scaling
    const maxCount = Math.max(1, ...this.options.data.map(d => d.count));
    
    // Build grid
    const { cellSize, cellGap } = this.options;
    const width = this.options.weeks * (cellSize + cellGap);
    const height = 7 * (cellSize + cellGap) + 20; // 7 days + labels
    
    this.element = document.createElement('div');
    this.element.className = 'activity-heatmap';
    this.element.style.cssText = `
      position: relative;
      width: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
    `;
    
    // Make SVG responsive
    const svgWidth = width + 30;
    const svgHeight = 7 * (cellSize + cellGap) + 5;
    
    let svg = `
      <svg viewBox="0 0 ${svgWidth} ${svgHeight}" preserveAspectRatio="xMidYMid meet" 
           style="width: 100%; max-width: ${svgWidth}px; height: auto;" class="activity-heatmap__svg">
        <g transform="translate(20, 0)">
    `;
    
    // Day labels
    const dayLabels = ['', 'Mon', '', 'Wed', '', 'Fri', ''];
    dayLabels.forEach((label, i) => {
      if (label) {
        svg += `<text x="-5" y="${i * (cellSize + cellGap) + cellSize/2 + 3}" 
                  font-size="10" fill="var(--text-muted)" text-anchor="end">${label}</text>`;
      }
    });
    
    // Generate cells
    let currentDate = new Date(startDate);
    let week = 0;
    
    // Align to start of week (Sunday)
    while (currentDate.getDay() !== 0) {
      currentDate.setDate(currentDate.getDate() - 1);
    }
    
    while (currentDate <= today) {
      const dayOfWeek = currentDate.getDay();
      const dateStr = currentDate.toISOString().split('T')[0];
      const count = activityMap.get(dateStr) || 0;
      
      const x = week * (cellSize + cellGap);
      const y = dayOfWeek * (cellSize + cellGap);
      const color = this._getColor(count, maxCount);
      
      svg += `
        <rect 
          x="${x}" y="${y}" 
          width="${cellSize}" height="${cellSize}" 
          rx="3" ry="3"
          fill="${color}"
          class="activity-heatmap__cell"
          data-date="${dateStr}"
          data-count="${count}"
          style="cursor: pointer;"
        />
      `;
      
      // Move to next day
      currentDate.setDate(currentDate.getDate() + 1);
      if (currentDate.getDay() === 0) week++;
    }
    
    svg += `</g></svg>`;
    
    // Legend - centered below
    const legend = `
      <div class="activity-heatmap__legend" style="
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 4px;
        margin-top: 8px;
        font-size: 10px;
        color: var(--text-muted);
      ">
        <span>Less</span>
        ${Object.values(this.options.colors).map(c => 
          `<div style="width: 10px; height: 10px; background: ${c}; border-radius: 2px;"></div>`
        ).join('')}
        <span>More</span>
      </div>
    `;
    
    this.element.innerHTML = svg + legend;
    this.container.appendChild(this.element);
    
    // Create tooltip
    this._createTooltip();
    this._setupEvents();
    
    return this;
  }
  
  _getColor(count, max) {
    if (count === 0) return this.options.colors.empty;
    const ratio = count / max;
    if (ratio <= 0.25) return this.options.colors.level1;
    if (ratio <= 0.5) return this.options.colors.level2;
    if (ratio <= 0.75) return this.options.colors.level3;
    return this.options.colors.level4;
  }
  
  _createTooltip() {
    this.tooltip = document.createElement('div');
    this.tooltip.className = 'activity-heatmap__tooltip';
    this.tooltip.style.cssText = `
      position: fixed;
      background: rgba(0,0,0,0.9);
      color: white;
      padding: 6px 10px;
      border-radius: 6px;
      font-size: 12px;
      pointer-events: none;
      opacity: 0;
      transition: opacity 0.15s;
      z-index: 1000;
      white-space: nowrap;
    `;
    document.body.appendChild(this.tooltip);
  }
  
  _setupEvents() {
    const cells = this.element.querySelectorAll('.activity-heatmap__cell');
    
    cells.forEach(cell => {
      cell.addEventListener('mouseenter', (e) => {
        const date = cell.getAttribute('data-date');
        const count = cell.getAttribute('data-count');
        const dateObj = new Date(date + 'T12:00:00');
        const formatted = dateObj.toLocaleDateString('en-US', { 
          weekday: 'short', month: 'short', day: 'numeric' 
        });
        
        this.tooltip.innerHTML = `<strong>${count}</strong> activities on ${formatted}`;
        this.tooltip.style.opacity = '1';
        
        const rect = cell.getBoundingClientRect();
        this.tooltip.style.left = rect.left + rect.width/2 - this.tooltip.offsetWidth/2 + 'px';
        this.tooltip.style.top = rect.top - 35 + 'px';
      });
      
      cell.addEventListener('mouseleave', () => {
        this.tooltip.style.opacity = '0';
      });
    });
  }
  
  destroy() {
    if (this.tooltip) {
      this.tooltip.remove();
    }
    if (this.container) {
      this.container.innerHTML = '';
    }
  }
}

// Export
if (typeof window !== 'undefined') {
  window.ActivityHeatmap = ActivityHeatmap;
}
