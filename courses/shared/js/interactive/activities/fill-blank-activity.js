/**
 * FillBlankActivity - Fill-in-the-Blank activity
 * 
 * Extends BaseActivity to provide a statement with a blank to fill in.
 * Supports multiple acceptable answers and case sensitivity options.
 * 
 * Usage:
 *   const fillBlank = new FillBlankActivity('container-id', {
 *     id: 'fill-variable-def',
 *     type: 'fill-blank',
 *     statement: 'A variable is a named ___ that stores data in memory.',
 *     correctAnswers: ['container', 'box', 'location', 'space'],
 *     caseSensitive: false,
 *     hints: ['Think of it like a labeled storage unit'],
 *     explanation: 'Variables are containers that hold data values.',
 *     points: 10
 *   });
 *   fillBlank.init();
 * 
 * Data Structure:
 *   {
 *     id: string,              // Unique identifier
 *     type: 'fill-blank',      // Activity type
 *     statement: string,       // Statement with ___ or [BLANK] marker
 *     correctAnswers: string[], // Array of acceptable answers
 *     caseSensitive: boolean,  // Whether matching is case-sensitive (default: false)
 *     hints: string[],         // Optional hints to show
 *     explanation: string,     // Explanation shown after answer
 *     points: number           // Points for correct answer
 *   }
 */

class FillBlankActivity extends BaseActivity {
  constructor(containerId, activityData, options = {}) {
    super(containerId, activityData, options);
    
    // Fill-in-blank specific state
    this.userAnswer = '';
    
    // Activity config
    this.statement = activityData.statement;
    this.correctAnswers = activityData.correctAnswers || [];
    this.caseSensitive = activityData.caseSensitive || false;
    this.hints = activityData.hints || [];
    this.hintsVisible = false;
  }
  
  /**
   * Render the Fill-in-the-Blank UI
   */
  render() {
    // Parse statement and replace blank marker with input
    const statementHTML = this.parseStatement(this.statement);
    
    this.container.innerHTML = `
      <div class="fill-blank-activity">
        <div class="activity-instruction">Complete the statement:</div>
        
        <div class="fill-blank-statement">
          ${statementHTML}
        </div>
        
        ${this.hints.length > 0 ? `
          <div class="fill-blank-hints">
            <button class="hint-toggle-btn">Show Hint</button>
            <div class="fill-blank-hint">
              ${this.hints[0]}
            </div>
          </div>
        ` : ''}
        
        <div class="fill-blank-actions">
          <button class="activity-submit-btn" disabled>
            Check Answer
          </button>
        </div>
        
        <div class="activity-feedback"></div>
      </div>
    `;
    
    // Bind event handlers
    this.bindFillBlankEvents();
  }
  
  /**
   * Parse statement and replace blank markers with input field
   * Supports ___ or [BLANK] markers
   */
  parseStatement(statement) {
    // Replace ___ or [BLANK] with input field
    const blankPattern = /___|\[BLANK\]/gi;
    
    // Find if there's a blank marker
    if (!blankPattern.test(statement)) {
      // No blank marker found, append input at the end
      return `${statement} <input type="text" class="fill-blank-input" placeholder="..." autocomplete="off" />`;
    }
    
    // Replace the first blank marker with input field
    return statement.replace(blankPattern, 
      '<input type="text" class="fill-blank-input" placeholder="..." autocomplete="off" />'
    );
  }
  
