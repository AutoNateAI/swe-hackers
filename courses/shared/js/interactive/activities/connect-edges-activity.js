/**
 * ConnectEdgesActivity - Connect nodes by drawing edges
 * 
 * WRAPS the existing ChallengePuzzle class to fit the BaseActivity pattern.
 * Don't reinvent the wheel - ChallengePuzzle already has Cytoscape.js working.
 * 
 * Students click nodes to draw edges between them, building graph relationships.
 * Perfect for data flow, system architecture, and relationship concepts.
 * 
 * Usage:
 *   const activity = new ConnectEdgesActivity('container-id', {
 *     id: 'connect-dataflow',
 *     type: 'connect-edges',
 *     instruction: 'Connect these components to show data flow:',
 *     nodes: [
 *       { id: 'user', label: '👤 User' },
 *       { id: 'server', label: '📡 Server' },
 *       { id: 'db', label: '🗄️ Database' }
 *     ],
 *     solution: {
 *       edges: [
 *         { source: 'user', target: 'server' },
 *         { source: 'server', target: 'db' }
 *       ]
 *     },
 *     nodeDescriptions: {
 *       'user': 'The person using the app',
 *       'server': 'Processes requests',
 *       'db': 'Stores data'
 *     },
 *     points: 25
 *   });
 *   activity.init();
 * 
 * Dependencies:
 *   - Cytoscape.js (CDN)
 *   - ChallengePuzzle class (challenge-puzzle.js)
 */

class ConnectEdgesActivity extends BaseActivity {
  constructor(containerId, activityData, options = {}) {
    super(containerId, activityData, options);
    
    // Connect-edges specific state
    this.puzzle = null;
    this.puzzleResult = null;
    this.hasAutoCompleted = false;
  }
  
  /**
   * Render the connect-edges UI using ChallengePuzzle
   */
  render() {
    // Create container structure
    const puzzleContainerId = `${this.containerId}-puzzle`;
    
    this.container.innerHTML = `
      <div class="connect-edges-activity">
        <div class="puzzle-wrapper" id="${puzzleContainerId}"></div>
        <div class="activity-feedback"></div>
      </div>
    `;
    
    // Check if ChallengePuzzle is available
    if (typeof ChallengePuzzle === 'undefined') {
      this.showDependencyError();
      return;
    }
    
    // Convert activity data to ChallengePuzzle format
    const puzzleData = {
      type: 'connect-edges',
      instruction: this.activityData.instruction,
      nodes: this.activityData.nodes,
      solution: this.activityData.solution,
      nodeDescriptions: this.activityData.nodeDescriptions || {},
      xp: this.activityData.points || 25
    };
    
    // Initialize ChallengePuzzle
    this.puzzle = new ChallengePuzzle(puzzleContainerId, puzzleData, {
      onComplete: (result) => this.handlePuzzleComplete(result),
      onProgress: (progress) => this.handlePuzzleProgress(progress)
    });
    
    // Override the puzzle's check button to use our submit flow
    this.overridePuzzleCheckButton();
  }
  
  /**
   * Show error when ChallengePuzzle is not loaded
   */
  showDependencyError() {
    this.container.innerHTML = `
      <div class="connect-edges-activity error">
        <div class="activity-instruction">${this.activityData.instruction}</div>
        <div class="dependency-error">
          <p>⚠️ This activity requires additional dependencies:</p>
          <ul>
            <li>Cytoscape.js</li>
            <li>ChallengePuzzle component</li>
          </ul>
          <p>Please ensure these are loaded in the page.</p>
        </div>
      </div>
    `;
    console.error('ConnectEdgesActivity: ChallengePuzzle is not defined. Make sure to include challenge-puzzle.js and cytoscape.js');
  }
  
  /**
   * Override the puzzle's check button to integrate with BaseActivity
   */
  overridePuzzleCheckButton() {
    // Find and modify the check button behavior
    const checkBtn = this.container.querySelector('.puzzle-check');
    if (checkBtn) {
      // Remove existing listener by cloning
      const newCheckBtn = checkBtn.cloneNode(true);
      checkBtn.parentNode.replaceChild(newCheckBtn, checkBtn);
      
      // Add our submit handler
      newCheckBtn.addEventListener('click', () => {
        this.start(); // Ensure activity is started
        this.submit();
      });
    }
  }
  
  /**
   * Handle puzzle completion (auto-complete from ChallengePuzzle)
   */
  handlePuzzleComplete(result) {
    this.puzzleResult = result;
    this.hasAutoCompleted = true;
    
    // If puzzle reports perfect score, auto-submit
    if (result.score === 100) {
      this.submit();
    }
  }
  
  /**
   * Handle puzzle progress updates
   */
  handlePuzzleProgress(progress) {
    this.onProgress(progress);
  }
  
