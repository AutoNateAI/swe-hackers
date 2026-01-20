/**
 * ScenarioActivity - Scenario analysis activity for synthesis learning
 * 
 * Students read a real-world scenario and answer "what if" questions,
 * explaining their reasoning. Evaluates understanding through keyword
 * detection and response depth analysis.
 * 
 * Usage:
 *   const scenario = new ScenarioActivity('container-id', {
 *     id: 'scenario-storage',
 *     type: 'scenario',
 *     scenario: "You're building a shopping cart...",
 *     question: 'What type of storage was likely used?',
 *     evaluation: {
 *       keywords: ['session', 'temporary', 'memory'],
 *       minWords: 20,
 *       pointsPerKeyword: 5,
 *       depthBonus: 10
 *     },
 *     modelAnswer: 'The cart likely used session storage...',
 *     points: 25
 *   });
 *   scenario.init();
 * 
 * Data Structure:
 *   {
 *     id: string,           // Unique identifier
 *     type: 'scenario',     // Activity type
 *     scenario: string,     // The scenario description
 *     question: string,     // Question about the scenario
 *     evaluation: {
 *       keywords: string[], // Keywords to match in response
 *       minWords: number,   // Minimum word count
 *       pointsPerKeyword: number, // Points per matched keyword
 *       depthBonus: number  // Bonus for thorough explanation
 *     },
 *     modelAnswer: string,  // Example answer shown after submission
 *     points: number        // Total possible points
 *   }
 */

class ScenarioActivity extends BaseActivity {
  constructor(containerId, activityData, options = {}) {
    super(containerId, activityData, options);
    
    // Scenario-specific state
    this.response = '';
    this.scenario = activityData.scenario || '';
    this.question = activityData.question || '';
    this.evaluation = activityData.evaluation || {};
    this.modelAnswer = activityData.modelAnswer || '';
    
    // Evaluation defaults
    this.evaluation.keywords = this.evaluation.keywords || [];
    this.evaluation.minWords = this.evaluation.minWords || 20;
    this.evaluation.pointsPerKeyword = this.evaluation.pointsPerKeyword || 5;
    this.evaluation.depthBonus = this.evaluation.depthBonus || 10;
  }
  
  /**
   * Render the scenario activity UI
   */
  render() {
    this.container.innerHTML = `
      <div class="scenario-activity">
        <!-- Scenario Box -->
        <div class="scenario-box">
          <div class="scenario-label">📖 Scenario</div>
          <div class="scenario-text">${this.scenario}</div>
        </div>
        
        <!-- Question -->
        <div class="scenario-question">
          <div class="question-label">❓ Question</div>
          <div class="question-text">${this.question}</div>
        </div>
        
        <!-- Response Area -->
        <div class="scenario-response">
          <label for="${this.id}-textarea">Your Analysis:</label>
          <textarea 
            id="${this.id}-textarea"
            class="activity-textarea" 
            placeholder="Explain your reasoning..."
            rows="5"
          ></textarea>
          <div class="activity-word-count">
            <span class="word-count">0</span> / <span class="min-words">${this.evaluation.minWords}</span> words minimum
          </div>
        </div>
        
        <!-- Submit Button -->
        <button class="activity-submit-btn" disabled>
          Submit Analysis
        </button>
        
        <!-- Feedback -->
        <div class="activity-feedback"></div>
        
        <!-- Model Answer (hidden until submission) -->
        <div class="model-answer" style="display: none;">
          <div class="model-label">💡 Model Answer</div>
          <div class="model-text">${this.modelAnswer}</div>
        </div>
      </div>
    `;
    
    this.addScenarioStyles();
  }
  
