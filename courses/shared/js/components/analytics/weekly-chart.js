/**
 * WeeklyChart Component
 * 
 * Animated bar chart showing activity by day of week.
 * Interactive with hover effects.
 */

class WeeklyChart {
  constructor(container, options = {}) {
    this.container = typeof container === 'string' 
      ? document.querySelector(container) 
      : container;
    
    this.options = {
      data: { Sun: 0, Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0, Sat: 0 },
      height: 120,
      barColor: 'var(--accent-primary, #6366f1)',
      highlightColor: 'var(--accent-secondary, #22d3ee)',
      animate: true,
      ...options
    };
    
    this.element = null;
  }
  
  render() {
    if (!this.container) return this;
    
    this.container.innerHTML = '';
    
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const data = days.map(d => ({ day: d, value: this.options.data[d] || 0 }));
    const maxValue = Math.max(1, ...data.map(d => d.value));
    const today = new Date().getDay();
    
    this.element = document.createElement('div');
    this.element.className = 'weekly-chart';
    this.element.style.cssText = `
      display: flex;
      align-items: flex-end;
      justify-content: space-around;
      height: 100%;
      padding: 0;
      gap: 4px;
    `;
    
    data.forEach((d, i) => {
      const heightPercent = (d.value / maxValue) * 100;
      const isToday = i === today;
      
      const bar = document.createElement('div');
      bar.className = 'weekly-chart__bar';
      bar.style.cssText = `
        flex: 1;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 6px;
      `;
      
      const barInner = document.createElement('div');
      barInner.className = 'weekly-chart__bar-inner';
      barInner.style.cssText = `
        width: 100%;
        max-width: 40px;
        height: ${this.options.animate ? 0 : heightPercent}%;
        min-height: 4px;
        background: ${isToday ? this.options.highlightColor : this.options.barColor};
        border-radius: 6px 6px 2px 2px;
        transition: height 0.6s cubic-bezier(0.34, 1.56, 0.64, 1), background 0.2s;
        cursor: pointer;
        position: relative;
      `;
      barInner.setAttribute('data-height', heightPercent);
      barInner.setAttribute('data-value', d.value);
      
      const label = document.createElement('div');
      label.style.cssText = `
        font-size: 11px;
        color: ${isToday ? this.options.highlightColor : 'var(--text-muted)'};
        font-weight: ${isToday ? '600' : '400'};
      `;
      label.textContent = d.day;
      
      bar.appendChild(barInner);
      bar.appendChild(label);
      this.element.appendChild(bar);
      
      // Hover effects
      barInner.addEventListener('mouseenter', () => {
        barInner.style.filter = 'brightness(1.2)';
        barInner.style.transform = 'scaleX(1.1)';
      });
      barInner.addEventListener('mouseleave', () => {
        barInner.style.filter = '';
        barInner.style.transform = '';
      });
    });
    
    this.container.appendChild(this.element);
    
    if (this.options.animate) {
      this._animate();
    }
    
    return this;
  }
  
  _animate() {
    const bars = this.element.querySelectorAll('.weekly-chart__bar-inner');
    
    setTimeout(() => {
      bars.forEach((bar, i) => {
        setTimeout(() => {
          bar.style.height = bar.getAttribute('data-height') + '%';
        }, i * 80);
      });
    }, 100);
  }
  
  destroy() {
    if (this.container) this.container.innerHTML = '';
  }
}

// Export
if (typeof window !== 'undefined') {
  window.WeeklyChart = WeeklyChart;
}
