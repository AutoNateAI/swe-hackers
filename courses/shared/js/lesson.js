/* ═══════════════════════════════════════════════════════════════════════════
   AUTONATEAI INTERACTIVE LESSON JAVASCRIPT
   Anime.js powered animations and interactions
   ═══════════════════════════════════════════════════════════════════════════ */

// ─────────────────────────────────────────────────────────────────────────────
// INITIALIZATION
// ─────────────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  initScrollAnimations();
  initProgressBar();
  initProgressTracker();
  initQuizzes();
  initDragDrop();
  initCodeCopy();
  initMermaid();
  initHeroAnimation();
});

// ─────────────────────────────────────────────────────────────────────────────
// HERO ANIMATION
// ─────────────────────────────────────────────────────────────────────────────

function initHeroAnimation() {
  const hero = document.querySelector('.hero-content');
  if (!hero) return;

  // Animate hero elements on load
  anime.timeline({ easing: 'easeOutExpo' })
    .add({
      targets: '.hero-chapter',
      opacity: [0, 1],
      translateY: [-20, 0],
      duration: 800
    })
    .add({
      targets: '.hero-icon',
      opacity: [0, 1],
      scale: [0.5, 1],
      duration: 800
    }, '-=400')
    .add({
      targets: '.hero h1',
      opacity: [0, 1],
      translateY: [30, 0],
      duration: 800
    }, '-=400')
    .add({
      targets: '.hero-subtitle',
      opacity: [0, 1],
      translateY: [20, 0],
      duration: 800
    }, '-=400')
    .add({
      targets: '.scroll-indicator',
      opacity: [0, 1],
      duration: 800
    }, '-=200');
}

// ─────────────────────────────────────────────────────────────────────────────
// SCROLL ANIMATIONS
// ─────────────────────────────────────────────────────────────────────────────

function initScrollAnimations() {
  // Intersection Observer for sections
  const sectionObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        animateSection(entry.target);
      }
    });
  }, {
    threshold: 0.1,
    rootMargin: '-50px'
  });

  document.querySelectorAll('.section').forEach(section => {
    sectionObserver.observe(section);
  });

  // Stagger animations for lists and grids
  const staggerObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        animateStaggerItems(entry.target);
        staggerObserver.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.2
  });

  document.querySelectorAll('.concept-grid, .quiz-options, .try-it-steps').forEach(container => {
    staggerObserver.observe(container);
  });
}

function animateSection(section) {
  // Animate fade-in elements
  anime({
    targets: section.querySelectorAll('.fade-in'),
    opacity: [0, 1],
    translateY: [20, 0],
    duration: 800,
    easing: 'easeOutExpo',
    delay: anime.stagger(100)
  });

  // Animate slide-in-left elements
  anime({
    targets: section.querySelectorAll('.slide-in-left'),
    opacity: [0, 1],
    translateX: [-50, 0],
    duration: 800,
    easing: 'easeOutExpo',
    delay: anime.stagger(100)
  });

  // Animate slide-in-right elements
  anime({
    targets: section.querySelectorAll('.slide-in-right'),
    opacity: [0, 1],
    translateX: [50, 0],
    duration: 800,
    easing: 'easeOutExpo',
    delay: anime.stagger(100)
  });

  // Animate scale-in elements
  anime({
    targets: section.querySelectorAll('.scale-in'),
    opacity: [0, 1],
    scale: [0.9, 1],
    duration: 800,
    easing: 'easeOutExpo',
    delay: anime.stagger(100)
  });

  // Animate code blocks
  anime({
    targets: section.querySelectorAll('.code-block'),
    opacity: [0, 1],
    translateY: [30, 0],
    duration: 800,
    easing: 'easeOutExpo'
  });

  // Animate diagrams
  anime({
    targets: section.querySelectorAll('.diagram-container'),
    opacity: [0, 1],
    scale: [0.95, 1],
    duration: 800,
    easing: 'easeOutExpo'
  });
}

