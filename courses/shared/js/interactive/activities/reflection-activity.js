/**
 * ReflectionActivity - Open-ended reflection prompts with depth evaluation
 * 
 * Extends BaseActivity to provide metacognitive reflection prompts.
 * Evaluates response depth through pattern matching, not just keywords.
 * 
 * Usage:
 *   const reflection = new ReflectionActivity('container-id', {
 *     id: 'reflect-variables',
 *     type: 'reflection',
 *     prompt: 'How has your understanding of variables changed?',
 *     thinkingPrompts: ['What surprised you?', 'What is still confusing?'],
 *     evaluation: {
 *       minWords: 50,
 *       depthIndicators: [
 *         { pattern: 'I (thought|believed)', label: 'Personal connection', points: 5 }
 *       ],
 *       maxScore: 20
 *     },
 *     points: 20
 *   });
 *   reflection.init();
 * 
 * Data Structure:
 *   {
 *     id: string,
 *     type: 'reflection',
 *     prompt: string,              // Main reflection prompt
 *     thinkingPrompts: string[],   // Helper questions
 *     evaluation: {
 *       minWords: number,          // Minimum word count
 *       depthIndicators: [{        // Patterns to detect depth
 *         pattern: string|RegExp,
 *         label: string,
 *         points: number
 *       }],
 *       maxScore: number
 *     },
 *     points: number
 *   }
 */

class ReflectionActivity extends BaseActivity {
  constructor(containerId, activityData, options = {}) {
    super(containerId, activityData, options);
    
    // Reflection-specific state
    this.response = '';
    this.evaluation = activityData.evaluation || {};
    this.thinkingPrompts = activityData.thinkingPrompts || [];
    this.showingPrompts = false;
    this.minWords = this.evaluation.minWords || 50;
  }
  
  /**
   * Render the reflection UI
   */
  render() {
    const promptsHtml = this.thinkingPrompts.length > 0 ? `
      <div class="thinking-prompts-toggle">
        <button class="toggle-btn" type="button">💡 Need help getting started?</button>
      </div>
      <div class="thinking-prompts" style="display: none;">
        <div class="prompts-label">Consider these questions:</div>
        <ul class="prompts-list">
          ${this.thinkingPrompts.map(p => `<li>${p}</li>`).join('')}
        </ul>
      </div>
    ` : '';
    
    this.container.innerHTML = `
      <div class="reflection-activity">
        <div class="reflection-prompt">
          <span class="prompt-icon">🪞</span>
          <div class="prompt-text">${this.activityData.prompt}</div>
        </div>
        
        ${promptsHtml}
        
        <div class="reflection-response">
          <textarea 
            class="activity-textarea reflection-textarea" 
            placeholder="Take a moment to reflect..."
          ></textarea>
          <div class="textarea-footer">
            <div class="activity-word-count">
              <span class="word-count">0</span> / <span class="min-words">${this.minWords}</span> words
            </div>
            <div class="depth-indicators"></div>
          </div>
        </div>
        
        <button class="activity-submit-btn" disabled>Submit Reflection</button>
        <div class="activity-feedback"></div>
      </div>
    `;
    
    this.applyStyles();
  }
  
