/**
 * QuizActivity - Multiple choice quiz activity
 * 
 * Extends BaseActivity to provide a simple multiple choice question.
 * This is a foundational activity type that demonstrates the pattern
 * for building more complex activities.
 * 
 * Usage:
 *   const quiz = new QuizActivity('container-id', {
 *     id: 'quiz-variables',
 *     type: 'quiz',
 *     question: 'What is a variable?',
 *     options: ['A loop', 'A named container for data', 'A function', 'A file'],
 *     correct: 1,
 *     explanation: 'Variables store data in memory.',
 *     points: 10
 *   });
 *   quiz.init();
 * 
 * Data Structure:
 *   {
 *     id: string,           // Unique identifier
 *     type: 'quiz',         // Activity type
 *     question: string,     // The question text
 *     options: string[],    // Array of answer options
 *     correct: number,      // Index of correct answer (0-based)
 *     explanation: string,  // Explanation shown after answer
 *     points: number        // Points for correct answer
 *   }
 */

class QuizActivity extends BaseActivity {
  constructor(containerId, activityData, options = {}) {
    super(containerId, activityData, options);
    
    // Quiz-specific state
    this.selectedOption = null;
    this.question = activityData.question;
    this.options = activityData.options || [];
    this.correctIndex = activityData.correct;
  }
  
  /**
   * Render the quiz UI
   */
  render() {
    this.container.innerHTML = `
      <div class="quiz-activity">
        <div class="activity-instruction">${this.question}</div>
        
        <div class="activity-options">
          ${this.options.map((option, i) => `
            <button class="activity-option" data-index="${i}">
              ${option}
            </button>
          `).join('')}
        </div>
        
        <div class="quiz-actions">
          <button class="activity-submit-btn" disabled>
            Check Answer
          </button>
        </div>
        
        <div class="activity-feedback"></div>
      </div>
    `;
    
    // Bind option click handlers
    this.container.querySelectorAll('.activity-option').forEach(btn => {
      btn.addEventListener('click', (e) => this.selectOption(e));
    });
  }
  
  /**
   * Handle option selection
   */
  selectOption(e) {
    // Start activity on first interaction
    this.start();
    
    // If already submitted, don't allow changes
    if (this.isComplete) return;
    
    const btn = e.target.closest('.activity-option');
    const index = parseInt(btn.dataset.index);
    
    // Clear previous selection
    this.container.querySelectorAll('.activity-option').forEach(opt => {
      opt.classList.remove('selected');
    });
    
    // Set new selection
    btn.classList.add('selected');
    this.selectedOption = index;
    
    // Enable submit button
    this.updateSubmitButton();
  }
  
  /**
   * Check if quiz is in a submittable state
   */
  validate() {
    return this.selectedOption !== null;
  }
  
  /**
   * Get validation message
   */
  getValidationMessage() {
    return 'Please select an answer before submitting.';
  }
  
  /**
   * Get the result of the quiz
   */
  getResult() {
    const correct = this.selectedOption === this.correctIndex;
    
    return {
      correct,
      score: correct ? 1.0 : 0.0,
      response: {
        selected: this.selectedOption,
        selectedText: this.options[this.selectedOption],
        correctIndex: this.correctIndex,
        correctText: this.options[this.correctIndex]
      },
      message: correct ? 'Correct!' : `The answer was: ${this.options[this.correctIndex]}`
    };
  }
  
  /**
   * Show feedback with visual indicators on options
   */
  showFeedback(result) {
    // Mark correct and incorrect options
    this.container.querySelectorAll('.activity-option').forEach((opt, i) => {
      opt.disabled = true;
      
      if (i === this.correctIndex) {
        opt.classList.add('correct');
      } else if (i === this.selectedOption && !result.correct) {
        opt.classList.add('incorrect');
      }
    });
    
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
   * Reset quiz to initial state
   */
  reset() {
    this.selectedOption = null;
    
    // Re-enable options
    this.container.querySelectorAll('.activity-option').forEach(opt => {
      opt.disabled = false;
      opt.classList.remove('selected', 'correct', 'incorrect');
    });
    
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
  ActivityRegistry.register('quiz', QuizActivity);
}

// Export for use as module or global
if (typeof module !== 'undefined' && module.exports) {
  module.exports = QuizActivity;
} else if (typeof window !== 'undefined') {
  window.QuizActivity = QuizActivity;
}
