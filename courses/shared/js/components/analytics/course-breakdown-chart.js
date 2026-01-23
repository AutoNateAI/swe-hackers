/**
 * CourseBreakdownChart Component
 * 
 * Horizontal stacked bar chart showing progress per course.
 */

class CourseBreakdownChart {
  constructor(container, options = {}) {
    this.container = typeof container === 'string' 
      ? document.querySelector(container) 
      : container;
    
    this.options = {
      data: [], // Array of { course: 'apprentice', completed: 60, total: 7 }
      height: 140,
      completedColor: 'var(--accent-success, #22c55e)',
      remainingColor: 'rgba(255,255,255,0.1)',
      ...options
    };
  }
  
  render() {
    if (!this.container) return this;
    this.container.innerHTML = '';
    
    if (this.options.data.length === 0) {
      this._renderEmpty();
      return this;
    }
    
    const courseNames = {
      'apprentice': 'Apprentice',
      'junior': 'Junior',
      'senior': 'Senior', 
      'undergrad': 'Undergrad',
      'endless-opportunities': 'E.O.'
    };
    
    const courseColors = {
      'apprentice': '#6366f1',
      'junior': '#22c55e',
      'senior': '#f59e0b',
      'undergrad': '#8b5cf6',
      'endless-opportunities': '#22d3ee'
    };
    
    // Sort by progress and take top 3 with activity
    const sortedData = [...this.options.data]
      .filter(item => item.completed > 0 || item.total > 0)
      .sort((a, b) => {
        const pctA = a.total > 0 ? a.completed / a.total : 0;
        const pctB = b.total > 0 ? b.completed / b.total : 0;
        return pctB - pctA;
      })
      .slice(0, 3);
    
    if (sortedData.length === 0) {
      this._renderEmpty();
      return this;
    }
    
    let html = `<div style="display: flex; flex-direction: column; gap: 0.75rem; height: 100%; justify-content: center;">`;
    
    sortedData.forEach(item => {
      const pct = item.total > 0 ? Math.round((item.completed / item.total) * 100) : 0;
      const name = courseNames[item.course] || item.course;
      const color = courseColors[item.course] || this.options.completedColor;
      
      html += `
        <div style="flex: 1; display: flex; flex-direction: column; justify-content: center;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
            <span style="font-size: 11px; color: var(--text-primary);">${name}</span>
            <span style="font-size: 11px; color: ${color}; font-weight: 500;">${pct}%</span>
          </div>
          <div style="height: 8px; background: ${this.options.remainingColor}; border-radius: 4px; overflow: hidden;">
            <div style="height: 100%; width: ${pct}%; background: ${color}; border-radius: 4px; transition: width 0.5s ease-out;"></div>
          </div>
        </div>
      `;
    });
    
    html += `</div>`;
    this.container.innerHTML = html;
    return this;
  }
  
  _renderEmpty() {
    this.container.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: center; height: ${this.options.height}px; color: var(--text-muted);">
        <div style="text-align: center; font-size: 0.8rem;">
          <div style="font-size: 1.5rem; opacity: 0.5;">📚</div>
          <div>No courses enrolled</div>
        </div>
      </div>
    `;
  }
}

if (typeof window !== 'undefined') {
  window.CourseBreakdownChart = CourseBreakdownChart;
}
