/**
 * SequenceActivity - Drag and drop items into correct order
 * 
 * Extends BaseActivity to provide sequence ordering with partial credit.
 * Great for teaching processes, algorithms, and step-by-step procedures.
 * 
 * Usage:
 *   const sequence = new SequenceActivity('container-id', {
 *     id: 'seq-variable-creation',
 *     type: 'sequence',
 *     instruction: 'Put these steps in order:',
 *     items: [
 *       { id: 'step-1', text: 'You write: name = "Alice"' },
 *       { id: 'step-2', text: 'Computer reserves memory' },
 *       { id: 'step-3', text: 'Value stored in memory' }
 *     ],
 *     correctOrder: ['step-1', 'step-2', 'step-3'],
 *     hints: {
 *       partial: 'Some are correct, keep trying!',
 *       wrong: 'Think about what happens first'
 *     },
 *     points: 20
 *   });
 *   sequence.init();
 */

class SequenceActivity extends BaseActivity {
  constructor(containerId, activityData, options = {}) {
    super(containerId, activityData, options);
    
    // Sequence-specific state
    this.originalItems = [...activityData.items];
    this.items = this.shuffleArray([...activityData.items]);
    this.correctOrder = activityData.correctOrder;
    this.currentOrder = this.items.map(item => item.id);
    this.hints = activityData.hints || {};
    this.draggedItem = null;
    this.touchStartY = 0;
  }
  
  /**
   * Render the sequence UI with draggable items
   */
  render() {
    const itemsHtml = this.items.map((item, index) => `
      <div class="sequence-item" draggable="true" data-id="${item.id}">
        <span class="sequence-handle">⋮⋮</span>
        <span class="sequence-number">${index + 1}</span>
        <span class="sequence-text">${item.text}</span>
      </div>
    `).join('');
    
    this.container.innerHTML = `
      <div class="sequence-activity">
        <div class="activity-instruction">${this.activityData.instruction}</div>
        
        <div class="sequence-list">
          ${itemsHtml}
        </div>
        
        <div class="sequence-actions">
          <button class="activity-submit-btn">Check Order</button>
        </div>
        
        <div class="activity-feedback"></div>
      </div>
    `;
    
    // Initialize drag and drop
    this.initDragDrop();
  }
  
  /**
   * Initialize drag and drop event handlers
   */
  initDragDrop() {
    const list = this.container.querySelector('.sequence-list');
    const items = list.querySelectorAll('.sequence-item');
    
    items.forEach(item => {
      // Mouse drag events
      item.addEventListener('dragstart', (e) => this.handleDragStart(e, item));
      item.addEventListener('dragend', (e) => this.handleDragEnd(e, item));
      item.addEventListener('dragover', (e) => this.handleDragOver(e, item, list));
      
      // Touch events for mobile
      item.addEventListener('touchstart', (e) => this.handleTouchStart(e, item), { passive: false });
      item.addEventListener('touchmove', (e) => this.handleTouchMove(e, item, list), { passive: false });
      item.addEventListener('touchend', (e) => this.handleTouchEnd(e, item));
    });
  }
  
  /**
   * Handle drag start
   */
  handleDragStart(e, item) {
    this.start(); // Start activity timing
    this.draggedItem = item;
    item.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', item.dataset.id);
  }
  
  /**
   * Handle drag end
   */
  handleDragEnd(e, item) {
    item.classList.remove('dragging');
    this.draggedItem = null;
    this.updateOrder();
  }
  
  /**
   * Handle drag over (reordering)
   */
  handleDragOver(e, item, list) {
    e.preventDefault();
    const dragging = list.querySelector('.dragging');
    if (!dragging || item === dragging) return;
    
    const rect = item.getBoundingClientRect();
    const midY = rect.top + rect.height / 2;
    
    if (e.clientY < midY) {
      list.insertBefore(dragging, item);
    } else {
      list.insertBefore(dragging, item.nextSibling);
    }
  }
  
  /**
   * Handle touch start (mobile)
   */
  handleTouchStart(e, item) {
    this.start();
    this.draggedItem = item;
    this.touchStartY = e.touches[0].clientY;
    item.classList.add('dragging');
    
    // Prevent scrolling while dragging
    e.preventDefault();
  }
  
  /**
   * Handle touch move (mobile reordering)
   */
  handleTouchMove(e, item, list) {
    if (!this.draggedItem) return;
    e.preventDefault();
    
    const touch = e.touches[0];
    const touchY = touch.clientY;
    
    // Find element under touch point
    const elemBelow = document.elementFromPoint(touch.clientX, touchY);
    const targetItem = elemBelow?.closest('.sequence-item');
    
    if (targetItem && targetItem !== this.draggedItem) {
      const rect = targetItem.getBoundingClientRect();
      const midY = rect.top + rect.height / 2;
      
      if (touchY < midY) {
        list.insertBefore(this.draggedItem, targetItem);
      } else {
        list.insertBefore(this.draggedItem, targetItem.nextSibling);
      }
    }
  }
  
