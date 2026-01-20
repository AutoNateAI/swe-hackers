/**
 * TrueFalseActivity - True/False with Reasoning activity
 * 
 * Extends BaseActivity to provide a True/False question with optional
 * reasoning requirement. This promotes deeper thinking than simple T/F.
 * 
 * Usage:
 *   const tf = new TrueFalseActivity('container-id', {
 *     id: 'tf-variables',
 *     type: 'true-false',
 *     statement: 'Variables can be reassigned after creation.',
 *     correct: true,
 *     explanation: 'Variables can be reassigned at any time.',
 *     requireReasoning: true,
 *     minReasoningWords: 10,
 *     points: 15
 *   });
 *   tf.init();
 * 
 * Data Structure:
 *   {
 *     id: string,              // Unique identifier
 *     type: 'true-false',      // Activity type
 *     statement: string,       // The statement to evaluate
 *     correct: boolean,        // True or false
 *     explanation: string,     // Explanation shown after answer
 *     requireReasoning: boolean, // Whether reasoning is required
 *     minReasoningWords: number, // Minimum words for reasoning (default: 5)
 *     points: number           // Points for correct answer
 *   }
 * 
 * Scoring:
 *   - Correct answer: 70% of points
 *   - Good reasoning (meets word count): +30% of points
 *   - If requireReasoning is false, 100% for correct T/F answer
 */

class TrueFalseActivity extends BaseActivity {
  constructor(containerId, activityData, options = {}) {
    super(containerId, activityData, options);
    
    // True/False specific state
    this.selectedAnswer = null; // true, false, or null
    this.reasoning = '';
    
    // Activity config
    this.statement = activityData.statement;
    this.correctAnswer = activityData.correct;
    this.requireReasoning = activityData.requireReasoning ?? true;
    this.minReasoningWords = activityData.minReasoningWords || 5;
  }
  
  /**
   * Render the True/False UI
   */
  render() {
    this.container.innerHTML = `
      <div class="true-false-activity">
        <div class="activity-instruction">${this.statement}</div>
        
        <div class="tf-options">
          <button class="tf-option" data-value="true">
            <span class="tf-icon">✓</span>
            <span class="tf-label">True</span>
          </button>
          <button class="tf-option" data-value="false">
            <span class="tf-icon">✗</span>
            <span class="tf-label">False</span>
          </button>
        </div>
        
        ${this.requireReasoning ? `
          <div class="tf-reasoning">
            <label class="reasoning-label">Explain your reasoning:</label>
            <textarea 
              class="activity-textarea" 
              placeholder="Why do you think this is true/false?"
              rows="3"
            ></textarea>
            <div class="activity-word-count">
              <span class="word-count-current">0</span> / ${this.minReasoningWords} words minimum
            </div>
          </div>
        ` : ''}
        
        <div class="tf-actions">
          <button class="activity-submit-btn" disabled>
            Check Answer
          </button>
        </div>
        
        <div class="activity-feedback"></div>
      </div>
    `;
    
    // Bind event handlers
    this.bindTFEvents();
  }
  
  /**
   * Bind True/False specific event handlers
   */
  bindTFEvents() {
    // T/F option buttons
    this.container.querySelectorAll('.tf-option').forEach(btn => {
      btn.addEventListener('click', (e) => this.selectAnswer(e));
    });
    
    // Reasoning textarea
    const textarea = this.container.querySelector('.activity-textarea');
    if (textarea) {
      textarea.addEventListener('input', (e) => this.handleReasoningInput(e));
      textarea.addEventListener('focus', () => this.start());
    }
  }
  
  /**
   * Handle T/F answer selection
   */
  selectAnswer(e) {
    // Start activity on first interaction
    this.start();
    
    // If already submitted, don't allow changes
    if (this.isComplete) return;
    
    const btn = e.target.closest('.tf-option');
    const value = btn.dataset.value === 'true';
    
    // Clear previous selection
    this.container.querySelectorAll('.tf-option').forEach(opt => {
      opt.classList.remove('selected');
    });
    
    // Set new selection
    btn.classList.add('selected');
    this.selectedAnswer = value;
    
    // Enable submit button if validation passes
    this.updateSubmitButton();
  }
  
  /**
   * Handle reasoning textarea input
   */
  handleReasoningInput(e) {
    this.reasoning = e.target.value;
    
    // Update word count
    const wordCount = this.getWordCount(this.reasoning);
    const wordCountEl = this.container.querySelector('.word-count-current');
    if (wordCountEl) {
      wordCountEl.textContent = wordCount;
      
      // Visual feedback on word count
      const container = this.container.querySelector('.activity-word-count');
      if (container) {
        container.classList.toggle('sufficient', wordCount >= this.minReasoningWords);
      }
    }
    
    // Update submit button state
    this.updateSubmitButton();
  }
  
