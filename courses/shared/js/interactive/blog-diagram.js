/**
 * BlogDiagram - Inline animated diagrams for blog posts
 *
 * Optimized for:
 *   - Smaller canvas (400x300px for inline placement)
 *   - Auto-plays once when scrolled into view
 *   - Replay button for re-watching
 *   - Caption text synced with narration
 *   - Works inline with article text
 *   - 1-2 step mini-stories
 *   - Audio narration ENABLED by default with voice selector
 *
 * Dependencies:
 *   - Cytoscape.js
 *   - Anime.js
 *   - DiagramUtils (diagram-utils.js)
 *   - AudioNarrationEngine (audio-engine.js)
 */

class BlogDiagram {
  constructor(containerId, story, options = {}) {
    this.containerId = containerId;
    this.story = story;
    this.elements = story.elements || [];
    this.steps = story.steps || [];
    this.options = {
      autoPlay: true,
      loop: false,
      stepDuration: 2000,
      pauseBetweenSteps: 300,
      audioEnabled: true, // AUDIO ENABLED BY DEFAULT
      audioMutedByDefault: false, // Start unmuted
      audioBasePath: "audio",
      canvasWidth: 400,
      canvasHeight: 300,
      showReplayButton: true,
      showVoiceSelector: true, // Show voice selector by default
      ...options,
    };

    this.cy = null;
    this.currentStep = -1;
    this.isPlaying = false;
    this.shouldStop = false;
    this.hasPlayed = false;
    this.observer = null;
    this.activeAnimations = [];
    this.audioEngine = options.audioEngine || null;
    this.audioMuted = this.options.audioMutedByDefault;
    this.storyId = options.storyId || story.id;

    this.init();
  }