  /**
   * Handle touch end (mobile)
   */
  handleTouchEnd(e, item) {
    if (this.draggedItem) {
      this.draggedItem.classList.remove('dragging');
      this.draggedItem = null;
      this.updateOrder();
    }
  }
  
  /**
   * Update the current order based on DOM positions
   */
  updateOrder() {
    const items = this.container.querySelectorAll('.sequence-item');
    this.currentOrder = Array.from(items).map(item => item.dataset.id);
    
    // Update visual numbers
    items.forEach((item, i) => {
      const numberEl = item.querySelector('.sequence-number');
      if (numberEl) {
        numberEl.textContent = i + 1;
      }
    });
    
    // Report progress
    const { correctPositions, total } = this.calculateScore();
    this.onProgress({ correct: correctPositions, total });
  }
  
  /**
   * Calculate the number of items in correct positions
   */
  calculateScore() {
    let correctPositions = 0;
    
    this.currentOrder.forEach((id, index) => {
      if (id === this.correctOrder[index]) {
        correctPositions++;
      }
    });
    
    return {
      correctPositions,
      total: this.correctOrder.length
    };
  }
  
  /**
   * Check if sequence is in a submittable state (always true - can submit anytime)
   */
  validate() {
    return true;
  }
  
  /**
   * Get validation message
   */
  getValidationMessage() {
    return 'Drag items to reorder them, then click Check Order.';
  }
  
  /**
   * Get the result of the sequence activity
   */
  getResult() {
    const { correctPositions, total } = this.calculateScore();
    const score = total > 0 ? correctPositions / total : 0;
    const correct = score === 1.0;
    
    // Determine message based on score
    let message;
    if (correct) {
      message = 'Perfect order!';
    } else if (score >= 0.5 && this.hints.partial) {
      message = this.hints.partial;
    } else if (score < 0.5 && this.hints.wrong) {
      message = this.hints.wrong;
    } else {
      message = `${correctPositions}/${total} in correct position`;
    }
    
    return {
      correct,
      score,
      response: {
        userOrder: [...this.currentOrder],
        correctOrder: [...this.correctOrder],
        correctPositions,
        totalPositions: total
      },
      message
    };
  }
  
  /**
   * Show feedback with visual indicators on items
   */
  showFeedback(result) {
    const items = this.container.querySelectorAll('.sequence-item');
    
    items.forEach((item, index) => {
      const itemId = item.dataset.id;
      const isCorrect = itemId === this.correctOrder[index];
      
      item.classList.remove('correct', 'incorrect');
      item.classList.add(isCorrect ? 'correct' : 'incorrect');
      
      // Disable dragging after submission if complete
      if (result.correct) {
        item.setAttribute('draggable', 'false');
        item.style.cursor = 'default';
      }
    });
    
    // Update submit button
    const submitBtn = this.container.querySelector('.activity-submit-btn');
    if (submitBtn) {
      if (result.correct) {
        submitBtn.textContent = '✓ Correct!';
        submitBtn.disabled = true;
        submitBtn.classList.add('correct');
      } else {
        submitBtn.textContent = 'Try Again';
        submitBtn.classList.add('incorrect');
        
        // Allow retry after a delay
        setTimeout(() => {
          submitBtn.textContent = 'Check Order';
          submitBtn.classList.remove('incorrect');
          
          // Clear incorrect markers to allow retry
          items.forEach(item => {
            item.classList.remove('incorrect');
          });
        }, 2000);
      }
    }
    
    // Call parent feedback method
    super.showFeedback(result);
  }
  
  /**
   * Reset sequence to initial state
   */
  reset() {
    // Reshuffle items
    this.items = this.shuffleArray([...this.originalItems]);
    this.currentOrder = this.items.map(item => item.id);
    this.draggedItem = null;
    
    // Reset submit button
    const submitBtn = this.container.querySelector('.activity-submit-btn');
    if (submitBtn) {
      submitBtn.textContent = 'Check Order';
      submitBtn.disabled = false;
      submitBtn.classList.remove('correct', 'incorrect');
    }
    
    // Re-render
    super.reset();
  }
}

// Register with ActivityRegistry
if (typeof ActivityRegistry !== 'undefined') {
  ActivityRegistry.register('sequence', SequenceActivity);
}

// Export for use as module or global
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SequenceActivity;
} else if (typeof window !== 'undefined') {
  window.SequenceActivity = SequenceActivity;
}
