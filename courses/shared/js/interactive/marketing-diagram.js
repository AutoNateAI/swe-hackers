/**
 * MarketingDiagram - Simplified animated diagrams for marketing pages
 * 
 * Lightweight version of StorytellingDiagram optimized for:
 *   - Auto-play on scroll into view
 *   - Looping animations
 *   - 1-2 step mini-stories
 *   - Optional audio (muted by default)
 *   - No complex controls
 * 
 * Dependencies:
 *   - Cytoscape.js
 *   - Anime.js
 *   - DiagramUtils (diagram-utils.js)
 *   - AudioNarrationEngine (audio-engine.js) - optional
 */

class MarketingDiagram {
  constructor(containerId, story, options = {}) {
    this.containerId = containerId;
    this.story = story;
    this.elements = story.elements || [];
    this.steps = story.steps || [];
    this.options = {
      autoPlay: true,
      loop: true,
      loopDelay: 2000,
      stepDuration: 2500,
      pauseBetweenSteps: 500,
      audioEnabled: false,
      audioMutedByDefault: true,
      audioBasePath: 'audio',
      canvasHeight: 300,
      ...options
    };
    
    this.cy = null;
    this.currentStep = -1;
    this.isPlaying = false;
    this.shouldStop = false;
    this.hasPlayedOnce = false;
    this.observer = null;
    this.activeAnimations = [];
    this.audioEngine = options.audioEngine || null;
    this.audioMuted = this.options.audioMutedByDefault;
    
    this.init();
  }

  init() {
    const container = document.getElementById(this.containerId);
    if (!container) {
      console.error(`MarketingDiagram: Container '${this.containerId}' not found`);
      return;
    }

    // Set container height
    container.style.height = `${this.options.canvasHeight}px`;

    // Create Cytoscape instance
    this.cy = this.createDiagram();
    if (!this.cy) return;

    // Initial state: all dimmed
    this.showAllDimmed();

    // Setup audio toggle if present
    this.setupAudioToggle();

    // Setup auto-play on scroll
    if (this.options.autoPlay) {
      this.setupScrollTrigger();
    }
  }

  createDiagram() {
    const container = document.getElementById(this.containerId);
    
    const cy = cytoscape({
      container: container,
      elements: this.elements,
      style: this.getStylesheet(),
      layout: {
        name: 'dagre',
        rankDir: 'LR',
        nodeSep: 60,
        rankSep: 100,
        padding: 40
      },
      minZoom: 0.5,
      maxZoom: 2,
      userZoomingEnabled: false,
      userPanningEnabled: false,
      boxSelectionEnabled: false
    });

    // Fit after layout
    setTimeout(() => cy.fit(30), 100);

    return cy;
  }

  getStylesheet() {
    const baseStyles = typeof DiagramUtils !== 'undefined' 
      ? DiagramUtils.getBaseStylesheet() 
      : this.getDefaultStyles();

    // Marketing-specific animation styles
    const marketingStyles = [
      {
        selector: 'node.marketing-active',
        style: {
          'border-width': 4,
          'border-color': '#4db6ac',
          'opacity': 1,
          'z-index': 999
        }
      },
      {
        selector: 'node.marketing-dimmed',
        style: {
          'opacity': 0.25
        }
      },
      {
        selector: 'edge.marketing-dimmed',
        style: {
          'opacity': 0.1
        }
      },
      {
        selector: 'edge.marketing-active',
        style: {
          'width': 4,
          'line-color': '#4db6ac',
          'target-arrow-color': '#4db6ac',
          'opacity': 1,
          'line-style': 'dashed',
          'line-dash-pattern': [8, 4],
          'z-index': 999
        }
      },
      {
        selector: 'node.marketing-complete',
        style: {
          'opacity': 1,
          'border-width': 3,
          'border-color': '#4db6ac'
        }
      },
      {
        selector: 'edge.marketing-complete',
        style: {
          'opacity': 0.8,
          'width': 3,
          'line-style': 'solid',
          'line-color': '#4db6ac',
          'target-arrow-color': '#4db6ac'
        }
      }
    ];

    return [...baseStyles, ...marketingStyles];
  }