  /**
   * Add scenario-specific CSS
   */
  addScenarioStyles() {
    if (document.getElementById('scenario-activity-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'scenario-activity-styles';
    style.textContent = `
      .scenario-activity {
        padding: 0.5rem;
      }
      
      .scenario-box {
        background: var(--bg-tertiary, #1a1a2e);
        border-radius: 8px;
        padding: 1.25rem;
        margin-bottom: 1.5rem;
        border-left: 4px solid var(--accent-primary, #7986cb);
      }
      
      .scenario-label,
      .question-label,
      .model-label {
        font-size: 0.8rem;
        font-weight: 600;
        color: var(--accent-secondary, #4db6ac);
        text-transform: uppercase;
        letter-spacing: 0.05em;
        margin-bottom: 0.5rem;
      }
      
      .scenario-text {
        line-height: 1.7;
        color: var(--text-primary, #e6e6e6);
      }
      
      .scenario-question {
        margin-bottom: 1.5rem;
      }
      
      .question-text {
        font-size: 1.05rem;
        font-weight: 500;
        color: var(--text-primary, #e6e6e6);
      }
      
      .scenario-response {
        margin-bottom: 1rem;
      }
      
      .scenario-response label {
        display: block;
        font-size: 0.9rem;
        font-weight: 500;
        margin-bottom: 0.5rem;
        color: var(--text-secondary, #a0a0a0);
      }
      
      .activity-textarea {
        width: 100%;
        background: var(--bg-tertiary, #1a1a2e);
        border: 2px solid var(--border-color, #333);
        color: var(--text-primary, #e6e6e6);
        padding: 0.875rem 1rem;
        border-radius: 8px;
        font-size: 0.95rem;
        font-family: inherit;
        line-height: 1.6;
        resize: vertical;
        min-height: 120px;
        box-sizing: border-box;
        transition: border-color 0.2s ease;
      }
      
      .activity-textarea:focus {
        outline: none;
        border-color: var(--accent-primary, #7986cb);
      }
      
      .activity-textarea::placeholder {
        color: var(--text-muted, #666);
      }
      
      .activity-word-count {
        font-size: 0.8rem;
        color: var(--text-muted, #666);
        margin-top: 0.5rem;
        text-align: right;
        transition: color 0.2s ease;
      }
      
      .activity-word-count.valid {
        color: var(--accent-success, #66bb6a);
      }
      
      .activity-word-count.invalid {
        color: var(--accent-warning, #ffa726);
      }
      
      .model-answer {
        margin-top: 1.5rem;
        padding: 1rem;
        background: rgba(77, 182, 172, 0.1);
        border-radius: 8px;
        border-left: 4px solid var(--accent-secondary, #4db6ac);
        animation: fadeSlideIn 0.4s ease;
      }
      
      .model-text {
        color: var(--text-secondary, #a0a0a0);
        line-height: 1.6;
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
      
      /* Keywords highlight in feedback */
      .keyword-badge {
        display: inline-block;
        background: rgba(121, 134, 203, 0.2);
        color: var(--accent-primary, #7986cb);
        padding: 0.15rem 0.5rem;
        border-radius: 4px;
        font-size: 0.85rem;
        margin: 0.15rem;
      }
      
      .keywords-matched {
        margin-top: 0.75rem;
      }
      
      .keywords-matched-label {
        font-size: 0.8rem;
        color: var(--text-muted, #666);
        margin-bottom: 0.5rem;
      }
    `;
    
    document.head.appendChild(style);
  }
  
  /**
   * Bind event handlers
   */
  bindEvents() {
    super.bindEvents();
    
    const textarea = this.container.querySelector('.activity-textarea');
    if (!textarea) return;
    
    // Track input and word count
    textarea.addEventListener('input', () => {
      this.response = textarea.value;
      this.updateWordCount();
      this.updateSubmitButton();
    });
    
    // Start activity on first interaction
    textarea.addEventListener('focus', () => this.start(), { once: true });
  }
  
  /**
   * Update word count display
   */
  updateWordCount() {
    const wordCountEl = this.container.querySelector('.word-count');
    const countContainer = this.container.querySelector('.activity-word-count');
    if (!wordCountEl || !countContainer) return;
    
    const words = this.getWordCount();
    wordCountEl.textContent = words;
    
    // Visual feedback
    countContainer.classList.remove('valid', 'invalid');
    if (words >= this.evaluation.minWords) {
      countContainer.classList.add('valid');
    } else if (words > 0) {
      countContainer.classList.add('invalid');
    }
  }
  
  /**
   * Get word count from response
   */
  getWordCount() {
    return this.response.trim().split(/\s+/).filter(w => w.length > 0).length;
  }
  
  /**
   * Check if activity is in a submittable state
   */
  validate() {
    return this.getWordCount() >= this.evaluation.minWords;
  }
  
  /**
   * Get validation message
   */
  getValidationMessage() {
    const words = this.getWordCount();
    const remaining = this.evaluation.minWords - words;
    return `Please write at least ${remaining} more word${remaining === 1 ? '' : 's'} to submit.`;
  }
  
  /**
   * Evaluate the response and get result
   */
  getResult() {
    const responseLower = this.response.toLowerCase();
    const words = this.getWordCount();
    
    // Keyword matching
    const matchedKeywords = this.evaluation.keywords.filter(kw => 
      responseLower.includes(kw.toLowerCase())
    );
    
    // Calculate score
    const maxKeywordScore = this.evaluation.keywords.length * this.evaluation.pointsPerKeyword;
    const keywordScore = matchedKeywords.length * this.evaluation.pointsPerKeyword;
    
    // Depth bonus for thorough explanations (50+ words beyond minimum)
    const hasDepthBonus = words >= this.evaluation.minWords + 30;
    const depthBonus = hasDepthBonus ? this.evaluation.depthBonus : 0;
    
    // Calculate total score (0-1 range)
    const totalPossible = maxKeywordScore + this.evaluation.depthBonus;
    const totalEarned = keywordScore + depthBonus;
    const score = totalPossible > 0 ? Math.min(1.0, totalEarned / totalPossible) : 0;
    
    // Determine if "correct" (threshold: 60%)
    const correct = score >= 0.6;
    
    return {
      correct,
      score,
      response: {
        text: this.response,
        wordCount: words,
        keywordsMatched: matchedKeywords,
        keywordsTotal: this.evaluation.keywords.length,
        depthBonus: hasDepthBonus
      },
      message: this.generateFeedbackMessage(matchedKeywords, words, hasDepthBonus)
    };
  }
  
  /**
   * Generate contextual feedback message
   */
  generateFeedbackMessage(matchedKeywords, wordCount, hasDepthBonus) {
    const totalKeywords = this.evaluation.keywords.length;
    const matchCount = matchedKeywords.length;
    
    if (matchCount === 0) {
      return 'Try to include key concepts in your analysis. Review the scenario for important terms.';
    }
    
    if (matchCount < totalKeywords * 0.5) {
      return `Good start! You touched on some concepts. Consider what else might be relevant.`;
    }
    
    if (matchCount < totalKeywords) {
      const bonus = hasDepthBonus ? ' Great detail!' : '';
      return `Strong analysis! You covered most key concepts.${bonus}`;
    }
    
    const bonus = hasDepthBonus ? ' Excellent depth!' : '';
    return `Excellent analysis! You addressed all the key concepts.${bonus}`;
  }
  
  /**
   * Show feedback with model answer
   */
  showFeedback(result) {
    // Call parent feedback first
    super.showFeedback(result);
    
    // Show keywords matched in feedback area
    const feedbackEl = this.container.querySelector('.activity-feedback');
    if (feedbackEl && result.response.keywordsMatched.length > 0) {
      const keywordsHtml = `
        <div class="keywords-matched">
          <div class="keywords-matched-label">Keywords detected:</div>
          ${result.response.keywordsMatched.map(kw => 
            `<span class="keyword-badge">${kw}</span>`
          ).join('')}
        </div>
      `;
      feedbackEl.insertAdjacentHTML('beforeend', keywordsHtml);
    }
    
    // Show model answer
    const modelAnswerEl = this.container.querySelector('.model-answer');
    if (modelAnswerEl && this.modelAnswer) {
      setTimeout(() => {
        modelAnswerEl.style.display = 'block';
      }, 500);
    }
    
    // Disable textarea
    const textarea = this.container.querySelector('.activity-textarea');
    if (textarea) {
      textarea.disabled = true;
      textarea.style.opacity = '0.7';
    }
  }
  
  /**
   * Reset to initial state
   */
  reset() {
    this.response = '';
    
    // Reset textarea
    const textarea = this.container.querySelector('.activity-textarea');
    if (textarea) {
      textarea.value = '';
      textarea.disabled = false;
      textarea.style.opacity = '1';
    }
    
    // Reset word count
    this.updateWordCount();
    
    // Hide model answer
    const modelAnswerEl = this.container.querySelector('.model-answer');
    if (modelAnswerEl) {
      modelAnswerEl.style.display = 'none';
    }
    
    super.reset();
  }
}

// Register with ActivityRegistry
if (typeof ActivityRegistry !== 'undefined') {
  ActivityRegistry.register('scenario', ScenarioActivity);
}

// Export for use as module or global
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ScenarioActivity;
} else if (typeof window !== 'undefined') {
  window.ScenarioActivity = ScenarioActivity;
}
