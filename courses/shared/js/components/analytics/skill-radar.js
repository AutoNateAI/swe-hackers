/**
 * SkillRadar Component
 * 
 * A radar/spider chart showing skill levels across topics.
 * Built with SVG for crisp rendering without external dependencies.
 * 
 * @example
 * const radar = new SkillRadar(container, {
 *   skills: {
 *     variables: 0.94,
 *     loops: 0.88,
 *     functions: 0.85,
 *     recursion: 0.52,
 *     arrays: 0.76
 *   }
 * });
 * radar.render();
 */

class SkillRadar {
  /**
   * Create a SkillRadar instance
   * @param {HTMLElement|string} container - Container element or selector
   * @param {Object} options - Chart configuration
   * @param {Object} options.skills - Skill name to score (0-1) mapping
   * @param {number} [options.size=280] - Chart size in pixels
   * @param {boolean} [options.showLabels=true] - Show skill labels
   * @param {boolean} [options.showValues=true] - Show score values
   * @param {boolean} [options.animate=true] - Animate on render
   */
  constructor(container, options = {}) {
    this.container = typeof container === 'string' 
      ? document.querySelector(container) 
      : container;
    
    this.options = {
      skills: {},
      size: 280,
      showLabels: true,
      showValues: true,
      animate: true,
      levels: 5,
      colorThresholds: {
        high: 0.8,    // >= 80% is green
        medium: 0.6   // >= 60% is yellow, below is red
      },
      ...options
    };
    
    this.element = null;
    this.svgElement = null;
    this.dataPath = null;
  }
  
  /**
   * Render the radar chart
   * @returns {SkillRadar} this instance for chaining
   */
  render() {
    if (!this.container) {
      console.error('SkillRadar: No container provided');
      return this;
    }
    
    const skills = Object.entries(this.options.skills);
    
    if (skills.length === 0) {
      this._renderEmpty();
      return this;
    }
    
    if (skills.length < 2) {
      this._renderMinimumRequired();
      return this;
    }
    
    this.element = document.createElement('div');
    this.element.className = 'skill-radar';
    this.element.style.cssText = 'width: 100%; height: 100%; display: flex; align-items: center; justify-content: center;';
    
    const { levels } = this.options;
    // Responsive viewBox with labels inside
    const viewBoxSize = 240;
    const center = viewBoxSize / 2;
    const radius = viewBoxSize * 0.28; // Smaller to fit labels
    const angleStep = (2 * Math.PI) / skills.length;
    
    // Build SVG with expanded viewBox for labels
    let svg = `
      <svg viewBox="0 0 ${viewBoxSize} ${viewBoxSize}" class="skill-radar__svg" style="width: 100%; height: 100%;" preserveAspectRatio="xMidYMid meet">
        <defs>
          <linearGradient id="radar-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:var(--accent-primary);stop-opacity:0.8"/>
            <stop offset="100%" style="stop-color:var(--accent-secondary);stop-opacity:0.6"/>
          </linearGradient>
        </defs>
        
        <!-- Background levels -->
        <g class="skill-radar__levels">
    `;
    
    // Draw concentric level polygons
    for (let level = levels; level >= 1; level--) {
      const levelRadius = (radius * level) / levels;
      const points = skills.map((_, i) => {
        const angle = angleStep * i - Math.PI / 2;
        const x = center + levelRadius * Math.cos(angle);
        const y = center + levelRadius * Math.sin(angle);
        return `${x},${y}`;
      }).join(' ');
      
      svg += `
        <polygon 
          points="${points}" 
          class="skill-radar__level skill-radar__level--${level}"
        />
      `;
    }
    
    svg += '</g>';
    
    // Draw axis lines
    svg += '<g class="skill-radar__axes">';
    skills.forEach((_, i) => {
      const angle = angleStep * i - Math.PI / 2;
      const x = center + radius * Math.cos(angle);
      const y = center + radius * Math.sin(angle);
      
      svg += `
        <line 
          x1="${center}" y1="${center}" 
          x2="${x}" y2="${y}" 
          class="skill-radar__axis"
        />
      `;
    });
    svg += '</g>';
    
    // Draw data polygon
    const dataPoints = skills.map(([_, score], i) => {
      const angle = angleStep * i - Math.PI / 2;
      const r = radius * Math.max(0, Math.min(1, score));
      const x = center + r * Math.cos(angle);
      const y = center + r * Math.sin(angle);
      return `${x},${y}`;
    }).join(' ');
    
    svg += `
      <g class="skill-radar__data">
        <polygon 
          points="${this.options.animate ? skills.map(() => `${center},${center}`).join(' ') : dataPoints}" 
          class="skill-radar__polygon"
          data-points="${dataPoints}"
        />
      </g>
    `;
    
    // Draw data points with color coding
    svg += '<g class="skill-radar__points">';
    skills.forEach(([name, score], i) => {
      const angle = angleStep * i - Math.PI / 2;
      const r = radius * Math.max(0, Math.min(1, score));
      const x = center + r * Math.cos(angle);
      const y = center + r * Math.sin(angle);
      
      const colorClass = this._getColorClass(score);
      
      svg += `
        <circle 
          cx="${this.options.animate ? center : x}" 
          cy="${this.options.animate ? center : y}" 
          r="6" 
          class="skill-radar__point skill-radar__point--${colorClass}"
          data-x="${x}"
          data-y="${y}"
          data-skill="${name}"
          data-score="${score}"
        />
      `;
    });
    svg += '</g>';
    
    // Draw labels
    if (this.options.showLabels) {
      svg += '<g class="skill-radar__labels">';
      skills.forEach(([name, score], i) => {
        const angle = angleStep * i - Math.PI / 2;
        const labelRadius = radius + 25; // Distance from center to labels
        const x = center + labelRadius * Math.cos(angle);
        const y = center + labelRadius * Math.sin(angle);
        
        const formattedName = this._formatSkillName(name);
        const valueText = this.options.showValues ? ` (${Math.round(score * 100)}%)` : '';
        const colorClass = this._getColorClass(score);
        
        // Adjust text anchor based on position
        let textAnchor = 'middle';
        if (x < center - 10) textAnchor = 'end';
        else if (x > center + 10) textAnchor = 'start';
        
        svg += `
          <text 
            x="${x}" y="${y}" 
            class="skill-radar__label skill-radar__label--${colorClass}"
            text-anchor="${textAnchor}"
            dominant-baseline="middle"
          >
            ${formattedName}${valueText}
          </text>
        `;
      });
      svg += '</g>';
    }
    
    svg += '</svg>';
    
    // Add legend
    const legend = `
      <div class="skill-radar__legend">
        <span class="skill-radar__legend-item skill-radar__legend-item--high">
          <span class="skill-radar__legend-dot"></span>
          Strong (≥80%)
        </span>
        <span class="skill-radar__legend-item skill-radar__legend-item--medium">
          <span class="skill-radar__legend-dot"></span>
          Good (60-79%)
        </span>
        <span class="skill-radar__legend-item skill-radar__legend-item--low">
          <span class="skill-radar__legend-dot"></span>
          Needs Work (<60%)
        </span>
      </div>
    `;
    
    this.element.innerHTML = svg + legend;
    this.container.appendChild(this.element);
    
    this.svgElement = this.element.querySelector('svg');
    this.dataPath = this.element.querySelector('.skill-radar__polygon');
    
    // Animate if enabled
    if (this.options.animate) {
      this._animateIn();
    }
    
    return this;
  }
  