  /**
   * Count words in text
   */
  getWordCount(text) {
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
  }
  
  /**
   * Check if activity is in a submittable state
   */
  validate() {
    // Must have selected an answer
    if (this.selectedAnswer === null) return false;
    
    // If reasoning required, must meet minimum word count
    if (this.requireReasoning) {
      return this.getWordCount(this.reasoning) >= this.minReasoningWords;
    }
    
    return true;
  }
  
  /**
   * Get validation message
   */
  getValidationMessage() {
    if (this.selectedAnswer === null) {
      return 'Please select True or False.';
    }
    if (this.requireReasoning && this.getWordCount(this.reasoning) < this.minReasoningWords) {
      return `Please explain your reasoning (at least ${this.minReasoningWords} words).`;
    }
    return 'Please complete all fields before submitting.';
  }
  
  /**
   * Get the result of the activity
   */
  getResult() {
    const answerCorrect = this.selectedAnswer === this.correctAnswer;
    const wordCount = this.getWordCount(this.reasoning);
    const reasoningMeetsMinimum = wordCount >= this.minReasoningWords;
    
    // Calculate score
    let score;
    if (this.requireReasoning) {
      // 70% for correct answer, 30% for reasoning
      const answerScore = answerCorrect ? 0.7 : 0;
      const reasoningScore = reasoningMeetsMinimum ? 0.3 : (wordCount / this.minReasoningWords) * 0.3;
      score = answerScore + reasoningScore;
    } else {
      // 100% for correct answer
      score = answerCorrect ? 1.0 : 0.0;
    }
    
    // Build message
    let message;
    if (answerCorrect) {
      message = this.requireReasoning && reasoningMeetsMinimum 
        ? 'Correct with great reasoning!' 
        : 'Correct!';
    } else {
      message = `The statement is ${this.correctAnswer ? 'True' : 'False'}.`;
    }
    
    return {
      correct: answerCorrect && (!this.requireReasoning || reasoningMeetsMinimum),
      score,
      response: {
        selected: this.selectedAnswer,
        correctAnswer: this.correctAnswer,
        reasoning: this.reasoning,
        reasoningWordCount: wordCount,
        reasoningMeetsMinimum
      },
      message
    };
  }
  
  /**
   * Show feedback with visual indicators
   */
  showFeedback(result) {
    // Mark correct and incorrect options
    this.container.querySelectorAll('.tf-option').forEach(opt => {
      opt.disabled = true;
      const optValue = opt.dataset.value === 'true';
      
      if (optValue === this.correctAnswer) {
        opt.classList.add('correct');
      } else if (optValue === this.selectedAnswer && !result.correct) {
        opt.classList.add('incorrect');
      }
    });
    
    // Disable textarea
    const textarea = this.container.querySelector('.activity-textarea');
    if (textarea) {
      textarea.disabled = true;
    }
    
    // Update submit button
    const submitBtn = this.container.querySelector('.activity-submit-btn');
    if (submitBtn) {
      submitBtn.textContent = result.correct ? '✓ Correct!' : '✗ Incorrect';
      submitBtn.disabled = true;
      submitBtn.classList.add(result.correct ? 'correct' : 'incorrect');
    }
    
    // Call parent feedback method
    super.showFeedback(result);
  }
  
  /**
   * Reset activity to initial state
   */
  reset() {
    this.selectedAnswer = null;
    this.reasoning = '';
    
    // Reset T/F options
    this.container.querySelectorAll('.tf-option').forEach(opt => {
      opt.disabled = false;
      opt.classList.remove('selected', 'correct', 'incorrect');
    });
    
    // Reset textarea
    const textarea = this.container.querySelector('.activity-textarea');
    if (textarea) {
      textarea.value = '';
      textarea.disabled = false;
    }
    
    // Reset word count
    const wordCountEl = this.container.querySelector('.word-count-current');
    if (wordCountEl) {
      wordCountEl.textContent = '0';
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
  ActivityRegistry.register('true-false', TrueFalseActivity);
}

// Export for use as module or global
if (typeof module !== 'undefined' && module.exports) {
  module.exports = TrueFalseActivity;
} else if (typeof window !== 'undefined') {
  window.TrueFalseActivity = TrueFalseActivity;
}
