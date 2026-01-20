/**
 * DragDropActivity - Match items to target zones by drag and drop
 * 
 * Extends BaseActivity to provide drag-drop matching with partial credit.
 * Perfect for matching terms to definitions, concepts to examples, etc.
 * 
 * Usage:
 *   const activity = new DragDropActivity('container-id', {
 *     id: 'match-datatypes',
 *     type: 'drag-drop',
 *     instruction: 'Match each data type to its example:',
 *     items: [
 *       { id: 'item-str', text: '"Hello"' },
 *       { id: 'item-int', text: '42' },
 *       { id: 'item-bool', text: 'True' }
 *     ],
 *     zones: [
 *       { id: 'zone-string', label: 'String', correct: 'item-str' },
 *       { id: 'zone-integer', label: 'Integer', correct: 'item-int' },
 *       { id: 'zone-boolean', label: 'Boolean', correct: 'item-bool' }
 *     ],
 *     points: 20
 *   });
 *   activity.init();
 */

class DragDropActivity extends BaseActivity {
  constructor(containerId, activityData, options = {}) {
    super(containerId, activityData, options);
    
    // Drag-drop specific state
    this.items = this.shuffleArray([...activityData.items]);
    this.zones = activityData.zones || [];
    this.placements = {}; // { zoneId: itemId }
    this.draggedItemId = null;
    this.touchDragging = false;
    this.touchClone = null;
  }
  