  /**
   * Bind Fill-in-Blank specific event handlers
   */
  bindFillBlankEvents() {
    // Input field
    const input = this.container.querySelector('.fill-blank-input');
    if (input) {
      input.addEventListener('input', (e) => this.handleInput(e));
      input.addEventListener('focus', () => this.start());
      input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          if (this.validate()) {
            this.submit();
          }
        }
      });
    }
    
    // Hint toggle button
    const hintBtn = this.container.querySelector('.hint-toggle-btn');
    if (hintBtn) {
      hintBtn.addEventListener('click', () => this.toggleHint());
    }
  }
  
  /**
   * Handle input change
   */
  handleInput(e) {
    this.userAnswer = e.target.value;
    this.updateSubmitButton();
  }
  
  /**
   * Toggle hint visibility
   */
  toggleHint() {
    this.hintsVisible = !this.hintsVisible;
    
    const hintEl = this.container.querySelector('.fill-blank-hint');
    const hintBtn = this.container.querySelector('.hint-toggle-btn');
    
    if (hintEl && hintBtn) {
      hintEl.classList.toggle('visible', this.hintsVisible);
      hintBtn.textContent = this.hintsVisible ? 'Hide Hint' : 'Show Hint';
    }
  }
  
  /**
   * Check if activity is in a submittable state
   */
  validate() {
    return this.userAnswer.trim().length > 0;
  }
  
  /**
   * Get validation message
   */
  getValidationMessage() {
    return 'Please fill in the blank before submitting.';
  }
  
  /**
   * Check if the user's answer matches any correct answer
   */
  checkAnswer(input) {
    const normalized = this.caseSensitive 
      ? input.trim() 
      : input.trim().toLowerCase();
    
    return this.correctAnswers.some(answer => {
      const normalizedAnswer = this.caseSensitive 
        ? answer.trim() 
        : answer.trim().toLowerCase();
      return normalized === normalizedAnswer;
    });
  }
  
  /**
   * Find the best matching correct answer for display
   */
  getBestMatch() {
    // Return the first correct answer as the primary answer
    return this.correctAnswers[0] || '';
  }
  
  /**
   * Get the result of the activity
   */
  getResult() {
    const correct = this.checkAnswer(this.userAnswer);
    
    // Build message
    let message;
    if (correct) {
      message = 'Correct!';
    } else {
      const bestAnswer = this.getBestMatch();
      message = `The answer was: "${bestAnswer}"`;
    }
    
    return {
      correct,
      score: correct ? 1.0 : 0.0,
      response: {
        userAnswer: this.userAnswer,
        correctAnswers: this.correctAnswers,
        matchedAnswer: correct ? this.userAnswer : null
      },
      message
    };
  }
  
  /**
   * Show feedback with visual indicators
   */
  showFeedback(result) {
    // Mark input as correct/incorrect
    const input = this.container.querySelector('.fill-blank-input');
    if (input) {
      input.disabled = true;
      input.classList.add(result.correct ? 'correct' : 'incorrect');
      
      // If incorrect, show the correct answer in the input
      if (!result.correct) {
        input.value = this.getBestMatch();
      }
    }
    
    // Update submit button
    const submitBtn = this.container.querySelector('.activity-submit-btn');
    if (submitBtn) {
      submitBtn.textContent = result.correct ? '✓ Correct!' : '✗ Incorrect';
      submitBtn.disabled = true;
      submitBtn.classList.add(result.correct ? 'correct' : 'incorrect');
    }
    
    // Hide hint toggle after submission
    const hintBtn = this.container.querySelector('.hint-toggle-btn');
    if (hintBtn) {
      hintBtn.style.display = 'none';
    }
    
    // Show hint if visible
    const hintEl = this.container.querySelector('.fill-blank-hint');
    if (hintEl && !this.hintsVisible) {
      hintEl.classList.add('visible');
    }
    
    // Call parent feedback method
    super.showFeedback(result);
  }
  
  /**
   * Reset activity to initial state
   */
  reset() {
    this.userAnswer = '';
    this.hintsVisible = false;
    
    // Reset input
    const input = this.container.querySelector('.fill-blank-input');
    if (input) {
      input.value = '';
      input.disabled = false;
      input.classList.remove('correct', 'incorrect');
    }
    
    // Reset hint
    const hintEl = this.container.querySelector('.fill-blank-hint');
    const hintBtn = this.container.querySelector('.hint-toggle-btn');
    if (hintEl && hintBtn) {
      hintEl.classList.remove('visible');
      hintBtn.textContent = 'Show Hint';
      hintBtn.style.display = '';
    }
    
    // Reset submit button
    const submitBtn = this.container.querySelector('.activity-submit-btn');
    if (submitBtn) {
      submitBtn.textContent = 'Check Answer';
      submitBtn.disabled = true;
      submitBtn.classList.remove('correct', 'incorrect');
    }
    
    super.reset();
  }
}

// Register with ActivityRegistry
if (typeof ActivityRegistry !== 'undefined') {
  ActivityRegistry.register('fill-blank', FillBlankActivity);
}

// Export for use as module or global
if (typeof module !== 'undefined' && module.exports) {
  module.exports = FillBlankActivity;
} else if (typeof window !== 'undefined') {
  window.FillBlankActivity = FillBlankActivity;
}
