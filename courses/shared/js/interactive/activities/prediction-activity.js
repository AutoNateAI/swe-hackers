/**
 * PredictionActivity - Prediction/hypothesis activity for synthesis learning
 * 
 * Students predict output or behavior before seeing the answer, then compare
 * their prediction to reality. Builds critical thinking and reveals misconceptions.
 * 
 * Usage:
 *   const prediction = new PredictionActivity('container-id', {
 *     id: 'predict-swap',
 *     type: 'prediction',
 *     setup: {
 *       type: 'code',
 *       language: 'python',
 *       code: 'x = 5\ny = x\nx = 10\nprint(y)'
 *     },
 *     question: 'What will this code print?',
 *     correctAnswer: '5',
 *     acceptableVariants: ['5', 'five'],
 *     explanation: 'When y = x is executed, y gets the VALUE 5...',
 *     commonMistakes: { '10': 'You might think y is linked to x...' },
 *     points: 15
 *   });
 *   prediction.init();
 * 
 * Data Structure:
 *   {
 *     id: string,
 *     type: 'prediction',
 *     setup: {
 *       type: 'code' | 'text',
 *       language?: string,    // For code type
 *       code?: string,        // For code type
 *       text?: string         // For text type
 *     },
 *     question: string,
 *     correctAnswer: string,
 *     acceptableVariants: string[],   // Alternative correct answers
 *     explanation: string,
 *     commonMistakes?: object,        // { mistake: feedback }
 *     points: number
 *   }
 */

class PredictionActivity extends BaseActivity {
  constructor(containerId, activityData, options = {}) {
    super(containerId, activityData, options);
    
    // Prediction-specific state
    this.prediction = '';
    this.hasRevealed = false;
    
    // Activity data
    this.setup = activityData.setup || {};
    this.question = activityData.question || '';
    this.correctAnswer = activityData.correctAnswer || '';
    this.acceptableVariants = activityData.acceptableVariants || [this.correctAnswer];
    this.explanation = activityData.explanation || '';
    this.commonMistakes = activityData.commonMistakes || {};
  }
  
  /**
   * Render the prediction activity UI
   */
  render() {
    const setupHtml = this.renderSetup();
    
    this.container.innerHTML = `
      <div class="prediction-activity">
        <!-- Setup: Code or text -->
        <div class="prediction-setup">
          ${setupHtml}
        </div>
        
        <!-- Question -->
        <div class="prediction-question">
          <span class="question-icon">🤔</span>
          <span class="question-text">${this.question}</span>
        </div>
        
        <!-- Prediction Input -->
        <div class="prediction-input-area">
          <label for="${this.id}-input">Your prediction:</label>
          <input 
            type="text" 
            id="${this.id}-input"
            class="prediction-input" 
            placeholder="What do you think will happen?"
            autocomplete="off"
          />
        </div>
        
        <!-- Submit Button -->
        <button class="activity-submit-btn" disabled>
          🔒 Lock In Prediction
        </button>
        
        <!-- Reveal Section (hidden until submit) -->
        <div class="prediction-reveal" style="display: none;">
          <div class="reveal-comparison">
            <div class="your-prediction">
              <span class="reveal-label">Your prediction:</span>
              <span class="reveal-value your-value"></span>
            </div>
            <div class="actual-result">
              <span class="reveal-label">Actual result:</span>
              <span class="reveal-value actual-value">${this.correctAnswer}</span>
            </div>
          </div>
          <div class="reveal-verdict"></div>
        </div>
        
        <!-- Feedback -->
        <div class="activity-feedback"></div>
        
        <!-- Explanation (shown after reveal) -->
        <div class="prediction-explanation" style="display: none;">
          <div class="explanation-label">💡 Why?</div>
          <div class="explanation-text">${this.explanation}</div>
        </div>
      </div>
    `;
    
    this.addPredictionStyles();
  }
  