  init() {
    const container = document.getElementById(this.containerId);
    if (!container) {
      console.error(`BlogDiagram: Container '${this.containerId}' not found`);
      return;
    }

    // Set container dimensions
    container.style.width = `${this.options.canvasWidth}px`;
    container.style.height = `${this.options.canvasHeight}px`;
    container.style.maxWidth = "100%";

    // Create Cytoscape instance
    this.cy = this.createDiagram();
    if (!this.cy) return;

    // Initial state: all dimmed
    this.showAllDimmed();

    // Setup replay button if present
    this.setupReplayButton();

    // Setup audio controls if present
    this.setupAudioControls();

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
        name: "dagre",
        rankDir: "LR",
        nodeSep: 40,
        rankSep: 60,
        padding: 30,
      },
      minZoom: 0.5,
      maxZoom: 2,
      userZoomingEnabled: false,
      userPanningEnabled: false,
      boxSelectionEnabled: false,
      autoungrabify: true,
    });

    // Fit after layout
    setTimeout(() => cy.fit(20), 100);

    return cy;
  }

  getStylesheet() {
    const baseStyles =
      typeof DiagramUtils !== "undefined"
        ? DiagramUtils.getBaseStylesheet()
        : this.getDefaultStyles();

    // Blog-specific animation styles with smaller fonts for inline display
    const blogStyles = [
      {
        selector: "node",
        style: {
          "font-size": "10px",
          "text-max-width": "70px",
          padding: "10px",
        },
      },
      {
        selector: "node.blog-active",
        style: {
          "border-width": 3,
          "border-color": "#4db6ac",
          opacity: 1,
          "z-index": 999,
        },
      },
      {
        selector: "node.blog-dimmed",
        style: {
          opacity: 0.3,
        },
      },
      {
        selector: "edge.blog-dimmed",
        style: {
          opacity: 0.15,
        },
      },
      {
        selector: "edge.blog-active",
        style: {
          width: 3,
          "line-color": "#4db6ac",
          "target-arrow-color": "#4db6ac",
          opacity: 1,
          "line-style": "dashed",
          "line-dash-pattern": [6, 3],
          "z-index": 999,
        },
      },
      {
        selector: "node.blog-complete",
        style: {
          opacity: 1,
          "border-width": 2,
          "border-color": "#4db6ac",
        },
      },
      {
        selector: "edge.blog-complete",
        style: {
          opacity: 0.8,
          width: 2,
          "line-style": "solid",
          "line-color": "#4db6ac",
          "target-arrow-color": "#4db6ac",
        },
      },
    ];

    return [...baseStyles, ...blogStyles];
  }

  getDefaultStyles() {
    return [
      {
        selector: "node",
        style: {
          "background-color": "#7986cb",
          label: "data(label)",
          color: "#e8e8f0",
          "text-valign": "center",
          "text-halign": "center",
          "font-size": "10px",
          "font-family": "Inter, sans-serif",
          "text-wrap": "wrap",
          "text-max-width": "70px",
          width: "label",
          height: "label",
          padding: "10px",
          shape: "roundrectangle",
          "border-width": 2,
          "border-color": "#5c6bc0",
        },
      },
      {
        selector: 'node[type="concept"]',
        style: { "background-color": "#4db6ac", "border-color": "#26a69a" },
      },
      {
        selector: 'node[type="example"]',
        style: { "background-color": "#66bb6a", "border-color": "#43a047" },
      },
      {
        selector: 'node[type="service"]',
        style: { "background-color": "#7986cb", "border-color": "#5c6bc0" },
      },
      {
        selector: 'node[type="external"]',
        style: { "background-color": "#ef5350", "border-color": "#e53935" },
      },
      {
        selector: 'node[type="data"]',
        style: { "background-color": "#42a5f5", "border-color": "#1e88e5" },
      },
      {
        selector: "edge",
        style: {
          width: 2,
          "line-color": "#7986cb",
          "target-arrow-color": "#7986cb",
          "target-arrow-shape": "triangle",
          "curve-style": "bezier",
          opacity: 0.6,
        },
      },
    ];
  }

  showAllDimmed() {
    this.cy.nodes().addClass("blog-dimmed");
    this.cy.edges().addClass("blog-dimmed");
  }

  showAllComplete() {
    this.cy.elements().removeClass("blog-dimmed blog-active");
    this.cy.elements().addClass("blog-complete");
  }

  resetDiagram() {
    this.cy.elements().removeClass("blog-dimmed blog-active blog-complete");
    this.showAllDimmed();
    this.currentStep = -1;
    this.clearAnimations();
    this.updateCaption(null);
  }

  setupScrollTrigger() {
    const container = document.getElementById(this.containerId);
    const wrapper = container?.closest(".blog-diagram-container");
    const target = wrapper || container;

    if (!target) return;

    this.observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !this.hasPlayed && !this.isPlaying) {
            // Small delay for smoother experience
            setTimeout(() => this.play(), 400);
          }
        });
      },
      { threshold: 0.5 }
    );

    this.observer.observe(target);
  }

  setupReplayButton() {
    const wrapper = document
      .getElementById(this.containerId)
      ?.closest(".blog-diagram-container");
    const replayBtn = wrapper?.querySelector(".replay-btn");

    if (replayBtn) {
      replayBtn.addEventListener("click", () => {
        if (!this.isPlaying) {
          this.hasPlayed = false;
          this.play();
        }
      });
    }
  }

  setupAudioControls() {
    const wrapper = document
      .getElementById(this.containerId)
      ?.closest(".blog-diagram-container");

    // Audio toggle
    const audioToggle = wrapper?.querySelector(".audio-toggle");
    if (audioToggle) {
      audioToggle.addEventListener("click", () => {
        this.audioMuted = !this.audioMuted;
        this.updateAudioToggleUI(audioToggle);
        if (this.audioEngine) {
          this.audioEngine.setMuted(this.audioMuted);
        }
      });
      this.updateAudioToggleUI(audioToggle);
    }

    // Voice selector - populate with available voices
    this.voiceSelect = wrapper?.querySelector(".voice-select");
    if (this.voiceSelect && this.audioEngine) {
      this.populateVoices();
      this.voiceSelect.addEventListener("change", (e) => {
        this.audioEngine.setVoice(e.target.value);
      });
    }
  }

  populateVoices() {
    if (!this.voiceSelect || !this.audioEngine) return;

    const tryPopulate = () => {
      const voices = this.audioEngine.getVoices();
      if (voices.length === 0) {
        // Retry after manifest loads
        setTimeout(tryPopulate, 100);
        return;
      }

      this.voiceSelect.innerHTML = voices
        .map(
          (v, i) =>
            `<option value="${v.id}" ${i === 0 ? "selected" : ""}>${
              v.label
            }</option>`
        )
        .join("");
    };

    tryPopulate();
  }

  updateAudioToggleUI(toggle) {
    if (!this.audioMuted) {
      toggle.classList.remove("muted");
      toggle.textContent = "🔊";
      toggle.title = "Mute audio";
    } else {
      toggle.classList.add("muted");
      toggle.textContent = "🔇";
      toggle.title = "Enable audio";
    }
  }

  updateCaption(step) {
    const wrapper = document
      .getElementById(this.containerId)
      ?.closest(".blog-diagram-container");
    const captionEl = wrapper?.querySelector(".diagram-caption");

    if (!captionEl) return;

    if (!step) {
      captionEl.style.opacity = "0";
      return;
    }

    // Fade out, update, fade in
    captionEl.style.opacity = "0";

    setTimeout(() => {
      captionEl.textContent = step.caption || step.narration || "";
      captionEl.style.opacity = "1";
    }, 150);
  }

  async play() {
    if (this.isPlaying) return;

    this.isPlaying = true;
    this.shouldStop = false;

    // Reset for fresh play
    this.resetDiagram();
    await this.wait(200);

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

    if (!this.shouldStop) {
      // Mark as complete
      this.showAllComplete();
      this.hasPlayed = true;

      // Final caption (use last step's caption)
      const lastStep = this.steps[this.steps.length - 1];
      if (lastStep) {
        this.updateCaption(lastStep);
      }
    }

    this.isPlaying = false;
  }

  async playStep(step, stepIndex) {
    // Update caption
    this.updateCaption(step);

    // Highlight node
    if (step.nodeId) {
      const node = this.cy.getElementById(step.nodeId);
      if (node.length) {
        node.removeClass("blog-dimmed").addClass("blog-active");
        this.animateNodeGlow(node);
      }
    }

    // Animate edges
    if (step.edges && step.edges.length > 0) {
      for (const edgeSpec of step.edges) {
        const edge = this.cy
          .edges()
          .filter(
            (e) =>
              e.source().id() === edgeSpec.from &&
              e.target().id() === edgeSpec.to
          );

        if (edge.length) {
          edge.removeClass("blog-dimmed").addClass("blog-active");
          this.animateEdgeFlow(edge);

          // Also show source node as complete
          const sourceNode = this.cy.getElementById(edgeSpec.from);
          if (sourceNode.length && !sourceNode.hasClass("blog-active")) {
            sourceNode.removeClass("blog-dimmed").addClass("blog-complete");
          }
        }
      }
    }

    // Play audio if enabled and not muted
    if (this.options.audioEnabled && !this.audioMuted && this.audioEngine) {
      await this.narrateStep(step, stepIndex);
    } else {
      // Wait for step duration (longer when no audio)
      await this.wait(this.options.stepDuration);
    }

    // Cleanup step
    this.cleanupStep(step);
  }

  cleanupStep(step) {
    if (step.nodeId) {
      const node = this.cy.getElementById(step.nodeId);
      node.removeClass("blog-active").addClass("blog-complete");
    }

    if (step.edges) {
      step.edges.forEach((edgeSpec) => {
        const edge = this.cy
          .edges()
          .filter(
            (e) =>
              e.source().id() === edgeSpec.from &&
              e.target().id() === edgeSpec.to
          );
        edge.removeClass("blog-active").addClass("blog-complete");
      });
    }

    this.clearAnimations();
  }

  animateNodeGlow(node) {
    // Pulsing border effect
    let glowIntensity = 0;
    const glowAnim = setInterval(() => {
      if (this.shouldStop) {
        clearInterval(glowAnim);
        return;
      }
      glowIntensity = (glowIntensity + 0.15) % (Math.PI * 2);
      const intensity = Math.sin(glowIntensity) * 0.5 + 0.5;
      const width = 2 + intensity * 2;
      node.style("border-width", width);
    }, 50);

    this.activeAnimations.push(glowAnim);
  }

  animateEdgeFlow(edge) {
    let dashOffset = 0;
    const flowAnim = setInterval(() => {
      if (this.shouldStop) {
        clearInterval(flowAnim);
        return;
      }
      dashOffset = (dashOffset + 2) % 18;
      edge.style("line-dash-offset", -dashOffset);
    }, 40);

    this.activeAnimations.push(flowAnim);
  }

  clearAnimations() {
    this.activeAnimations.forEach((anim) => clearInterval(anim));
    this.activeAnimations = [];
  }

  async narrateStep(step, stepIndex) {
    if (!this.audioEngine) return;

    try {
      await this.audioEngine.playStep(this.storyId, stepIndex);
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
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // Static factory method for easy initialization
  static init(containerId, story, options = {}) {
    return new BlogDiagram(containerId, story, options);
  }

  // Static method to replay a specific diagram by ID
  static replay(containerId) {
    const container = document.getElementById(containerId);
    if (container && container._blogDiagram) {
      container._blogDiagram.hasPlayed = false;
      container._blogDiagram.play();
    }
  }

  // Store reference on container for static access
  storeReference() {
    const container = document.getElementById(this.containerId);
    if (container) {
      container._blogDiagram = this;
    }
  }
}

// Auto-store reference after initialization
const originalInit = BlogDiagram.init;
BlogDiagram.init = function (containerId, story, options = {}) {
  const instance = new BlogDiagram(containerId, story, options);
  instance.storeReference();
  return instance;
};

// Export
if (typeof module !== "undefined" && module.exports) {
  module.exports = BlogDiagram;
} else if (typeof window !== "undefined") {
  window.BlogDiagram = BlogDiagram;
}
