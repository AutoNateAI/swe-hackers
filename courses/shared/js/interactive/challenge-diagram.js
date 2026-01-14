/**
 * ChallengeDiagram - Challenge intro diagrams with click-to-play interaction
 * 
 * Designed for challenge introduction videos that:
 *   - Set up the mental model before a challenge
 *   - Use click-to-play (not auto-play)
 *   - Have audio enabled by default for immersion
 *   - Support voice selection
 *   - Display 2-step mini-stories
 * 
 * Dependencies:
 *   - Cytoscape.js
 *   - Anime.js
 *   - DiagramUtils (diagram-utils.js)
 *   - AudioNarrationEngine (audio-engine.js)
 */

class ChallengeDiagram {
  constructor(containerId, story, options = {}) {
    this.containerId = containerId;
    this.story = story;
    this.elements = story.elements || [];
    this.steps = story.steps || [];
    this.options = {
      autoPlay: false, // Challenges use click-to-play
      loop: false,
      stepDuration: 3000,
      pauseBetweenSteps: 500,
      audioEnabled: true, // Audio ON by default for challenge intros
      audioBasePath: 'audio',
      canvasHeight: 250,
      ...options
    };
    
    this.cy = null;
    this.currentStep = -1;
    this.isPlaying = false;
    this.hasPlayed = false;
    this.shouldStop = false;
    this.activeAnimations = [];
    this.audioEngine = options.audioEngine || null;
    
    this.init();
  }