  getDefaultStyles() {
    return [
      {
        selector: 'node',
        style: {
          'background-color': '#7986cb',
          'label': 'data(label)',
          'color': '#e8e8f0',
          'text-valign': 'center',
          'text-halign': 'center',
          'font-size': '11px',
          'font-family': 'Inter, sans-serif',
          'text-wrap': 'wrap',
          'text-max-width': '80px',
          'width': 'label',
          'height': 'label',
          'padding': '12px',
          'shape': 'roundrectangle',
          'border-width': 2,
          'border-color': '#5c6bc0'
        }
      },
      {
        selector: 'node[type="concept"]',
        style: { 'background-color': '#4db6ac', 'border-color': '#26a69a' }
      },
      {
        selector: 'node[type="example"]',
        style: { 'background-color': '#66bb6a', 'border-color': '#43a047' }
      },
      {
        selector: 'node[type="service"]',
        style: { 'background-color': '#7986cb', 'border-color': '#5c6bc0' }
      },
      {
        selector: 'node[type="external"]',
        style: { 'background-color': '#ef5350', 'border-color': '#e53935' }
      },
      {
        selector: 'node[type="data"]',
        style: { 'background-color': '#42a5f5', 'border-color': '#1e88e5' }
      },
      {
        selector: 'edge',
        style: {
          'width': 2,
          'line-color': '#7986cb',
          'target-arrow-color': '#7986cb',
          'target-arrow-shape': 'triangle',
          'curve-style': 'bezier',
          'opacity': 0.6
        }
      }
    ];
  }

  showAllDimmed() {
    this.cy.nodes().addClass('marketing-dimmed');
    this.cy.edges().addClass('marketing-dimmed');
  }

  showAllComplete() {
    this.cy.elements().removeClass('marketing-dimmed marketing-active');
    this.cy.elements().addClass('marketing-complete');
  }

  resetDiagram() {
    this.cy.elements().removeClass('marketing-dimmed marketing-active marketing-complete');
    this.showAllDimmed();
    this.currentStep = -1;
    this.clearAnimations();
    this.updateCaption(null);
  }

