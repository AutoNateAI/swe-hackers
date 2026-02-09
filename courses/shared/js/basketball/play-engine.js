/**
 * Basketball Play Engine
 *
 * Handles play execution, animation sequencing, step controls,
 * and timeline management. Works with CourtRenderer for visuals.
 */

const PlayEngine = {

  _court: null,         // CourtRenderer reference
  _currentPlay: null,   // Current play data
  _currentStep: -1,     // Current step index (-1 = formation)
  _isPlaying: false,
  _animationFrame: null,
  _stepTimeout: null,
  _ballHolder: null,
  _onStepChange: null,
  _onPlayComplete: null,
  _positions: null,     // Snapshot of current positions per step

  /**
   * Initialize the play engine
   * @param {object} courtRenderer - CourtRenderer instance
   */
  init(courtRenderer) {
    this._court = courtRenderer;
  },

  /**
   * Load a play and display its initial formation
   * @param {object} play - Play data from PlayData
   */
  loadPlay(play) {
    this.stop();
    this._currentPlay = JSON.parse(JSON.stringify(play));
    this._currentStep = -1;
    this._positions = [];

    // Display the formation
    const { offense, defense, ball } = play.formation;
    this._court.setFormation(offense, defense, ball);
    this._court.clearPaths();

    this._ballHolder = ball?.holder || 'o1';

    // Save initial positions
    this._positions[-1] = {
      offense: JSON.parse(JSON.stringify(offense)),
      defense: JSON.parse(JSON.stringify(defense)),
      ball: { holder: this._ballHolder }
    };

    // Build position snapshots for each step
    let currentOffense = JSON.parse(JSON.stringify(offense));
    let currentDefense = JSON.parse(JSON.stringify(defense));
    let currentBall = this._ballHolder;

    play.steps.forEach((step, i) => {
      // Apply movements
      step.movements.forEach(move => {
        const player = currentOffense.find(p => p.id === move.playerId) ||
                       currentDefense.find(p => p.id === move.playerId);
        if (player) {
          player.x = move.toX;
          player.y = move.toY;
        }
      });

      if (step.ball?.holder) {
        currentBall = step.ball.holder;
      }

      this._positions[i] = {
        offense: JSON.parse(JSON.stringify(currentOffense)),
        defense: JSON.parse(JSON.stringify(currentDefense)),
        ball: { holder: currentBall }
      };
    });

    this._notifyStepChange();
  },

  /**
   * Play the animation from current step
   */
  async play() {
    if (!this._currentPlay || this._isPlaying) return;

    this._isPlaying = true;
    this._notifyStepChange();

    const steps = this._currentPlay.steps;

    // If at the end, restart
    if (this._currentStep >= steps.length - 1) {
      this._currentStep = -1;
      this._resetToFormation();
      await this._delay(500);
    }

    // Play each remaining step
    for (let i = this._currentStep + 1; i < steps.length; i++) {
      if (!this._isPlaying) break;

      await this._executeStep(i);
      this._currentStep = i;
      this._notifyStepChange();

      // Brief pause between steps
      if (i < steps.length - 1 && this._isPlaying) {
        await this._delay(300);
      }
    }

    this._isPlaying = false;
    if (this._currentStep >= steps.length - 1 && this._onPlayComplete) {
      this._onPlayComplete();
    }
    this._notifyStepChange();
  },

  /**
   * Pause animation
   */
  pause() {
    this._isPlaying = false;
    if (this._stepTimeout) {
      clearTimeout(this._stepTimeout);
      this._stepTimeout = null;
    }
    this._notifyStepChange();
  },

  /**
   * Stop and reset to formation
   */
  stop() {
    this._isPlaying = false;
    if (this._stepTimeout) {
      clearTimeout(this._stepTimeout);
      this._stepTimeout = null;
    }
    if (this._currentPlay) {
      this._currentStep = -1;
      this._resetToFormation();
      this._notifyStepChange();
    }
  },

  /**
   * Step forward one step
   */
  async stepForward() {
    if (!this._currentPlay) return;
    if (this._isPlaying) this.pause();

    const steps = this._currentPlay.steps;
    if (this._currentStep >= steps.length - 1) return;

    const nextStep = this._currentStep + 1;
    await this._executeStep(nextStep);
    this._currentStep = nextStep;
    this._notifyStepChange();
  },

  /**
   * Step backward one step
   */
  stepBackward() {
    if (!this._currentPlay) return;
    if (this._isPlaying) this.pause();

    if (this._currentStep <= -1) return;

    this._currentStep--;

    // Jump to the saved position snapshot
    this._jumpToStep(this._currentStep);
    this._notifyStepChange();
  },

  /**
   * Jump to a specific step (no animation)
   */
  goToStep(stepIndex) {
    if (!this._currentPlay) return;
    if (this._isPlaying) this.pause();

    stepIndex = Math.max(-1, Math.min(stepIndex, this._currentPlay.steps.length - 1));
    this._currentStep = stepIndex;
    this._jumpToStep(stepIndex);
    this._notifyStepChange();
  },

  /**
   * Execute a single step with animation
   */
  async _executeStep(stepIndex) {
    const step = this._currentPlay.steps[stepIndex];
    if (!step) return;

    this._court.clearPaths();

    // Show movement paths before animating
    step.movements.forEach(move => {
      this._court.addPlayPath(move.playerId, move.toX, move.toY, move.type || 'cut');
    });

    // Show pass line if there's a pass
    if (step.ball?.passFrom && step.ball?.holder) {
      this._court.addPassLine(step.ball.passFrom, step.ball.holder);
    }

    // Animate all movements concurrently
    const animations = step.movements.map(move =>
      this._court.animatePlayer(move.playerId, move.toX, move.toY, step.duration, move.type)
    );

    // Animate ball if there's a pass
    if (step.ball?.passFrom && step.ball?.holder && step.ball.holder !== step.ball.passFrom) {
      // Ball moves after a slight delay (release time)
      animations.push(
        this._delay(step.duration * 0.3).then(() =>
          this._court.moveBall(step.ball.holder, step.duration * 0.4)
        )
      );
      this._ballHolder = step.ball.holder;
    } else if (step.ball?.holder) {
      // Ball follows the ball handler
      const handler = step.movements.find(m => m.playerId === step.ball.holder);
      if (handler) {
        animations.push(
          this._court.animatePlayer('ball',
            handler.toX + 1.5, handler.toY - 1.5,
            step.duration, 'dribble'
          )
        );
      }
      this._ballHolder = step.ball.holder;
    }

    await Promise.all(animations);

    // Clear paths after animation
    await this._delay(200);
    this._court.clearPaths();
  },

  /**
   * Jump to a step position instantly (no animation)
   */
  _jumpToStep(stepIndex) {
    const snapshot = this._positions[stepIndex];
    if (!snapshot) return;

    this._court.clearPaths();
    this._court.setFormation(snapshot.offense, snapshot.defense, snapshot.ball);
    this._ballHolder = snapshot.ball?.holder || 'o1';
  },

  /**
   * Reset to initial formation
   */
  _resetToFormation() {
    if (!this._currentPlay) return;
    const { offense, defense, ball } = this._currentPlay.formation;
    this._court.clearPaths();
    this._court.setFormation(offense, defense, ball);
    this._ballHolder = ball?.holder || 'o1';
  },

  // ═══════════════════════════════════════════════════════════════
  // STATE & CALLBACKS
  // ═══════════════════════════════════════════════════════════════

  getCurrentStep() {
    return this._currentStep;
  },

  getTotalSteps() {
    return this._currentPlay?.steps?.length || 0;
  },

  getStepDescription() {
    if (!this._currentPlay) return '';
    if (this._currentStep === -1) return 'Initial Formation';
    const step = this._currentPlay.steps[this._currentStep];
    return step?.description || `Step ${this._currentStep + 1}`;
  },

  isPlaying() {
    return this._isPlaying;
  },

  getCurrentPlay() {
    return this._currentPlay;
  },

  getBallHolder() {
    return this._ballHolder;
  },

  /**
   * Get a snapshot of current state for saving
   */
  getSnapshot() {
    if (!this._currentPlay) return null;
    return {
      play: JSON.parse(JSON.stringify(this._currentPlay)),
      _currentStep: this._currentStep,
      positions: this._court.getPositions()
    };
  },

  /**
   * Register step change callback
   */
  onStepChange(callback) {
    this._onStepChange = callback;
  },

  /**
   * Register play complete callback
   */
  onPlayComplete(callback) {
    this._onPlayComplete = callback;
  },

  _notifyStepChange() {
    if (this._onStepChange) {
      this._onStepChange({
        step: this._currentStep,
        total: this.getTotalSteps(),
        description: this.getStepDescription(),
        isPlaying: this._isPlaying
      });
    }
  },

  _delay(ms) {
    return new Promise(resolve => {
      this._stepTimeout = setTimeout(resolve, ms);
    });
  }
};

window.PlayEngine = PlayEngine;