  init() {
    const container = document.getElementById(this.containerId);
    if (!container) {
      console.error(`ChallengeDiagram: Container '${this.containerId}' not found`);
      return;
    }

    // Set container height
    container.style.height = `${this.options.canvasHeight}px`;

    // Create Cytoscape instance
    this.cy = this.createDiagram();
    if (!this.cy) return;

    // Initial state: all dimmed
    this.showAllDimmed();

    // Setup play overlay
    this.setupPlayOverlay();
    
    // Setup voice selector
    this.setupVoiceSelector();
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
        nodeSep: 50,
        rankSep: 80,
        padding: 30
      },
      minZoom: 0.5,
      maxZoom: 2,
      userZoomingEnabled: false,
      userPanningEnabled: false,
      boxSelectionEnabled: false
    });

    // Fit after layout
    setTimeout(() => cy.fit(20), 100);

    return cy;
  }

  getStylesheet() {
    const baseStyles = typeof DiagramUtils !== 'undefined' 
      ? DiagramUtils.getBaseStylesheet() 
      : this.getDefaultStyles();

    // Challenge-specific animation styles
    const challengeStyles = [
      {
        selector: 'node',
        style: {
          'font-size': '10px',
          'text-max-width': '70px',
          'padding': '10px'
        }
      },
      {
        selector: 'node.challenge-active',
        style: {
          'border-width': 4,
          'border-color': '#ffd54f',
          'opacity': 1,
          'z-index': 999
        }
      },
      {
        selector: 'node.challenge-dimmed',
        style: {
          'opacity': 0.25
        }
      },
      {
        selector: 'edge.challenge-dimmed',
        style: {
          'opacity': 0.1
        }
      },
      {
        selector: 'edge.challenge-active',
        style: {
          'width': 4,
          'line-color': '#ffd54f',
          'target-arrow-color': '#ffd54f',
          'opacity': 1,
          'line-style': 'dashed',
          'line-dash-pattern': [8, 4],
          'z-index': 999
        }
      },
      {
        selector: 'node.challenge-complete',
        style: {
          'opacity': 1,
          'border-width': 3,
          'border-color': '#4db6ac'
        }
      },
      {
        selector: 'edge.challenge-complete',
        style: {
          'opacity': 0.8,
          'width': 3,
          'line-style': 'solid',
          'line-color': '#4db6ac',
          'target-arrow-color': '#4db6ac'
        }
      }
    ];

    return [...baseStyles, ...challengeStyles];
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
          'font-size': '10px',
          'font-family': 'Inter, sans-serif',
          'text-wrap': 'wrap',
          'text-max-width': '70px',
          'width': 'label',
          'height': 'label',
          'padding': '10px',
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
    this.cy.nodes().addClass('challenge-dimmed');
    this.cy.edges().addClass('challenge-dimmed');
  }

  showAllComplete() {
    this.cy.elements().removeClass('challenge-dimmed challenge-active');
    this.cy.elements().addClass('challenge-complete');
  }

  resetDiagram() {
    this.cy.elements().removeClass('challenge-dimmed challenge-active challenge-complete');
    this.showAllDimmed();
    this.currentStep = -1;
    this.clearAnimations();
    this.updateCaption(null);
  }

  setupPlayOverlay() {
    const wrapper = document.getElementById(this.containerId)?.closest('.challenge-intro-container');
    if (!wrapper) return;
    
    let overlay = wrapper.querySelector('.play-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.className = 'play-overlay';
      overlay.innerHTML = `
        <button class="play-intro-btn">
          <span class="play-icon">▶</span>
          <span class="play-text">Watch Intro</span>
        </button>
      `;
      wrapper.appendChild(overlay);
    }
    
    this.playOverlay = overlay;
    
    const playBtn = overlay.querySelector('.play-intro-btn');
    if (playBtn) {
      playBtn.addEventListener('click', () => this.play());
    }
  }

  setupVoiceSelector() {
    const wrapper = document.getElementById(this.containerId)?.closest('.challenge-intro-container');
    if (!wrapper) return;
    
    const voiceSelect = wrapper.querySelector('.voice-select');
    if (voiceSelect && this.audioEngine) {
      // Populate voices
      this.populateVoices(voiceSelect);
      
      voiceSelect.addEventListener('change', (e) => {
        if (this.audioEngine) {
          this.audioEngine.setVoice(e.target.value);
        }
      });
    }
  }

  populateVoices(selectEl) {
    const tryPopulate = () => {
      if (!this.audioEngine) return;
      
      const voices = this.audioEngine.getVoices();
      if (voices.length === 0) {
        setTimeout(tryPopulate, 100);
        return;
      }

      selectEl.innerHTML = voices
        .map((v, i) => `<option value="${v.id}" ${i === 0 ? 'selected' : ''}>${v.label}</option>`)
        .join('');
    };
    
    tryPopulate();
  }

  updateCaption(step) {
    const wrapper = document.getElementById(this.containerId)?.closest('.challenge-intro-container');
    const captionEl = wrapper?.querySelector('.challenge-caption');
    
    if (!captionEl) return;

    if (!step) {
      captionEl.style.opacity = '0';
      captionEl.textContent = '';
      return;
    }

    // Fade out
    captionEl.style.opacity = '0';
    
    setTimeout(() => {
      captionEl.textContent = step.caption || step.narration || '';
      captionEl.style.opacity = '1';
    }, 150);
  }

  hidePlayOverlay() {
    if (this.playOverlay) {
      this.playOverlay.classList.add('hidden');
    }
  }

  showPlayOverlay() {
    if (this.playOverlay) {
      this.playOverlay.classList.remove('hidden');
      const playText = this.playOverlay.querySelector('.play-text');
      if (playText) {
        playText.textContent = this.hasPlayed ? 'Replay Intro' : 'Watch Intro';
      }
    }
  }

  async play() {
    if (this.isPlaying) return;
    
    this.isPlaying = true;
    this.shouldStop = false;
    this.hidePlayOverlay();

    // Reset for playback
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

    // Mark as complete
    if (!this.shouldStop) {
      this.showAllComplete();
      this.hasPlayed = true;
    }

    this.isPlaying = false;
    
    // Show replay button after delay
    setTimeout(() => this.showPlayOverlay(), 1500);
  }

  async playStep(step, stepIndex) {
    // Update caption
    this.updateCaption(step);

    // Highlight node
    if (step.nodeId) {
      const node = this.cy.getElementById(step.nodeId);
      if (node.length) {
        node.removeClass('challenge-dimmed').addClass('challenge-active');
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
          edge.removeClass('challenge-dimmed').addClass('challenge-active');
          this.animateEdgeFlow(edge);
          
          // Also show source node as complete
          const sourceNode = this.cy.getElementById(edgeSpec.from);
          if (sourceNode.length && !sourceNode.hasClass('challenge-active')) {
            sourceNode.removeClass('challenge-dimmed').addClass('challenge-complete');
          }
        }
      }
    }

    // Play audio if enabled
    if (this.options.audioEnabled && this.audioEngine && step.narration) {
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
      node.removeClass('challenge-active').addClass('challenge-complete');
    }

    if (step.edges) {
      step.edges.forEach(edgeSpec => {
        const edge = this.cy.edges().filter(e => 
          e.source().id() === edgeSpec.from && e.target().id() === edgeSpec.to
        );
        edge.removeClass('challenge-active').addClass('challenge-complete');
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
    this.showPlayOverlay();
  }

  destroy() {
    this.stop();
    if (this.cy) {
      this.cy.destroy();
    }
  }

  wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Static factory method for easy initialization
  static init(containerId, story, options = {}) {
    return new ChallengeDiagram(containerId, story, options);
  }

  // Static method to replay a specific diagram
  static replay(containerId) {
    const container = document.getElementById(containerId);
    if (container && container._challengeDiagram) {
      container._challengeDiagram.play();
    }
  }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ChallengeDiagram;
} else if (typeof window !== 'undefined') {
  window.ChallengeDiagram = ChallengeDiagram;
}