  /**
   * Update skills with new data
   * @param {Object} newSkills - New skill scores
   */
  update(newSkills) {
    this.options.skills = newSkills;
    
    // Clear and re-render
    if (this.element) {
      this.element.remove();
    }
    
    this.render();
  }
  
  /**
   * Set loading state
   */
  setLoading(isLoading) {
    if (isLoading) {
      this.element?.classList.add('skill-radar--loading');
    } else {
      this.element?.classList.remove('skill-radar--loading');
    }
    return this;
  }
  
  /**
   * Destroy the component
   */
  destroy() {
    this.element?.remove();
    this.element = null;
    this.svgElement = null;
    this.dataPath = null;
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // PRIVATE METHODS
  // ═══════════════════════════════════════════════════════════════════════════
  
  /**
   * Render empty state
   * @private
   */
  _renderEmpty() {
    this.element = document.createElement('div');
    this.element.className = 'skill-radar skill-radar--empty';
    this.element.innerHTML = `
      <div class="skill-radar__empty">
        <span class="skill-radar__empty-icon">🎯</span>
        <p class="skill-radar__empty-text">Complete activities to see your skill levels</p>
      </div>
    `;
    this.container.appendChild(this.element);
  }
  
  /**
   * Render minimum required message
   * @private
   */
  _renderMinimumRequired() {
    this.element = document.createElement('div');
    this.element.className = 'skill-radar skill-radar--minimum';
    this.element.innerHTML = `
      <div class="skill-radar__empty">
        <span class="skill-radar__empty-icon">📊</span>
        <p class="skill-radar__empty-text">Complete more activities to unlock the skill radar</p>
        <p class="skill-radar__empty-subtext">Need at least 2 skill areas</p>
      </div>
    `;
    this.container.appendChild(this.element);
  }
  
  /**
   * Get color class based on score
   * @private
   */
  _getColorClass(score) {
    if (score >= this.options.colorThresholds.high) return 'high';
    if (score >= this.options.colorThresholds.medium) return 'medium';
    return 'low';
  }
  
  /**
   * Format skill name for display
   * @private
   */
  _formatSkillName(name) {
    return name
      .replace(/[-_]/g, ' ')
      .replace(/\b\w/g, c => c.toUpperCase());
  }
  
  /**
   * Animate the radar chart in
   * @private
   */
  _animateIn() {
    if (typeof anime === 'undefined') {
      // Fallback without anime.js
      const polygon = this.element.querySelector('.skill-radar__polygon');
      const points = this.element.querySelectorAll('.skill-radar__point');
      
      if (polygon) {
        polygon.setAttribute('points', polygon.dataset.points);
      }
      
      points.forEach(point => {
        point.setAttribute('cx', point.dataset.x);
        point.setAttribute('cy', point.dataset.y);
      });
      
      return;
    }
    
    // Animate polygon
    const polygon = this.element.querySelector('.skill-radar__polygon');
    const targetPoints = polygon?.dataset.points;
    
    if (polygon && targetPoints) {
      setTimeout(() => {
        polygon.setAttribute('points', targetPoints);
      }, 100);
    }
    
    // Animate points
    const points = this.element.querySelectorAll('.skill-radar__point');
    
    anime({
      targets: points,
      cx: (el) => el.dataset.x,
      cy: (el) => el.dataset.y,
      duration: 800,
      delay: anime.stagger(50, { start: 200 }),
      easing: 'easeOutElastic(1, 0.5)'
    });
  }
}

// Export for module and global use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SkillRadar;
}
window.SkillRadar = SkillRadar;