  /**
   * Override bindEvents to handle puzzle interaction
   */
  bindEvents() {
    // Start activity on first click in the puzzle area
    this.container.addEventListener('click', () => this.start(), { once: true });
  }
  
  /**
   * Check if activity is in a submittable state
   * User must have drawn at least one edge
   */
  validate() {
    return this.puzzle?.userEdges?.size > 0;
  }
  
  /**
   * Get validation message
   */
  getValidationMessage() {
    return 'Click two nodes to connect them, then check your answer.';
  }
  
  /**
   * Get the result of the activity
   */
  getResult() {
    // If puzzle auto-completed with a result, use it
    if (this.puzzleResult && this.hasAutoCompleted) {
      return {
        correct: this.puzzleResult.score === 100,
        score: this.puzzleResult.score / 100,
        response: {
          userEdges: Array.from(this.puzzle?.userEdges || []),
          correctEdges: this.puzzleResult.correct,
          totalEdges: this.puzzleResult.total
        },
        message: this.puzzleResult.score === 100 
          ? 'Perfect! All connections correct!' 
          : `${this.puzzleResult.correct}/${this.puzzleResult.total} correct`
      };
    }
    
    // Manual calculation
    const userEdges = Array.from(this.puzzle?.userEdges || []);
    const correctEdges = this.activityData.solution?.edges || [];
    const correctEdgeSet = new Set();
    
    // Build set of correct edges (normalize direction)
    correctEdges.forEach(e => {
      correctEdgeSet.add(`${e.source}->${e.target}`);
    });
    
    // Count correct user edges
    let correctCount = 0;
    let incorrectCount = 0;
    
    userEdges.forEach(edge => {
      const [source, target] = edge.split('->');
      const forwardKey = `${source}->${target}`;
      const reverseKey = `${target}->${source}`;
      
      if (correctEdgeSet.has(forwardKey) || correctEdgeSet.has(reverseKey)) {
        correctCount++;
      } else {
        incorrectCount++;
      }
    });
    
    const totalRequired = correctEdges.length;
    const score = totalRequired > 0 ? Math.max(0, (correctCount - incorrectCount * 0.5) / totalRequired) : 0;
    const normalizedScore = Math.min(1, Math.max(0, score));
    
    return {
      correct: normalizedScore === 1.0 && incorrectCount === 0,
      score: normalizedScore,
      response: {
        userEdges,
        correctEdges: correctCount,
        incorrectEdges: incorrectCount,
        totalRequired,
        missingEdges: totalRequired - correctCount
      },
      message: this.buildResultMessage(correctCount, incorrectCount, totalRequired)
    };
  }
  
  /**
   * Build a descriptive result message
   */
  buildResultMessage(correct, incorrect, total) {
    if (correct === total && incorrect === 0) {
      return 'Perfect! All connections correct!';
    }
    
    let parts = [];
    if (correct > 0) parts.push(`${correct}/${total} correct`);
    if (incorrect > 0) parts.push(`${incorrect} wrong`);
    if (correct < total) parts.push(`${total - correct} missing`);
    
    return parts.join(' • ');
  }
  
  /**
   * Show feedback - leverage ChallengePuzzle's visual feedback
   */
  showFeedback(result) {
    // Let puzzle show its visual feedback
    if (this.puzzle && !this.hasAutoCompleted) {
      this.puzzle.checkAnswer();
    }
    
    // Update the check button
    const checkBtn = this.container.querySelector('.puzzle-check');
    if (checkBtn) {
      if (result.correct) {
        checkBtn.textContent = '✓ Correct!';
        checkBtn.disabled = true;
        checkBtn.classList.add('correct');
      } else {
        // ChallengePuzzle handles retry automatically
      }
    }
    
    // Call parent feedback
    super.showFeedback(result);
  }
  
  /**
   * Reset to initial state
   */
  reset() {
    this.puzzleResult = null;
    this.hasAutoCompleted = false;
    
    // Clear puzzle edges
    if (this.puzzle) {
      this.puzzle.clearAllEdges?.();
    }
    
    super.reset();
  }
  
  /**
   * Cleanup when activity is removed
   */
  destroy() {
    // Destroy Cytoscape instance
    if (this.puzzle?.cy) {
      this.puzzle.cy.destroy();
    }
    this.puzzle = null;
    
    super.destroy();
  }
  
  /**
   * Handle window resize
   */
  resize() {
    if (this.puzzle) {
      this.puzzle.resize?.();
    }
  }
}

// Register with ActivityRegistry
if (typeof ActivityRegistry !== 'undefined') {
  ActivityRegistry.register('connect-edges', ConnectEdgesActivity);
}

// Export for use as module or global
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ConnectEdgesActivity;
} else if (typeof window !== 'undefined') {
  window.ConnectEdgesActivity = ConnectEdgesActivity;
}