  /**
   * Render the setup section (code or text)
   */
  renderSetup() {
    if (this.setup.type === 'code') {
      const code = this.escapeHtml(this.setup.code || '');
      const lang = this.setup.language || 'text';
      const numberedCode = this.addLineNumbers(code);
      
      return `
        <div class="setup-label">📋 Consider this code:</div>
        <div class="activity-code">
          <div class="code-header">
            <span class="code-lang">${lang}</span>
          </div>
          <pre><code class="language-${lang}">${numberedCode}</code></pre>
        </div>
      `;
    }
    
    // Text setup
    return `
      <div class="setup-label">📋 Consider this:</div>
      <div class="setup-text">${this.setup.text || ''}</div>
    `;
  }
  
  /**
   * Add line numbers to code
   */
  addLineNumbers(code) {
    const lines = code.split('\n');
    return lines.map((line, i) => {
      const lineNum = String(i + 1).padStart(2, ' ');
      return `<span class="line-number">${lineNum}</span>${this.escapeHtml(line)}`;
    }).join('\n');
  }
  
  /**
   * Escape HTML special characters
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
  
  /**
   * Add prediction-specific CSS
   */
  addPredictionStyles() {
    if (document.getElementById('prediction-activity-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'prediction-activity-styles';
    style.textContent = `
      .prediction-activity {
        padding: 0.5rem;
      }
      
      .prediction-setup {
        margin-bottom: 1.5rem;
      }
      
      .setup-label {
        font-size: 0.85rem;
        color: var(--text-muted, #666);
        margin-bottom: 0.5rem;
      }
      
      .setup-text {
        background: var(--bg-tertiary, #1a1a2e);
        padding: 1rem;
        border-radius: 8px;
        line-height: 1.6;
      }
      
      .activity-code {
        background: #0d1117;
        border-radius: 8px;
        overflow: hidden;
        font-family: 'JetBrains Mono', 'Fira Code', monospace;
      }
      
      .code-header {
        background: rgba(255, 255, 255, 0.05);
        padding: 0.5rem 1rem;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      }
      
      .code-lang {
        font-size: 0.75rem;
        text-transform: uppercase;
        color: var(--accent-secondary, #4db6ac);
        font-weight: 600;
        letter-spacing: 0.05em;
      }
      
      .activity-code pre {
        margin: 0;
        padding: 1rem;
        overflow-x: auto;
        font-size: 0.9rem;
        line-height: 1.6;
      }
      
      .activity-code code {
        color: #e6edf3;
      }
      
      .line-number {
        display: inline-block;
        width: 2.5em;
        color: #6e7681;
        user-select: none;
        margin-right: 0.5em;
      }
      
      .prediction-question {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        background: var(--bg-tertiary, #1a1a2e);
        padding: 1rem;
        border-radius: 8px;
        margin-bottom: 1.5rem;
      }
      
      .question-icon {
        font-size: 1.5rem;
        flex-shrink: 0;
      }
      
      .question-text {
        font-size: 1.05rem;
        font-weight: 500;
        color: var(--text-primary, #e6e6e6);
      }
      
      .prediction-input-area {
        margin-bottom: 1rem;
      }
      
      .prediction-input-area label {
        display: block;
        font-size: 0.9rem;
        font-weight: 500;
        margin-bottom: 0.5rem;
        color: var(--text-secondary, #a0a0a0);
      }
      
      .prediction-input {
        width: 100%;
        background: var(--bg-tertiary, #1a1a2e);
        border: 2px solid var(--border-color, #333);
        color: var(--text-primary, #e6e6e6);
        padding: 0.75rem 1rem;
        border-radius: 8px;
        font-size: 1.1rem;
        font-family: 'JetBrains Mono', monospace;
        box-sizing: border-box;
        transition: border-color 0.2s ease;
      }
      
      .prediction-input:focus {
        outline: none;
        border-color: var(--accent-primary, #7986cb);
      }
      
      .prediction-input::placeholder {
        color: var(--text-muted, #666);
        font-family: inherit;
      }
      
      .prediction-input:disabled {
        opacity: 0.7;
        cursor: not-allowed;
      }
      
      /* Reveal Section */
      .prediction-reveal {
        margin-top: 1.5rem;
        padding: 1.5rem;
        background: var(--bg-secondary, #16213e);
        border-radius: 12px;
        animation: revealSlide 0.5s ease;
      }
      
      @keyframes revealSlide {
        from {
          opacity: 0;
          transform: translateY(20px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
      
      .reveal-comparison {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 1rem;
        margin-bottom: 1rem;
      }
      
      @media (max-width: 500px) {
        .reveal-comparison {
          grid-template-columns: 1fr;
        }
      }
      
      .your-prediction,
      .actual-result {
        padding: 1rem;
        border-radius: 8px;
        text-align: center;
      }
      
      .your-prediction {
        background: var(--bg-tertiary, #1a1a2e);
      }
      
      .actual-result {
        background: rgba(77, 182, 172, 0.15);
        border: 2px solid var(--accent-secondary, #4db6ac);
      }
      
      .reveal-label {
        display: block;
        font-size: 0.8rem;
        color: var(--text-muted, #666);
        margin-bottom: 0.5rem;
      }
      
      .reveal-value {
        display: block;
        font-size: 1.25rem;
        font-weight: 600;
        font-family: 'JetBrains Mono', monospace;
        color: var(--text-primary, #e6e6e6);
      }
      
      .reveal-verdict {
        text-align: center;
        font-size: 1.1rem;
        font-weight: 600;
        padding: 0.75rem;
        border-radius: 8px;
      }
      
      .reveal-verdict.correct {
        background: rgba(102, 187, 106, 0.2);
        color: var(--accent-success, #66bb6a);
      }
      
      .reveal-verdict.incorrect {
        background: rgba(239, 83, 80, 0.1);
        color: var(--accent-error, #ef5350);
      }
      
      /* Explanation */
      .prediction-explanation {
        margin-top: 1.5rem;
        padding: 1rem;
        background: rgba(121, 134, 203, 0.1);
        border-radius: 8px;
        border-left: 4px solid var(--accent-primary, #7986cb);
        animation: fadeSlideIn 0.4s ease;
      }
      
      @keyframes fadeSlideIn {
        from {
          opacity: 0;
          transform: translateY(10px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
      
      .explanation-label {
        font-size: 0.85rem;
        font-weight: 600;
        color: var(--accent-primary, #7986cb);
        margin-bottom: 0.5rem;
      }
      
      .explanation-text {
        color: var(--text-secondary, #a0a0a0);
        line-height: 1.6;
      }
      
      /* Common mistake feedback */
      .mistake-feedback {
        margin-top: 0.75rem;
        padding: 0.75rem;
        background: rgba(255, 167, 38, 0.1);
        border-radius: 6px;
        border-left: 3px solid var(--accent-warning, #ffa726);
        font-size: 0.9rem;
        color: var(--text-secondary, #a0a0a0);
      }
    `;
    
    document.head.appendChild(style);
  }
  
  /**
   * Bind event handlers
   */
  bindEvents() {
    super.bindEvents();
    
    const input = this.container.querySelector('.prediction-input');
    if (!input) return;
    
    // Track input
    input.addEventListener('input', () => {
      this.prediction = input.value;
      this.updateSubmitButton();
    });
    
    // Start activity on first interaction
    input.addEventListener('focus', () => this.start(), { once: true });
    
    // Allow submit on Enter
    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' && this.validate()) {
        this.submit();
      }
    });
  }
  
  /**
   * Check if activity is in a submittable state
   */
  validate() {
    return this.prediction.trim().length > 0;
  }
  
  /**
   * Get validation message
   */
  getValidationMessage() {
    return 'Please enter your prediction before submitting.';
  }
  
  /**
   * Get the result of the prediction
   */
  getResult() {
    const normalizedPrediction = this.prediction.trim().toLowerCase();
    
    // Check if prediction matches any acceptable variant
    const correct = this.acceptableVariants.some(variant => 
      normalizedPrediction === variant.toLowerCase()
    );
    
    // Check for common mistakes to provide targeted feedback
    let mistakeFeedback = '';
    if (!correct && this.commonMistakes) {
      for (const [mistake, msg] of Object.entries(this.commonMistakes)) {
        if (normalizedPrediction === mistake.toLowerCase()) {
          mistakeFeedback = msg;
          break;
        }
      }
    }
    
    return {
      correct,
      score: correct ? 1.0 : 0.0,
      response: {
        prediction: this.prediction,
        expectedAnswer: this.correctAnswer,
        mistakeFeedback: mistakeFeedback || null
      },
      message: correct 
        ? '✓ Your prediction was correct!' 
        : mistakeFeedback || `The actual output is: ${this.correctAnswer}`
    };
  }
  
  /**
   * Show feedback with reveal animation
   */
  showFeedback(result) {
    // Update reveal section
    const revealEl = this.container.querySelector('.prediction-reveal');
    const explanationEl = this.container.querySelector('.prediction-explanation');
    
    if (revealEl) {
      // Set prediction value
      const yourValueEl = revealEl.querySelector('.your-value');
      if (yourValueEl) {
        yourValueEl.textContent = this.prediction;
      }
      
      // Set verdict
      const verdictEl = revealEl.querySelector('.reveal-verdict');
      if (verdictEl) {
        verdictEl.classList.add(result.correct ? 'correct' : 'incorrect');
        verdictEl.textContent = result.correct ? '✓ Correct!' : '✗ Not quite';
      }
      
      // Show reveal
      revealEl.style.display = 'block';
      
      // Animate with anime.js if available
      if (typeof anime !== 'undefined') {
        anime({
          targets: revealEl,
          opacity: [0, 1],
          translateY: [20, 0],
          duration: 500,
          easing: 'easeOutCubic'
        });
      }
    }
    
    // Show common mistake feedback if applicable
    if (result.response.mistakeFeedback && !result.correct) {
      const feedbackArea = this.container.querySelector('.activity-feedback');
      if (feedbackArea) {
        feedbackArea.innerHTML = `
          <div class="mistake-feedback">
            💡 ${result.response.mistakeFeedback}
          </div>
        `;
        feedbackArea.classList.add('visible');
      }
    }
    
    // Show explanation after delay
    setTimeout(() => {
      if (explanationEl && this.explanation) {
        explanationEl.style.display = 'block';
        
        if (typeof anime !== 'undefined') {
          anime({
            targets: explanationEl,
            opacity: [0, 1],
            translateY: [10, 0],
            duration: 400,
            easing: 'easeOutCubic'
          });
        }
      }
    }, 600);
    
    // Disable input
    const input = this.container.querySelector('.prediction-input');
    if (input) {
      input.disabled = true;
    }
    
    // Update submit button
    const submitBtn = this.container.querySelector('.activity-submit-btn');
    if (submitBtn) {
      submitBtn.textContent = result.correct ? '✓ Correct!' : '✗ Revealed';
      submitBtn.disabled = true;
      submitBtn.classList.add(result.correct ? 'correct' : 'incorrect');
    }
    
    this.hasRevealed = true;
  }
  
  /**
   * Reset to initial state
   */
  reset() {
    this.prediction = '';
    this.hasRevealed = false;
    
    // Reset input
    const input = this.container.querySelector('.prediction-input');
    if (input) {
      input.value = '';
      input.disabled = false;
    }
    
    // Hide reveal
    const revealEl = this.container.querySelector('.prediction-reveal');
    if (revealEl) {
      revealEl.style.display = 'none';
      const verdictEl = revealEl.querySelector('.reveal-verdict');
      if (verdictEl) {
        verdictEl.classList.remove('correct', 'incorrect');
        verdictEl.textContent = '';
      }
    }
    
    // Hide explanation
    const explanationEl = this.container.querySelector('.prediction-explanation');
    if (explanationEl) {
      explanationEl.style.display = 'none';
    }
    
    // Reset submit button
    const submitBtn = this.container.querySelector('.activity-submit-btn');
    if (submitBtn) {
      submitBtn.textContent = '🔒 Lock In Prediction';
      submitBtn.classList.remove('correct', 'incorrect');
    }
    
    super.reset();
  }
}

// Register with ActivityRegistry
if (typeof ActivityRegistry !== 'undefined') {
  ActivityRegistry.register('prediction', PredictionActivity);
}

// Export for use as module or global
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PredictionActivity;
} else if (typeof window !== 'undefined') {
  window.PredictionActivity = PredictionActivity;
}