  /**
   * Apply component-specific styles
   */
  applyStyles() {
    // Check if styles already exist
    if (document.getElementById('reflection-activity-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'reflection-activity-styles';
    style.textContent = `
      .reflection-activity {
        padding: 0.5rem;
      }
      
      .reflection-prompt {
        display: flex;
        align-items: flex-start;
        gap: 1rem;
        padding: 1.5rem;
        background: linear-gradient(135deg, rgba(121, 134, 203, 0.1), rgba(77, 182, 172, 0.1));
        border-radius: 12px;
        border-left: 4px solid var(--accent-primary, #7986cb);
        margin-bottom: 1.5rem;
      }
      
      .prompt-icon {
        font-size: 2rem;
        flex-shrink: 0;
      }
      
      .prompt-text {
        font-size: 1.1rem;
        line-height: 1.6;
        color: var(--text-primary, #e8e8f0);
      }
      
      .thinking-prompts-toggle {
        margin-bottom: 1rem;
      }
      
      .thinking-prompts-toggle .toggle-btn {
        background: transparent;
        border: none;
        color: var(--accent-secondary, #4db6ac);
        cursor: pointer;
        font-size: 0.9rem;
        padding: 0;
      }
      
      .thinking-prompts-toggle .toggle-btn:hover {
        text-decoration: underline;
      }
      
      .thinking-prompts {
        background: var(--bg-tertiary, rgba(30, 30, 50, 0.5));
        padding: 1rem;
        border-radius: 8px;
        margin-bottom: 1rem;
        animation: slideDown 0.2s ease-out;
      }
      
      @keyframes slideDown {
        from { opacity: 0; transform: translateY(-10px); }
        to { opacity: 1; transform: translateY(0); }
      }
      
      .prompts-label {
        font-size: 0.85rem;
        color: var(--text-muted, #8888a8);
        margin-bottom: 0.5rem;
      }
      
      .prompts-list {
        margin: 0;
        padding-left: 1.5rem;
        color: var(--text-secondary, #b8b8c8);
      }
      
      .prompts-list li {
        margin-bottom: 0.25rem;
      }
      
      .reflection-response {
        margin-bottom: 1.5rem;
      }
      
      .reflection-textarea {
        width: 100%;
        min-height: 180px;
        padding: 1rem;
        background: var(--bg-card, #1a1a2e);
        border: 2px solid var(--border-color, #333355);
        border-radius: 8px;
        color: var(--text-primary, #e8e8f0);
        font-size: 1rem;
        font-family: inherit;
        resize: vertical;
        transition: border-color 0.2s;
      }
      
      .reflection-textarea:focus {
        outline: none;
        border-color: var(--accent-primary, #7986cb);
      }
      
      .reflection-textarea::placeholder {
        color: var(--text-muted, #8888a8);
      }
      
      .textarea-footer {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-top: 0.5rem;
        flex-wrap: wrap;
        gap: 0.5rem;
      }
      
      .activity-word-count {
        font-size: 0.85rem;
        color: var(--text-muted, #8888a8);
        transition: color 0.2s;
      }
      
      .activity-word-count.valid {
        color: var(--accent-success, #4db6ac);
      }
      
      .activity-word-count.invalid {
        color: var(--accent-warning, #ffa726);
      }
      
      .depth-indicators {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
        align-items: center;
      }
      
      .indicators-label {
        font-size: 0.8rem;
        color: var(--text-muted, #8888a8);
      }
      
      .indicator-badge {
        background: rgba(77, 182, 172, 0.2);
        color: var(--accent-secondary, #4db6ac);
        padding: 0.2rem 0.5rem;
        border-radius: 12px;
        font-size: 0.75rem;
        animation: fadeIn 0.3s ease-out;
      }
      
      @keyframes fadeIn {
        from { opacity: 0; transform: scale(0.9); }
        to { opacity: 1; transform: scale(1); }
      }
    `;
    document.head.appendChild(style);
  }
  
  /**
   * Bind event handlers
   */
  bindEvents() {
    super.bindEvents();
    
    // Toggle thinking prompts
    const toggleBtn = this.container.querySelector('.toggle-btn');
    const prompts = this.container.querySelector('.thinking-prompts');
    
    if (toggleBtn && prompts) {
      toggleBtn.addEventListener('click', () => {
        this.showingPrompts = !this.showingPrompts;
        prompts.style.display = this.showingPrompts ? 'block' : 'none';
        toggleBtn.textContent = this.showingPrompts 
          ? '💡 Hide prompts' 
          : '💡 Need help getting started?';
      });
    }
    
    // Textarea input handling
    const textarea = this.container.querySelector('.reflection-textarea');
    const wordCountEl = this.container.querySelector('.word-count');
    const countContainer = this.container.querySelector('.activity-word-count');
    
    if (textarea) {
      textarea.addEventListener('input', () => {
        this.response = textarea.value;
        const words = this.getWordCount();
        
        // Update word count display
        if (wordCountEl) {
          wordCountEl.textContent = words;
        }
        
        // Update visual state
        if (countContainer) {
          countContainer.classList.toggle('valid', words >= this.minWords);
          countContainer.classList.toggle('invalid', words > 0 && words < this.minWords);
        }
        
        // Update depth indicators
        this.updateDepthIndicators();
        
        // Update submit button state
        this.updateSubmitButton();
      });
      
      // Focus starts the activity
      textarea.addEventListener('focus', () => this.start(), { once: true });
    }
  }
  
  /**
   * Update depth indicators as user types
   */
  updateDepthIndicators() {
    const container = this.container.querySelector('.depth-indicators');
    if (!container) return;
    
    const indicators = this.evaluation.depthIndicators || [];
    const detected = [];
    
    indicators.forEach(indicator => {
      const pattern = this.normalizePattern(indicator.pattern);
      if (pattern.test(this.response)) {
        detected.push(indicator.label);
      }
    });
    
    if (detected.length > 0) {
      container.innerHTML = `
        <span class="indicators-label">✨ Your reflection shows:</span>
        ${detected.map(d => `<span class="indicator-badge">${d}</span>`).join('')}
      `;
    } else {
      container.innerHTML = '';
    }
  }
  
  /**
   * Normalize pattern to RegExp
   */
  normalizePattern(pattern) {
    if (pattern instanceof RegExp) {
      return pattern;
    }
    // Assume string is a regex pattern
    try {
      return new RegExp(pattern, 'i');
    } catch (e) {
      console.warn('Invalid regex pattern:', pattern);
      return new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    }
  }
  
  /**
   * Get word count from response
   */
  getWordCount() {
    return this.response.trim().split(/\s+/).filter(w => w).length;
  }
  
  /**
   * Check if reflection meets minimum requirements
   */
  validate() {
    return this.getWordCount() >= this.minWords;
  }
  
  /**
   * Get validation message
   */
  getValidationMessage() {
    const words = this.getWordCount();
    const remaining = this.minWords - words;
    return `Please write at least ${remaining} more word${remaining !== 1 ? 's' : ''} to submit.`;
  }
  
  /**
   * Evaluate response depth and get result
   */
  getResult() {
    const words = this.getWordCount();
    const indicators = this.evaluation.depthIndicators || [];
    
    let totalPoints = 0;
    const detectedIndicators = [];
    
    // Check each depth indicator
    indicators.forEach(indicator => {
      const pattern = this.normalizePattern(indicator.pattern);
      if (pattern.test(this.response)) {
        totalPoints += indicator.points;
        detectedIndicators.push(indicator.label);
      }
    });
    
    // Bonus for length
    if (words >= 100) totalPoints += 3;
    if (words >= 150) totalPoints += 2;
    
    const maxScore = this.evaluation.maxScore || 20;
    const score = Math.min(1.0, totalPoints / maxScore);
    
    return {
      correct: score >= 0.5, // Reflections are always somewhat "correct"
      score,
      response: {
        text: this.response,
        wordCount: words,
        detectedIndicators,
        totalPoints,
        maxPoints: maxScore
      },
      message: this.generateFeedbackMessage(detectedIndicators, words)
    };
  }
  
  /**
   * Generate feedback message based on depth
   */
  generateFeedbackMessage(indicators, words) {
    if (indicators.length === 0) {
      return 'Thank you for reflecting! Try connecting your thoughts to specific concepts you learned.';
    } else if (indicators.length < 3) {
      return `Good reflection! You showed: ${indicators.join(', ')}`;
    } else {
      return `Excellent depth! Your reflection demonstrates: ${indicators.join(', ')}`;
    }
  }
  
  /**
   * Show feedback with detected indicators
   */
  showFeedback(result) {
    const feedbackEl = this.container.querySelector('.activity-feedback');
    if (!feedbackEl) return;
    
    const { score, response } = result;
    const { detectedIndicators } = response;
    
    let feedbackClass = 'partial';
    let icon = '💭';
    
    if (score >= 0.8) {
      feedbackClass = 'correct';
      icon = '🌟';
    } else if (score >= 0.5) {
      feedbackClass = 'partial';
      icon = '👍';
    }
    
    const pointsEarned = Math.round(this.points * score);
    
    feedbackEl.innerHTML = `
      <div class="feedback-content ${feedbackClass}">
        <span class="feedback-icon">${icon}</span>
        <span class="feedback-message">${result.message}</span>
        ${pointsEarned > 0 ? `<span class="feedback-points">+${pointsEarned} pts</span>` : ''}
      </div>
      ${detectedIndicators.length > 0 ? `
        <div class="feedback-indicators">
          <span class="indicators-title">Depth indicators found:</span>
          ${detectedIndicators.map(d => `<span class="indicator-badge">${d}</span>`).join('')}
        </div>
      ` : ''}
    `;
    
    feedbackEl.classList.add('visible', feedbackClass);
    
    // Disable textarea after submission
    const textarea = this.container.querySelector('.reflection-textarea');
    if (textarea) {
      textarea.readOnly = true;
      textarea.style.opacity = '0.8';
    }
    
    // Animate in
    if (typeof anime !== 'undefined') {
      anime({
        targets: feedbackEl,
        opacity: [0, 1],
        translateY: [10, 0],
        duration: 300,
        easing: 'easeOutCubic'
      });
    }
  }
  
  /**
   * Reset reflection to initial state
   */
  reset() {
    this.response = '';
    this.showingPrompts = false;
    
    const textarea = this.container.querySelector('.reflection-textarea');
    if (textarea) {
      textarea.value = '';
      textarea.readOnly = false;
      textarea.style.opacity = '1';
    }
    
    const prompts = this.container.querySelector('.thinking-prompts');
    if (prompts) {
      prompts.style.display = 'none';
    }
    
    const toggleBtn = this.container.querySelector('.toggle-btn');
    if (toggleBtn) {
      toggleBtn.textContent = '💡 Need help getting started?';
    }
    
    const wordCountEl = this.container.querySelector('.word-count');
    if (wordCountEl) {
      wordCountEl.textContent = '0';
    }
    
    const countContainer = this.container.querySelector('.activity-word-count');
    if (countContainer) {
      countContainer.classList.remove('valid', 'invalid');
    }
    
    const indicatorsEl = this.container.querySelector('.depth-indicators');
    if (indicatorsEl) {
      indicatorsEl.innerHTML = '';
    }
    
    super.reset();
  }
}

// Register with ActivityRegistry
if (typeof ActivityRegistry !== 'undefined') {
  ActivityRegistry.register('reflection', ReflectionActivity);
}

// Export for use as module or global
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ReflectionActivity;
} else if (typeof window !== 'undefined') {
  window.ReflectionActivity = ReflectionActivity;
}