  setupScrollTrigger() {
    const container = document.getElementById(this.containerId);
    const wrapper = container?.closest('.marketing-diagram-wrapper');
    const target = wrapper || container;

    if (!target) return;

    this.observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting && !this.isPlaying) {
          // Small delay for smoother experience
          setTimeout(() => this.play(), 300);
        } else if (!entry.isIntersecting && this.isPlaying) {
          this.stop();
        }
      });
    }, { threshold: 0.4 });

    this.observer.observe(target);
  }

  setupAudioToggle() {
    const wrapper = document.getElementById(this.containerId)?.closest('.marketing-diagram-wrapper');
    const toggle = wrapper?.querySelector('.audio-toggle');
    
    if (toggle) {
      toggle.addEventListener('click', () => {
        this.audioMuted = !this.audioMuted;
        this.updateAudioToggleUI(toggle);
        if (this.audioEngine) {
          this.audioEngine.setMuted(this.audioMuted);
        }
      });
      this.updateAudioToggleUI(toggle);
    }
  }

  updateAudioToggleUI(toggle) {
    if (this.audioMuted) {
      toggle.classList.add('muted');
      toggle.textContent = '🔇';
      toggle.title = 'Enable audio';
    } else {
      toggle.classList.remove('muted');
      toggle.textContent = '🔊';
      toggle.title = 'Mute audio';
    }
  }

  updateCaption(step) {
    const wrapper = document.getElementById(this.containerId)?.closest('.marketing-diagram-wrapper');
    const captionEl = wrapper?.querySelector('.marketing-caption');
    
    if (!captionEl) return;

    if (!step) {
      captionEl.style.opacity = '0';
      return;
    }

    // Fade out
    captionEl.style.opacity = '0';
    
    setTimeout(() => {
      captionEl.textContent = step.caption || step.narration || '';
      captionEl.style.opacity = '1';
    }, 150);
  }

  async play() {
    if (this.isPlaying) return;
    
    this.isPlaying = true;
    this.shouldStop = false;

    do {
      // Reset for each loop
      this.resetDiagram();
      await this.wait(300);

      // Play through all steps
      for (let i = 0; i < this.steps.length; i++) {
        if (this.shouldStop) break;
        
        this.currentStep = i;
        await this.playStep(this.steps[i], i);
        
        if (this.shouldStop) break;
        
        // Pause between steps (not after last)
        if (i < this.steps.length - 1) {
          await this.wait(this.options.pauseBetweenSteps);
        }
      }

      if (this.shouldStop) break;

      // Mark as complete
      this.showAllComplete();
      this.hasPlayedOnce = true;

      // Loop delay before restart
      if (this.options.loop) {
        await this.wait(this.options.loopDelay);
      }

    } while (this.options.loop && !this.shouldStop);

    this.isPlaying = false;
  }

  async playStep(step, stepIndex) {
    // Update caption
    this.updateCaption(step);

    // Highlight node
    if (step.nodeId) {
      const node = this.cy.getElementById(step.nodeId);
      if (node.length) {
        node.removeClass('marketing-dimmed').addClass('marketing-active');
        this.animateNodeGlow(node);
      }
    }

    // Animate edges
    if (step.edges && step.edges.length > 0) {
      for (const edgeSpec of step.edges) {
        const edge = this.cy.edges().filter(e => 
          e.source().id() === edgeSpec.from && e.target().id() === edgeSpec.to
        );
        
        if (edge.length) {
          edge.removeClass('marketing-dimmed').addClass('marketing-active');
          this.animateEdgeFlow(edge);
          
          // Also show source node as complete
          const sourceNode = this.cy.getElementById(edgeSpec.from);
          if (sourceNode.length && !sourceNode.hasClass('marketing-active')) {
            sourceNode.removeClass('marketing-dimmed').addClass('marketing-complete');
          }
        }
      }
    }

    // Play audio if enabled
    if (!this.audioMuted && this.audioEngine && step.narration) {
      await this.narrateStep(step, stepIndex);
    } else {
      // Wait for step duration
      await this.wait(this.options.stepDuration);
    }

    // Cleanup step
    this.cleanupStep(step);
  }

  cleanupStep(step) {
    if (step.nodeId) {
      const node = this.cy.getElementById(step.nodeId);
      node.removeClass('marketing-active').addClass('marketing-complete');
    }

    if (step.edges) {
      step.edges.forEach(edgeSpec => {
        const edge = this.cy.edges().filter(e => 
          e.source().id() === edgeSpec.from && e.target().id() === edgeSpec.to
        );
        edge.removeClass('marketing-active').addClass('marketing-complete');
      });
    }

    this.clearAnimations();
  }

  animateNodeGlow(node) {
    // Pulsing border effect
    let glowIntensity = 0;
    const glowAnim = setInterval(() => {
      glowIntensity = (glowIntensity + 0.1) % (Math.PI * 2);
      const intensity = Math.sin(glowIntensity) * 0.5 + 0.5;
      const width = 3 + intensity * 3;
      node.style('border-width', width);
    }, 50);
    
    this.activeAnimations.push(glowAnim);
  }

  animateEdgeFlow(edge) {
    let dashOffset = 0;
    const flowAnim = setInterval(() => {
      dashOffset = (dashOffset + 2) % 24;
      edge.style('line-dash-offset', -dashOffset);
    }, 30);
    
    this.activeAnimations.push(flowAnim);
  }

  clearAnimations() {
    this.activeAnimations.forEach(anim => clearInterval(anim));
    this.activeAnimations = [];
  }

  async narrateStep(step, stepIndex) {
    if (!this.audioEngine) return;
    
    try {
      await this.audioEngine.playStep(this.story.id, stepIndex);
    } catch (e) {
      // Audio failed, fall back to duration-based timing
      await this.wait(this.options.stepDuration);
    }
  }

  stop() {
    this.shouldStop = true;
    this.isPlaying = false;
    this.clearAnimations();
    if (this.audioEngine) {
      this.audioEngine.stop();
    }
  }

  destroy() {
    this.stop();
    if (this.observer) {
      this.observer.disconnect();
    }
    if (this.cy) {
      this.cy.destroy();
    }
  }

  wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Static factory method for easy initialization
  static init(containerId, story, options = {}) {
    return new MarketingDiagram(containerId, story, options);
  }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = MarketingDiagram;
} else if (typeof window !== 'undefined') {
  window.MarketingDiagram = MarketingDiagram;
}