function animateStaggerItems(container) {
  const items = container.querySelectorAll('.concept-card, .quiz-option, li, .stagger-item');
  
  anime({
    targets: items,
    opacity: [0, 1],
    translateY: [20, 0],
    duration: 600,
    easing: 'easeOutExpo',
    delay: anime.stagger(80)
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// PROGRESS BAR
// ─────────────────────────────────────────────────────────────────────────────

function initProgressBar() {
  const progressBar = document.querySelector('.progress-bar');
  if (!progressBar) return;

  window.addEventListener('scroll', () => {
    const windowHeight = window.innerHeight;
    const documentHeight = document.documentElement.scrollHeight - windowHeight;
    const scrolled = window.scrollY;
    const progress = (scrolled / documentHeight) * 100;
    
    progressBar.style.width = `${progress}%`;
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// PROGRESS TRACKER (Side dots)
// ─────────────────────────────────────────────────────────────────────────────

function initProgressTracker() {
  const tracker = document.querySelector('.progress-tracker');
  if (!tracker) return;

  const sections = document.querySelectorAll('.section[data-section]');
  const dots = tracker.querySelectorAll('.progress-dot');

  // Click to scroll
  dots.forEach((dot, index) => {
    dot.addEventListener('click', () => {
      sections[index]?.scrollIntoView({ behavior: 'smooth' });
    });
  });

  // Update active dot on scroll
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const sectionId = entry.target.dataset.section;
        dots.forEach(dot => {
          dot.classList.toggle('active', dot.dataset.section === sectionId);
        });
      }
    });
  }, {
    threshold: 0.5
  });

  sections.forEach(section => observer.observe(section));
}

// ─────────────────────────────────────────────────────────────────────────────
// QUIZ FUNCTIONALITY
// ─────────────────────────────────────────────────────────────────────────────

function initQuizzes() {
  document.querySelectorAll('.quiz-container').forEach(quiz => {
    const options = quiz.querySelectorAll('.quiz-option');
    const submitBtn = quiz.querySelector('.quiz-btn');
    const feedback = quiz.querySelector('.quiz-feedback');
    const correctAnswer = quiz.dataset.answer;
    let selectedOption = null;

    options.forEach(option => {
      option.addEventListener('click', () => {
        // Remove previous selection
        options.forEach(opt => opt.classList.remove('selected'));
        
        // Select this option
        option.classList.add('selected');
        selectedOption = option.dataset.value;
        
        // Enable submit button
        if (submitBtn) submitBtn.disabled = false;

        // Animate selection
        anime({
          targets: option,
          scale: [1, 1.02, 1],
          duration: 300,
          easing: 'easeOutElastic(1, .5)'
        });
      });
    });

    if (submitBtn) {
      submitBtn.addEventListener('click', () => {
        if (!selectedOption) return;

        const isCorrect = selectedOption === correctAnswer;
        
        // Show correct/incorrect states
        options.forEach(option => {
          if (option.dataset.value === correctAnswer) {
            option.classList.add('correct');
          } else if (option.classList.contains('selected') && !isCorrect) {
            option.classList.add('incorrect');
          }
          option.style.pointerEvents = 'none';
        });

        // Show feedback
        if (feedback) {
          feedback.classList.add('show', isCorrect ? 'correct' : 'incorrect');
          feedback.textContent = isCorrect 
            ? '✓ Correct! ' + (feedback.dataset.correctMsg || 'Great job!')
            : '✗ Not quite. ' + (feedback.dataset.incorrectMsg || `The correct answer was ${correctAnswer}.`);
        }

        // Animate feedback
        anime({
          targets: feedback,
          opacity: [0, 1],
          translateY: [10, 0],
          duration: 400,
          easing: 'easeOutExpo'
        });

        // Update progress dots
        const progressDot = quiz.querySelector('.quiz-progress-dot.active');
        if (progressDot) {
          progressDot.classList.remove('active');
          progressDot.classList.add(isCorrect ? 'correct' : 'incorrect');
        }

        // Disable submit button
        submitBtn.disabled = true;
        submitBtn.textContent = isCorrect ? 'Correct! ✓' : 'See Answer';
      });
    }
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// DRAG AND DROP
// ─────────────────────────────────────────────────────────────────────────────

function initDragDrop() {
  const containers = document.querySelectorAll('.drag-drop-container');

  containers.forEach(container => {
    const items = container.querySelectorAll('.drag-item');
    const zones = container.querySelectorAll('.drop-zone');
    const itemsContainer = container.querySelector('.drag-items');
    const submitBtn = container.querySelector('.drag-drop-btn, .activity-btn, .check-btn');
    const feedback = container.querySelector('.drag-drop-feedback, .quiz-feedback');

    // Track current placements
    const placements = {};

    items.forEach(item => {
      item.draggable = true;

      item.addEventListener('dragstart', (e) => {
        item.classList.add('dragging');
        e.dataTransfer.setData('text/plain', item.dataset.value);
        e.dataTransfer.effectAllowed = 'move';
      });

      item.addEventListener('dragend', () => {
        item.classList.remove('dragging');
      });
    });

    zones.forEach(zone => {
      zone.addEventListener('dragover', (e) => {
        e.preventDefault();
        zone.classList.add('drag-over');
      });

      zone.addEventListener('dragleave', () => {
        zone.classList.remove('drag-over');
      });

      zone.addEventListener('drop', (e) => {
        e.preventDefault();
        zone.classList.remove('drag-over');

        const value = e.dataTransfer.getData('text/plain');
        const item = container.querySelector(`.drag-item[data-value="${value}"]`);

        if (item) {
          const content = zone.querySelector('.drop-zone-content');
          if (content) {
            // Remove item from previous zone tracking
            Object.keys(placements).forEach(zoneId => {
              if (placements[zoneId] === value) {
                delete placements[zoneId];
              }
            });

            content.appendChild(item);

            // Track placement
            const zoneId = zone.dataset.dropzone || zone.dataset.zone || zone.id;
            if (zoneId) {
              placements[zoneId] = value;
            }

            // Animate drop
            anime({
              targets: item,
              scale: [0.8, 1],
              opacity: [0.5, 1],
              duration: 300,
              easing: 'easeOutExpo'
            });

            // Check if all zones filled and enable submit button
            checkAllZonesFilled();
          }
        }
      });
    });

    // Allow dropping back to source
    if (itemsContainer) {
      itemsContainer.addEventListener('dragover', (e) => {
        e.preventDefault();
      });

      itemsContainer.addEventListener('drop', (e) => {
        e.preventDefault();
        const value = e.dataTransfer.getData('text/plain');
        const item = container.querySelector(`.drag-item[data-value="${value}"]`);

        if (item) {
          // Remove from placement tracking
          Object.keys(placements).forEach(zoneId => {
            if (placements[zoneId] === value) {
              delete placements[zoneId];
            }
          });

          itemsContainer.appendChild(item);
          item.style.background = ''; // Reset color
          item.classList.remove('correct', 'incorrect');
          checkAllZonesFilled();
        }
      });
    }

    // Check if all zones are filled
    function checkAllZonesFilled() {
      const allFilled = Array.from(zones).every(zone => {
        const zoneId = zone.dataset.dropzone || zone.dataset.zone || zone.id;
        return placements[zoneId];
      });

      if (submitBtn) {
        submitBtn.disabled = !allFilled;
      }
    }

    // Handle submit/check button
    if (submitBtn) {
      submitBtn.addEventListener('click', () => {
        let correctCount = 0;
        const totalZones = zones.length;

        // Check each zone and show feedback
        zones.forEach(zone => {
          const zoneId = zone.dataset.dropzone || zone.dataset.zone || zone.id;
          const placedValue = placements[zoneId];
          const correctValues = (zone.dataset.accepts || zone.dataset.correct || '').split(',').map(v => v.trim());
          const isCorrect = correctValues.includes(placedValue);

          // Find the item in this zone
          const item = zone.querySelector('.drag-item');

          if (isCorrect) {
            correctCount++;
            zone.classList.add('correct');
            zone.classList.remove('incorrect');
            if (item) {
              item.classList.add('correct');
              item.classList.remove('incorrect');
              item.style.background = 'var(--success, #4caf50)';
            }
          } else {
            zone.classList.add('incorrect');
            zone.classList.remove('correct');
            if (item) {
              item.classList.add('incorrect');
              item.classList.remove('correct');
              item.style.background = 'var(--error, #ef5350)';
            }
          }

          // Disable further dragging
          zone.style.pointerEvents = 'none';
        });

        // Disable dragging on all items
        items.forEach(item => {
          item.draggable = false;
          item.style.cursor = 'default';
        });

        // Show feedback
        const allCorrect = correctCount === totalZones;

        if (feedback) {
          feedback.classList.add('show', allCorrect ? 'correct' : 'incorrect');
          feedback.textContent = allCorrect
            ? '✓ Perfect! All matches are correct!'
            : `✗ ${correctCount}/${totalZones} correct. ${feedback.dataset.incorrectMsg || 'Check the highlighted items.'}`;
        }

        // Update button
        submitBtn.disabled = true;
        submitBtn.textContent = allCorrect ? 'Perfect! ✓' : `${correctCount}/${totalZones} Correct`;

        // Animate feedback
        if (feedback) {
          anime({
            targets: feedback,
            opacity: [0, 1],
            translateY: [10, 0],
            duration: 400,
            easing: 'easeOutExpo'
          });
        }
      });
    }
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// CODE COPY
// ─────────────────────────────────────────────────────────────────────────────

function initCodeCopy() {
  document.querySelectorAll('.code-copy').forEach(btn => {
    btn.addEventListener('click', async () => {
      const codeBlock = btn.closest('.code-block');
      const code = codeBlock.querySelector('code')?.textContent || '';
      
      try {
        await navigator.clipboard.writeText(code);
        
        // Visual feedback
        const originalText = btn.textContent;
        btn.textContent = 'Copied!';
        btn.style.color = 'var(--success)';
        
        setTimeout(() => {
          btn.textContent = originalText;
          btn.style.color = '';
        }, 2000);
      } catch (err) {
        console.error('Failed to copy:', err);
      }
    });
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// MERMAID DIAGRAMS
// ─────────────────────────────────────────────────────────────────────────────

function initMermaid() {
  if (typeof mermaid !== 'undefined') {
    mermaid.initialize({
      startOnLoad: true,
      theme: 'dark',
      securityLevel: 'loose',
      themeVariables: {
        primaryColor: '#7986cb',
        primaryTextColor: '#e8e8f0',
        primaryBorderColor: '#3f51b5',
        lineColor: '#6a6a80',
        secondaryColor: '#1a1a2e',
        tertiaryColor: '#12121a',
        background: '#16162a',
        mainBkg: '#16162a',
        nodeBorder: '#3f51b5',
        clusterBkg: '#1a1a2e',
        clusterBorder: '#3f51b5',
        titleColor: '#e8e8f0',
        edgeLabelBackground: '#1a1a2e',
        fontFamily: 'Inter, sans-serif',
        fontSize: '14px'
      },
      flowchart: {
        useMaxWidth: false,
        htmlLabels: true,
        curve: 'basis',
        padding: 20,
        nodeSpacing: 50,
        rankSpacing: 50,
        diagramPadding: 20
      },
      sequence: {
        useMaxWidth: false,
        diagramMarginX: 30,
        diagramMarginY: 30,
        boxMargin: 10,
        boxTextMargin: 10,
        noteMargin: 15,
        messageMargin: 40
      },
      gantt: {
        useMaxWidth: false
      },
      mindmap: {
        useMaxWidth: false,
        padding: 20
      },
      stateDiagram: {
        useMaxWidth: false
      },
      er: {
        useMaxWidth: false
      }
    });

    // Re-render after init to ensure settings take effect
    setTimeout(() => {
      document.querySelectorAll('.mermaid').forEach(el => {
        if (el.getAttribute('data-processed') !== 'true') {
          mermaid.contentLoaded();
        }
      });
    }, 100);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// INTERACTIVE DIAGRAM NODES
// ─────────────────────────────────────────────────────────────────────────────

function initDiagramInteractions() {
  document.querySelectorAll('.diagram-node').forEach(node => {
    node.addEventListener('click', () => {
      const info = node.dataset.info;
      if (info) {
        showDiagramTooltip(node, info);
      }
    });

    node.addEventListener('mouseenter', () => {
      anime({
        targets: node,
        scale: 1.1,
        duration: 200,
        easing: 'easeOutExpo'
      });
    });

    node.addEventListener('mouseleave', () => {
      anime({
        targets: node,
        scale: 1,
        duration: 200,
        easing: 'easeOutExpo'
      });
    });
  });
}

function showDiagramTooltip(node, info) {
  // Remove existing tooltips
  document.querySelectorAll('.diagram-tooltip').forEach(t => t.remove());

  const tooltip = document.createElement('div');
  tooltip.className = 'diagram-tooltip';
  tooltip.innerHTML = info;
  tooltip.style.cssText = `
    position: absolute;
    background: var(--bg-card);
    padding: 12px 16px;
    border-radius: 8px;
    border: 1px solid var(--accent-magnetism);
    color: var(--text-primary);
    font-size: 14px;
    max-width: 250px;
    z-index: 1000;
    box-shadow: var(--shadow-lg);
  `;

  document.body.appendChild(tooltip);

  const rect = node.getBoundingClientRect();
  tooltip.style.left = `${rect.left + rect.width / 2 - tooltip.offsetWidth / 2}px`;
  tooltip.style.top = `${rect.bottom + 10}px`;

  anime({
    targets: tooltip,
    opacity: [0, 1],
    translateY: [-10, 0],
    duration: 200,
    easing: 'easeOutExpo'
  });

  // Remove on click outside
  setTimeout(() => {
    document.addEventListener('click', function handler(e) {
      if (!tooltip.contains(e.target)) {
        tooltip.remove();
        document.removeEventListener('click', handler);
      }
    });
  }, 100);
}

// ─────────────────────────────────────────────────────────────────────────────
// TYPEWRITER EFFECT
// ─────────────────────────────────────────────────────────────────────────────

function typewriter(element, text, speed = 30) {
  return new Promise(resolve => {
    let i = 0;
    element.textContent = '';
    
    function type() {
      if (i < text.length) {
        element.textContent += text.charAt(i);
        i++;
        setTimeout(type, speed);
      } else {
        resolve();
      }
    }
    
    type();
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// CONFETTI EFFECT (for quiz completion)
// ─────────────────────────────────────────────────────────────────────────────

function celebrateSuccess() {
  const colors = ['#7986cb', '#ffd54f', '#4caf50', '#ef5350', '#ab47bc'];
  const confettiCount = 50;
  
  for (let i = 0; i < confettiCount; i++) {
    const confetti = document.createElement('div');
    confetti.style.cssText = `
      position: fixed;
      width: 10px;
      height: 10px;
      background: ${colors[Math.floor(Math.random() * colors.length)]};
      left: ${Math.random() * 100}vw;
      top: -20px;
      border-radius: ${Math.random() > 0.5 ? '50%' : '0'};
      pointer-events: none;
      z-index: 9999;
    `;
    document.body.appendChild(confetti);

    anime({
      targets: confetti,
      translateY: window.innerHeight + 100,
      translateX: (Math.random() - 0.5) * 200,
      rotate: Math.random() * 720,
      duration: 2000 + Math.random() * 1000,
      easing: 'easeOutQuad',
      delay: Math.random() * 500,
      complete: () => confetti.remove()
    });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// UTILITY FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────

function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

function throttle(func, limit) {
  let inThrottle;
  return function(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// EXPORT FOR MODULE USE
// ─────────────────────────────────────────────────────────────────────────────

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    initScrollAnimations,
    initQuizzes,
    initDragDrop,
    typewriter,
    celebrateSuccess
  };
}

