/**
 * Basketball Court Renderer (Cytoscape.js)
 *
 * Renders a half-court with players as nodes, play paths as edges.
 * Handles coordinate mapping, player dragging, and viewport management.
 *
 * Court coordinates (public API): x = 0-50, y = 0-47 (baseline to half-court)
 * Model coordinates (internal): x = 0-500, y = 0-470 (10x scale to match SVG)
 */

const CourtRenderer = {

  _cy: null,
  _container: null,
  _svgContainer: null,
  _onPlayerMoved: null,
  _resizeObserver: null,

  // Scale factor: model coords = court coords * SCALE
  SCALE: 10,

  // Court dims in feet (public API uses these)
  COURT_W: 50,
  COURT_H: 47,

  // Padding in model units (matches SVG viewBox padding of 5)
  PADDING: 5,

  /**
   * Initialize the court renderer
   */
  init(cyContainerId, svgContainerId) {
    this._container = document.getElementById(cyContainerId);
    this._svgContainer = document.getElementById(svgContainerId);

    if (!this._container) {
      console.error('Court container not found:', cyContainerId);
      return;
    }

    this._drawCourtSVG();
    this._initCytoscape();
    this._setupResize();

    console.log('Court renderer initialized');
  },

  /**
   * Draw the basketball court SVG
   */
  _drawCourtSVG() {
    if (!this._svgContainer) return;

    this._svgContainer.innerHTML = `
      <svg viewBox="-5 -5 510 480" preserveAspectRatio="xMidYMid meet" class="court-svg">
        <defs>
          <pattern id="wood" patternUnits="userSpaceOnUse" width="40" height="40">
            <rect width="40" height="40" fill="#2a1f14"/>
            <rect x="0" y="0" width="20" height="40" fill="#2d2116" opacity="0.3"/>
            <line x1="0" y1="10" x2="40" y2="10" stroke="#1e1509" stroke-width="0.5" opacity="0.2"/>
            <line x1="0" y1="30" x2="40" y2="30" stroke="#1e1509" stroke-width="0.5" opacity="0.2"/>
          </pattern>
          <linearGradient id="floorGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#3d2b1a"/>
            <stop offset="100%" stop-color="#2a1f14"/>
          </linearGradient>
        </defs>

        <!-- Court floor -->
        <rect x="0" y="0" width="500" height="470" rx="4" fill="url(#floorGrad)"/>
        <rect x="0" y="0" width="500" height="470" rx="4" fill="url(#wood)" opacity="0.6"/>

        <!-- Court boundary -->
        <rect x="0" y="0" width="500" height="470" rx="4"
              fill="none" stroke="rgba(255,255,255,0.5)" stroke-width="3"/>

        <!-- Key / Paint area -->
        <rect x="170" y="0" width="160" height="190"
              fill="rgba(139,69,19,0.15)" stroke="rgba(255,255,255,0.4)" stroke-width="2"/>

        <!-- Free throw circle -->
        <circle cx="250" cy="190" r="60"
                fill="none" stroke="rgba(255,255,255,0.4)" stroke-width="2"/>

        <!-- Free throw lane hash marks (left) -->
        <line x1="155" y1="70" x2="170" y2="70" stroke="rgba(255,255,255,0.3)" stroke-width="2"/>
        <line x1="155" y1="110" x2="170" y2="110" stroke="rgba(255,255,255,0.3)" stroke-width="2"/>
        <line x1="155" y1="140" x2="170" y2="140" stroke="rgba(255,255,255,0.3)" stroke-width="2"/>
        <line x1="155" y1="160" x2="170" y2="160" stroke="rgba(255,255,255,0.3)" stroke-width="2"/>

        <!-- Free throw lane hash marks (right) -->
        <line x1="330" y1="70" x2="345" y2="70" stroke="rgba(255,255,255,0.3)" stroke-width="2"/>
        <line x1="330" y1="110" x2="345" y2="110" stroke="rgba(255,255,255,0.3)" stroke-width="2"/>
        <line x1="330" y1="140" x2="345" y2="140" stroke="rgba(255,255,255,0.3)" stroke-width="2"/>
        <line x1="330" y1="160" x2="345" y2="160" stroke="rgba(255,255,255,0.3)" stroke-width="2"/>

        <!-- Three-point line -->
        <path d="M 30 0 L 30 142 A 237.5 237.5 0 0 0 470 142 L 470 0"
              fill="none" stroke="rgba(255,255,255,0.4)" stroke-width="2"/>

        <!-- Restricted area arc -->
        <path d="M 210 0 A 40 40 0 0 0 290 0"
              fill="none" stroke="rgba(255,255,255,0.3)" stroke-width="1.5"/>

        <!-- Backboard -->
        <line x1="220" y1="43" x2="280" y2="43"
              stroke="rgba(255,255,255,0.6)" stroke-width="3"/>

        <!-- Rim -->
        <circle cx="250" cy="52.5" r="7.5"
                fill="none" stroke="#ff6b35" stroke-width="2.5"/>

        <!-- Net suggestion -->
        <line x1="244" y1="55" x2="246" y2="62" stroke="rgba(255,255,255,0.15)" stroke-width="1"/>
        <line x1="250" y1="55" x2="250" y2="63" stroke="rgba(255,255,255,0.15)" stroke-width="1"/>
        <line x1="256" y1="55" x2="254" y2="62" stroke="rgba(255,255,255,0.15)" stroke-width="1"/>

        <!-- Half-court line -->
        <line x1="0" y1="470" x2="500" y2="470"
              stroke="rgba(255,255,255,0.5)" stroke-width="3"/>

        <!-- Half-court circle (partial arc) -->
        <path d="M 190 470 A 60 60 0 0 1 310 470"
              fill="none" stroke="rgba(255,255,255,0.4)" stroke-width="2"/>

        <!-- Center circle dot -->
        <circle cx="250" cy="470" r="3" fill="rgba(255,255,255,0.3)"/>

        <!-- Baseline text -->
        <text x="250" y="465" text-anchor="middle"
              fill="rgba(255,255,255,0.08)" font-size="60" font-family="sans-serif" font-weight="bold">
          CITY HIGH
        </text>
      </svg>
    `;
  },

  /**
   * Initialize Cytoscape instance
   */
  _initCytoscape() {
    this._cy = cytoscape({
      container: this._container,
      style: [
        // Offense players (red)
        {
          selector: 'node.offense',
          style: {
            'background-color': '#ef4444',
            'border-color': '#dc2626',
            'border-width': 2,
            'width': 28,
            'height': 28,
            'label': 'data(label)',
            'color': '#fff',
            'text-valign': 'center',
            'text-halign': 'center',
            'font-size': '11px',
            'font-weight': 'bold',
            'font-family': 'Inter, sans-serif',
            'text-outline-width': 0,
            'overlay-opacity': 0,
            'z-index': 10
          }
        },
        // Defense players (blue)
        {
          selector: 'node.defense',
          style: {
            'background-color': '#3b82f6',
            'border-color': '#2563eb',
            'border-width': 2,
            'width': 28,
            'height': 28,
            'label': 'data(label)',
            'color': '#fff',
            'text-valign': 'center',
            'text-halign': 'center',
            'font-size': '11px',
            'font-weight': 'bold',
            'font-family': 'Inter, sans-serif',
            'text-outline-width': 0,
            'overlay-opacity': 0,
            'z-index': 10
          }
        },
        // Ball
        {
          selector: 'node.ball',
          style: {
            'background-color': '#f97316',
            'border-color': '#92400e',
            'border-width': 1.5,
            'width': 14,
            'height': 14,
            'shape': 'ellipse',
            'overlay-opacity': 0,
            'z-index': 20,
            'label': '',
            'events': 'no'
          }
        },
        // Selected node
        {
          selector: 'node:selected',
          style: {
            'border-color': '#fbbf24',
            'border-width': 3,
            'z-index': 30
          }
        },
        // Grabbed node
        {
          selector: 'node:grabbed',
          style: {
            'border-color': '#fbbf24',
            'border-width': 3,
            'overlay-opacity': 0.1,
            'overlay-color': '#fbbf24'
          }
        },
        // Play path edges (cut/movement)
        {
          selector: 'edge.path-cut',
          style: {
            'line-color': '#fbbf24',
            'width': 2,
            'curve-style': 'bezier',
            'target-arrow-shape': 'triangle',
            'target-arrow-color': '#fbbf24',
            'line-style': 'dashed',
            'line-dash-pattern': [6, 3],
            'opacity': 0.8,
            'z-index': 5
          }
        },
        // Dribble path
        {
          selector: 'edge.path-dribble',
          style: {
            'line-color': '#f97316',
            'width': 3,
            'curve-style': 'bezier',
            'target-arrow-shape': 'triangle',
            'target-arrow-color': '#f97316',
            'line-style': 'solid',
            'opacity': 0.9,
            'z-index': 5
          }
        },
        // Screen
        {
          selector: 'edge.path-screen',
          style: {
            'line-color': '#a78bfa',
            'width': 4,
            'curve-style': 'bezier',
            'target-arrow-shape': 'tee',
            'target-arrow-color': '#a78bfa',
            'line-style': 'solid',
            'opacity': 0.8,
            'z-index': 5
          }
        },
        // Pass
        {
          selector: 'edge.path-pass',
          style: {
            'line-color': '#34d399',
            'width': 2,
            'curve-style': 'straight',
            'target-arrow-shape': 'triangle',
            'target-arrow-color': '#34d399',
            'line-style': 'dotted',
            'opacity': 0.9,
            'z-index': 6
          }
        },
        // Roll
        {
          selector: 'edge.path-roll',
          style: {
            'line-color': '#fb923c',
            'width': 2,
            'curve-style': 'bezier',
            'target-arrow-shape': 'triangle',
            'target-arrow-color': '#fb923c',
            'line-style': 'dashed',
            'line-dash-pattern': [8, 4],
            'opacity': 0.8,
            'z-index': 5
          }
        },
        // Spot-up (same as cut but different color)
        {
          selector: 'edge.path-spot-up',
          style: {
            'line-color': '#60a5fa',
            'width': 1.5,
            'curve-style': 'bezier',
            'target-arrow-shape': 'triangle',
            'target-arrow-color': '#60a5fa',
            'line-style': 'dashed',
            'line-dash-pattern': [4, 4],
            'opacity': 0.6,
            'z-index': 4
          }
        },
        // Ghost node (showing target position)
        {
          selector: 'node.ghost',
          style: {
            'background-color': 'rgba(255,255,255,0.08)',
            'border-width': 1,
            'border-color': 'rgba(255,255,255,0.15)',
            'width': 18,
            'height': 18,
            'label': '',
            'events': 'no',
            'z-index': 1
          }
        }
      ],
      layout: { name: 'preset' },
      userZoomingEnabled: false,
      userPanningEnabled: false,
      boxSelectionEnabled: false,
      autoungrabify: false,
      autounselectify: false
    });

    // Handle node drag - convert back to court coords for callback
    this._cy.on('dragfree', 'node.offense, node.defense', (evt) => {
      const node = evt.target;
      const pos = node.position();
      const court = this._modelToCourt(pos.x, pos.y);

      // Clamp to court bounds
      court.x = Math.max(1, Math.min(49, court.x));
      court.y = Math.max(1, Math.min(46, court.y));

      // Snap back to court bounds in model space
      const model = this._courtToModel(court.x, court.y);
      node.position(model);

      if (this._onPlayerMoved) {
        this._onPlayerMoved(node.id(), court.x, court.y);
      }
    });

    this._fitViewport();
  },

  /**
   * Set up resize handling
   */
  _setupResize() {
    if (window.ResizeObserver && this._container) {
      this._resizeObserver = new ResizeObserver(() => {
        this._fitViewport();
      });
      this._resizeObserver.observe(this._container.parentElement);
    }
  },

  /**
   * Fit Cytoscape viewport to match court SVG
   * SVG viewBox: -5 -5 510 480 → total 510x480
   * Model space: 0-500 x 0-470 with 5 units padding → total 510x480
   */
  _fitViewport() {
    if (!this._cy || !this._container) return;

    this._cy.resize();

    const cw = this._container.clientWidth;
    const ch = this._container.clientHeight;

    if (cw === 0 || ch === 0) return;

    // Total model dimensions including padding (must match SVG viewBox)
    const totalW = this.COURT_W * this.SCALE + this.PADDING * 2; // 500 + 10 = 510
    const totalH = this.COURT_H * this.SCALE + this.PADDING * 2; // 470 + 10 = 480

    const containerAR = cw / ch;
    const courtAR = totalW / totalH;

    let scale, offsetX, offsetY;

    if (containerAR > courtAR) {
      // Container is wider - fit to height
      scale = ch / totalH;
      offsetX = (cw - totalW * scale) / 2;
      offsetY = 0;
    } else {
      // Container is taller - fit to width
      scale = cw / totalW;
      offsetX = 0;
      offsetY = (ch - totalH * scale) / 2;
    }

    this._cy.viewport({
      zoom: scale,
      pan: {
        x: offsetX + this.PADDING * scale,
        y: offsetY + this.PADDING * scale
      }
    });
  },

  /**
   * Convert court coordinates (0-50, 0-47) to model coordinates (0-500, 0-470)
   */
  _courtToModel(courtX, courtY) {
    return {
      x: courtX * this.SCALE,
      y: courtY * this.SCALE
    };
  },

  /**
   * Convert model coordinates (0-500, 0-470) to court coordinates (0-50, 0-47)
   */
  _modelToCourt(modelX, modelY) {
    return {
      x: modelX / this.SCALE,
      y: modelY / this.SCALE
    };
  },

  // ═══════════════════════════════════════════════════════════════
  // PUBLIC API - all use court coordinates (0-50, 0-47)
  // ═══════════════════════════════════════════════════════════════

  /**
   * Set the full formation on the court
   */
  setFormation(offense, defense, ball) {
    if (!this._cy) return;

    this._cy.elements().remove();

    const elements = [];

    // Add offense nodes
    offense.forEach(p => {
      elements.push({
        group: 'nodes',
        data: { id: p.id, label: p.label, team: 'offense' },
        position: this._courtToModel(p.x, p.y),
        classes: 'offense'
      });
    });

    // Add defense nodes
    defense.forEach(p => {
      elements.push({
        group: 'nodes',
        data: { id: p.id, label: p.label, team: 'defense' },
        position: this._courtToModel(p.x, p.y),
        classes: 'defense'
      });
    });

    // Add ball near the ball holder
    if (ball && ball.holder) {
      const holder = [...offense, ...defense].find(p => p.id === ball.holder);
      if (holder) {
        elements.push({
          group: 'nodes',
          data: { id: 'ball', label: '' },
          position: this._courtToModel(holder.x + 1.2, holder.y - 1.2),
          classes: 'ball'
        });
      }
    }

    this._cy.add(elements);
    this._fitViewport();
  },

  /**
   * Animate a player to a new position (court coords)
   */
  animatePlayer(playerId, toX, toY, duration, moveType) {
    return new Promise((resolve) => {
      if (!this._cy) { resolve(); return; }

      const node = this._cy.getElementById(playerId);
      if (!node || node.empty()) { resolve(); return; }

      const targetPos = this._courtToModel(toX, toY);

      node.animate({
        position: targetPos,
        duration: duration,
        easing: 'ease-in-out-cubic',
        complete: () => resolve()
      });
    });
  },

  /**
   * Move the ball to a player (animate pass)
   */
  moveBall(toPlayerId, duration) {
    return new Promise((resolve) => {
      if (!this._cy) { resolve(); return; }

      const ball = this._cy.getElementById('ball');
      const target = this._cy.getElementById(toPlayerId);
      if (!ball || ball.empty() || !target || target.empty()) { resolve(); return; }

      const pos = target.position();
      // Offset ball slightly from player center
      ball.animate({
        position: { x: pos.x + 12, y: pos.y - 12 },
        duration: duration || 400,
        easing: 'ease-out-cubic',
        complete: () => resolve()
      });
    });
  },

  /**
   * Update ball position to stay with its holder
   */
  updateBallPosition(holderId) {
    if (!this._cy) return;

    const ball = this._cy.getElementById('ball');
    const holder = this._cy.getElementById(holderId);
    if (!ball || ball.empty() || !holder || holder.empty()) return;

    const pos = holder.position();
    ball.position({ x: pos.x + 12, y: pos.y - 12 });
  },

  /**
   * Add a path edge showing movement
   */
  addPlayPath(fromId, toX, toY, moveType) {
    if (!this._cy) return;

    const ghostId = `ghost-${fromId}-${Date.now()}`;
    this._cy.add({
      group: 'nodes',
      data: { id: ghostId },
      position: this._courtToModel(toX, toY),
      classes: 'ghost'
    });

    const edgeClass = `path-${moveType || 'cut'}`;
    this._cy.add({
      group: 'edges',
      data: {
        id: `edge-${fromId}-${ghostId}`,
        source: fromId,
        target: ghostId
      },
      classes: edgeClass
    });
  },

  /**
   * Add a pass line between two players
   */
  addPassLine(fromId, toId) {
    if (!this._cy) return;

    this._cy.add({
      group: 'edges',
      data: {
        id: `pass-${fromId}-${toId}-${Date.now()}`,
        source: fromId,
        target: toId
      },
      classes: 'path-pass'
    });
  },

  /**
   * Clear all path edges and ghost nodes
   */
  clearPaths() {
    if (!this._cy) return;
    this._cy.elements('edge').remove();
    this._cy.elements('node.ghost').remove();
  },

  /**
   * Get current positions of all players (in court coords)
   */
  getPositions() {
    if (!this._cy) return { offense: [], defense: [], ball: null };

    const offense = [];
    const defense = [];

    this._cy.nodes('.offense').forEach(node => {
      const pos = this._modelToCourt(node.position().x, node.position().y);
      offense.push({
        id: node.id(),
        label: node.data('label'),
        x: Math.round(pos.x * 10) / 10,
        y: Math.round(pos.y * 10) / 10
      });
    });

    this._cy.nodes('.defense').forEach(node => {
      const pos = this._modelToCourt(node.position().x, node.position().y);
      defense.push({
        id: node.id(),
        label: node.data('label'),
        x: Math.round(pos.x * 10) / 10,
        y: Math.round(pos.y * 10) / 10
      });
    });

    return { offense, defense, ball: { holder: null } };
  },

  /**
   * Register callback for when a player is dragged
   */
  onPlayerMoved(callback) {
    this._onPlayerMoved = callback;
  },

  /**
   * Lock/unlock player dragging
   */
  setDraggable(enabled) {
    if (!this._cy) return;
    if (enabled) {
      this._cy.nodes('.offense, .defense').ungrabify(false);
      this._cy.autoungrabify(false);
    } else {
      this._cy.nodes('.offense, .defense').grabify();
    }
  },

  /**
   * Get the Cytoscape instance
   */
  getCy() {
    return this._cy;
  },

  /**
   * Destroy and cleanup
   */
  destroy() {
    if (this._resizeObserver) {
      this._resizeObserver.disconnect();
    }
    if (this._cy) {
      this._cy.destroy();
      this._cy = null;
    }
  }
};

window.CourtRenderer = CourtRenderer;