  /**
   * Render the drag-drop UI
   */
  render() {
    // Create items HTML (shuffled)
    const itemsHtml = this.items.map(item => `
      <div class="activity-draggable" draggable="true" data-id="${item.id}">
        ${item.text}
      </div>
    `).join('');
    
    // Create zones HTML
    const zonesHtml = this.zones.map(zone => `
      <div class="dragdrop-zone" data-zone="${zone.id}">
        <span class="zone-label">${zone.label}</span>
        <div class="activity-dropzone" data-zone="${zone.id}"></div>
      </div>
    `).join('');
    
    this.container.innerHTML = `
      <div class="drag-drop-activity">
        <div class="activity-instruction">${this.activityData.instruction}</div>
        
        <div class="dragdrop-layout">
          <div class="dragdrop-source">
            <h5>Drag these:</h5>
            <div class="dragdrop-items" id="${this.containerId}-items">
              ${itemsHtml}
            </div>
          </div>
          
          <div class="dragdrop-targets">
            <h5>Drop here:</h5>
            <div class="dragdrop-zones">
              ${zonesHtml}
            </div>
          </div>
        </div>
        
        <div class="dragdrop-actions">
          <button class="activity-reset-btn">↩️ Reset</button>
          <button class="activity-submit-btn" disabled>Check Matches</button>
        </div>
        
        <div class="activity-feedback"></div>
      </div>
    `;
    
    // Initialize drag and drop handlers
    this.initDragDrop();
    
    // Bind reset button
    const resetBtn = this.container.querySelector('.activity-reset-btn');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => this.resetPlacements());
    }
  }
  
  /**
   * Initialize drag and drop event handlers
   */
  initDragDrop() {
    const draggables = this.container.querySelectorAll('.activity-draggable');
    const dropzones = this.container.querySelectorAll('.activity-dropzone');
    const sourceContainer = this.container.querySelector('.dragdrop-items');
    
    // Setup draggable items
    draggables.forEach(item => {
      // Mouse events
      item.addEventListener('dragstart', (e) => this.handleDragStart(e, item));
      item.addEventListener('dragend', (e) => this.handleDragEnd(e, item));
      
      // Touch events
      item.addEventListener('touchstart', (e) => this.handleTouchStart(e, item), { passive: false });
      item.addEventListener('touchmove', (e) => this.handleTouchMove(e, item), { passive: false });
      item.addEventListener('touchend', (e) => this.handleTouchEnd(e, item));
    });
    
    // Setup drop zones
    dropzones.forEach(zone => {
      zone.addEventListener('dragover', (e) => this.handleDragOver(e, zone));
      zone.addEventListener('dragleave', (e) => this.handleDragLeave(e, zone));
      zone.addEventListener('drop', (e) => this.handleDrop(e, zone));
    });
    
    // Allow dropping back to source area
    if (sourceContainer) {
      sourceContainer.addEventListener('dragover', (e) => {
        e.preventDefault();
        sourceContainer.classList.add('drag-over');
      });
      sourceContainer.addEventListener('dragleave', () => {
        sourceContainer.classList.remove('drag-over');
      });
      sourceContainer.addEventListener('drop', (e) => {
        e.preventDefault();
        sourceContainer.classList.remove('drag-over');
        const itemId = e.dataTransfer.getData('text/plain');
        this.returnItemToSource(itemId);
      });
    }
  }
  
  /**
   * Handle drag start
   */
  handleDragStart(e, item) {
    this.start(); // Start activity timing
    this.draggedItemId = item.dataset.id;
    item.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', item.dataset.id);
  }
  
  /**
   * Handle drag end
   */
  handleDragEnd(e, item) {
    item.classList.remove('dragging');
    this.draggedItemId = null;
    
    // Remove all drag-over states
    this.container.querySelectorAll('.drag-over').forEach(el => {
      el.classList.remove('drag-over');
    });
  }
  
  /**
   * Handle drag over a drop zone
   */
  handleDragOver(e, zone) {
    e.preventDefault();
    zone.classList.add('drag-over');
  }
  
  /**
   * Handle drag leave a drop zone
   */
  handleDragLeave(e, zone) {
    zone.classList.remove('drag-over');
  }
  
  /**
   * Handle drop on a zone
   */
  handleDrop(e, zone) {
    e.preventDefault();
    zone.classList.remove('drag-over');
    
    const itemId = e.dataTransfer.getData('text/plain');
    const zoneId = zone.dataset.zone;
    
    this.placeItem(itemId, zoneId);
  }
  
  /**
   * Handle touch start (mobile)
   */
  handleTouchStart(e, item) {
    this.start();
    this.draggedItemId = item.dataset.id;
    this.touchDragging = true;
    item.classList.add('dragging');
    
    // Create a clone for visual feedback
    this.createTouchClone(item, e.touches[0]);
    
    e.preventDefault();
  }
  
  /**
   * Handle touch move (mobile)
   */
  handleTouchMove(e, item) {
    if (!this.touchDragging) return;
    e.preventDefault();
    
    const touch = e.touches[0];
    
    // Move clone
    if (this.touchClone) {
      this.touchClone.style.left = `${touch.clientX - 50}px`;
      this.touchClone.style.top = `${touch.clientY - 20}px`;
    }
    
    // Highlight drop zone under touch
    const elemBelow = document.elementFromPoint(touch.clientX, touch.clientY);
    const dropzone = elemBelow?.closest('.activity-dropzone');
    const sourceArea = elemBelow?.closest('.dragdrop-items');
    
    // Clear all highlights
    this.container.querySelectorAll('.drag-over').forEach(el => {
      el.classList.remove('drag-over');
    });
    
    // Highlight current target
    if (dropzone) {
      dropzone.classList.add('drag-over');
    } else if (sourceArea) {
      sourceArea.classList.add('drag-over');
    }
  }
  
  /**
   * Handle touch end (mobile)
   */
  handleTouchEnd(e, item) {
    if (!this.touchDragging) return;
    
    const touch = e.changedTouches[0];
    const elemBelow = document.elementFromPoint(touch.clientX, touch.clientY);
    const dropzone = elemBelow?.closest('.activity-dropzone');
    const sourceArea = elemBelow?.closest('.dragdrop-items');
    
    if (dropzone) {
      this.placeItem(this.draggedItemId, dropzone.dataset.zone);
    } else if (sourceArea) {
      this.returnItemToSource(this.draggedItemId);
    }
    
    // Cleanup
    item.classList.remove('dragging');
    this.removeTouchClone();
    this.touchDragging = false;
    this.draggedItemId = null;
    
    // Clear highlights
    this.container.querySelectorAll('.drag-over').forEach(el => {
      el.classList.remove('drag-over');
    });
  }
  
  /**
   * Create a visual clone for touch dragging
   */
  createTouchClone(item, touch) {
    this.touchClone = item.cloneNode(true);
    this.touchClone.classList.add('touch-clone');
    this.touchClone.style.cssText = `
      position: fixed;
      left: ${touch.clientX - 50}px;
      top: ${touch.clientY - 20}px;
      width: 100px;
      opacity: 0.8;
      pointer-events: none;
      z-index: 1000;
      transform: scale(1.05);
    `;
    document.body.appendChild(this.touchClone);
  }
  
  /**
   * Remove touch clone
   */
  removeTouchClone() {
    if (this.touchClone) {
      this.touchClone.remove();
      this.touchClone = null;
    }
  }
  
  /**
   * Place an item in a zone
   */
  placeItem(itemId, zoneId) {
    // Find the item element
    const item = this.container.querySelector(`.activity-draggable[data-id="${itemId}"]`);
    if (!item) return;
    
    // Remove from previous zone if it was placed
    Object.keys(this.placements).forEach(z => {
      if (this.placements[z] === itemId) {
        delete this.placements[z];
        // Zone is now empty
        const prevZone = this.container.querySelector(`.activity-dropzone[data-zone="${z}"]`);
        if (prevZone) {
          prevZone.classList.remove('filled');
        }
      }
    });
    
    // If zone already has an item, return that item to source
    if (this.placements[zoneId]) {
      this.returnItemToSource(this.placements[zoneId]);
    }
    
    // Place item in zone
    this.placements[zoneId] = itemId;
    
    // Move item element to zone
    const zone = this.container.querySelector(`.activity-dropzone[data-zone="${zoneId}"]`);
    if (zone) {
      zone.appendChild(item);
      zone.classList.add('filled');
    }
    
    // Update submit button state
    this.updateSubmitButton();
    
    // Report progress
    const { correctCount, total } = this.calculateScore();
    this.onProgress({ correct: correctCount, total });
  }
  
  /**
   * Return an item to the source area
   */
  returnItemToSource(itemId) {
    const item = this.container.querySelector(`.activity-draggable[data-id="${itemId}"]`);
    const sourceContainer = this.container.querySelector('.dragdrop-items');
    
    if (item && sourceContainer) {
      sourceContainer.appendChild(item);
      
      // Remove from placements
      Object.keys(this.placements).forEach(z => {
        if (this.placements[z] === itemId) {
          delete this.placements[z];
          const zone = this.container.querySelector(`.activity-dropzone[data-zone="${z}"]`);
          if (zone) {
            zone.classList.remove('filled');
          }
        }
      });
      
      this.updateSubmitButton();
    }
  }
  
  /**
   * Reset all placements back to source
   */
  resetPlacements() {
    const sourceContainer = this.container.querySelector('.dragdrop-items');
    const items = this.container.querySelectorAll('.activity-draggable');
    
    items.forEach(item => {
      sourceContainer.appendChild(item);
      item.classList.remove('correct', 'incorrect');
    });
    
    // Clear placements
    this.placements = {};
    
    // Clear zone states
    this.container.querySelectorAll('.activity-dropzone').forEach(zone => {
      zone.classList.remove('filled', 'correct', 'incorrect');
    });
    
    // Clear feedback
    const feedbackEl = this.container.querySelector('.activity-feedback');
    if (feedbackEl) {
      feedbackEl.innerHTML = '';
      feedbackEl.classList.remove('visible');
    }
    
    // Reset submit button
    const submitBtn = this.container.querySelector('.activity-submit-btn');
    if (submitBtn) {
      submitBtn.textContent = 'Check Matches';
      submitBtn.classList.remove('correct', 'incorrect');
    }
    
    this.updateSubmitButton();
  }
  
  /**
   * Calculate the score
   */
  calculateScore() {
    let correctCount = 0;
    const details = [];
    
    this.zones.forEach(zone => {
      const placed = this.placements[zone.id];
      const isCorrect = placed === zone.correct;
      if (isCorrect) correctCount++;
      details.push({
        zone: zone.id,
        placed,
        expected: zone.correct,
        correct: isCorrect
      });
    });
    
    return {
      correctCount,
      total: this.zones.length,
      details
    };
  }
  
  /**
   * Check if activity is in a submittable state
   * Requires all zones to have an item
   */
  validate() {
    return Object.keys(this.placements).length === this.zones.length;
  }
  
  /**
   * Get validation message
   */
  getValidationMessage() {
    const placed = Object.keys(this.placements).length;
    const total = this.zones.length;
    return `Please place all items (${placed}/${total} placed)`;
  }
  
  /**
   * Get the result of the activity
   */
  getResult() {
    const { correctCount, total, details } = this.calculateScore();
    const score = total > 0 ? correctCount / total : 0;
    const correct = score === 1.0;
    
    return {
      correct,
      score,
      response: {
        placements: { ...this.placements },
        correctCount,
        totalZones: total,
        details
      },
      message: correct 
        ? 'All matches correct!' 
        : `${correctCount}/${total} correct`
    };
  }
  
  /**
   * Show feedback with visual indicators
   */
  showFeedback(result) {
    const { details } = result.response;
    
    details.forEach(d => {
      const zone = this.container.querySelector(`.activity-dropzone[data-zone="${d.zone}"]`);
      const item = this.container.querySelector(`.activity-draggable[data-id="${d.placed}"]`);
      
      if (zone) {
        zone.classList.remove('correct', 'incorrect');
        zone.classList.add(d.correct ? 'correct' : 'incorrect');
      }
      if (item) {
        item.classList.remove('correct', 'incorrect');
        item.classList.add(d.correct ? 'correct' : 'incorrect');
        
        // Disable dragging on correct items
        if (result.correct) {
          item.setAttribute('draggable', 'false');
          item.style.cursor = 'default';
        }
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
        
        // Allow retry after delay
        setTimeout(() => {
          submitBtn.textContent = 'Check Matches';
          submitBtn.classList.remove('incorrect');
          
          // Clear incorrect markers
          this.container.querySelectorAll('.incorrect').forEach(el => {
            el.classList.remove('incorrect');
          });
        }, 2000);
      }
    }
    
    // Call parent feedback
    super.showFeedback(result);
  }
  
  /**
   * Reset to initial state
   */
  reset() {
    this.items = this.shuffleArray([...this.activityData.items]);
    this.placements = {};
    this.draggedItemId = null;
    
    super.reset();
  }
}

// Register with ActivityRegistry
if (typeof ActivityRegistry !== 'undefined') {
  ActivityRegistry.register('drag-drop', DragDropActivity);
}

// Export for use as module or global
if (typeof module !== 'undefined' && module.exports) {
  module.exports = DragDropActivity;
} else if (typeof window !== 'undefined') {
  window.DragDropActivity = DragDropActivity;
}
