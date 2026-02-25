/**
 * Blog System JavaScript - AutoNateAI
 * Handles animations, interactivity, and dynamic features for blog posts
 * 
 * Dependencies: anime.js, mermaid.js (loaded in HTML)
 */

// ===== Initialize on DOM Ready =====
document.addEventListener('DOMContentLoaded', () => {
  initScrollAnimations();
  initReadingProgress();
  initCodeBlocks();
  initImageLightbox();
  initPolls();
  initQuizzes();
  initRevealBlocks();
  initStatsCountUp();
  initMermaidDiagrams();
  initRelatedArticles();
});

// ===== Scroll-Triggered Block Animations =====
function initScrollAnimations() {
  const blocks = document.querySelectorAll('.blog-block:not(.hero-block)');
  
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        
        // Trigger anime.js entrance if available
        if (typeof anime !== 'undefined') {
          anime({
            targets: entry.target,
            opacity: [0, 1],
            translateY: [30, 0],
            duration: 600,
            easing: 'easeOutCubic'
          });
        }
        
        observer.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
  });
  
  blocks.forEach(block => observer.observe(block));
}

// ===== Reading Progress Bar =====
function initReadingProgress() {
  const progressBar = document.querySelector('.reading-progress');
  if (!progressBar) return;
  
  const article = document.querySelector('.article-container') || document.body;
  
  window.addEventListener('scroll', () => {
    const scrollTop = window.scrollY;
    const docHeight = article.scrollHeight - window.innerHeight;
    const progress = (scrollTop / docHeight) * 100;
    progressBar.style.width = `${Math.min(progress, 100)}%`;
  });
}

// ===== Code Block Copy Functionality =====
function initCodeBlocks() {
  const codeBlocks = document.querySelectorAll('.code-block');
  
  codeBlocks.forEach(block => {
    const copyBtn = block.querySelector('.code-copy');
    const code = block.querySelector('code');
    
    if (copyBtn && code) {
      copyBtn.addEventListener('click', async () => {
        try {
          await navigator.clipboard.writeText(code.textContent);
          copyBtn.classList.add('copied');
          copyBtn.innerHTML = '✓ Copied!';
          
          setTimeout(() => {
            copyBtn.classList.remove('copied');
            copyBtn.innerHTML = '📋 Copy';
          }, 2000);
        } catch (err) {
          console.error('Failed to copy:', err);
        }
      });
    }
  });
}

// ===== Image Lightbox =====
function initImageLightbox() {
  const images = document.querySelectorAll('.image-block img');
  
  // Create lightbox element
  const lightbox = document.createElement('div');
  lightbox.className = 'lightbox';
  lightbox.innerHTML = `
    <span class="lightbox-close">×</span>
    <img src="" alt="">
  `;
  document.body.appendChild(lightbox);
  
  const lightboxImg = lightbox.querySelector('img');
  const closeBtn = lightbox.querySelector('.lightbox-close');
  
  images.forEach(img => {
    img.addEventListener('click', () => {
      lightboxImg.src = img.src;
      lightboxImg.alt = img.alt;
      lightbox.classList.add('active');
      document.body.style.overflow = 'hidden';
    });
  });
  
  const closeLightbox = () => {
    lightbox.classList.remove('active');
    document.body.style.overflow = '';
  };
  
  closeBtn.addEventListener('click', closeLightbox);
  lightbox.addEventListener('click', (e) => {
    if (e.target === lightbox) closeLightbox();
  });
  
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeLightbox();
  });
}

// ===== Poll Interactivity =====
function initPolls() {
  const polls = document.querySelectorAll('.poll-block');
  
  polls.forEach(poll => {
    const options = poll.querySelectorAll('.poll-option');
    const pollId = poll.dataset.pollId || 'poll-' + Math.random().toString(36).substr(2, 9);
    
    // Check if already voted (localStorage)
    const voted = localStorage.getItem(`poll-voted-${pollId}`);
    if (voted) {
      showPollResults(poll, voted);
      return;
    }
    
    options.forEach(option => {
      option.addEventListener('click', () => {
        const value = option.dataset.value;
        localStorage.setItem(`poll-voted-${pollId}`, value);
        
        // Mark selected
        options.forEach(opt => opt.classList.remove('selected'));
        option.classList.add('selected');
        
        // Show results (simulated percentages)
        showPollResults(poll, value);
      });
    });
  });
}

function showPollResults(poll, selectedValue) {
  poll.classList.add('voted');
  const options = poll.querySelectorAll('.poll-option');
  
  // Simulated results (in production, fetch from Firebase)
  const results = generatePollResults(options.length);
  
  options.forEach((option, index) => {
    const percentage = results[index];
    option.style.setProperty('--percentage', `${percentage}%`);
    
    const percentageEl = option.querySelector('.poll-percentage');
    if (percentageEl) {
      percentageEl.textContent = `${percentage}%`;
    }
    
    if (option.dataset.value === selectedValue) {
      option.classList.add('selected');
    }
  });
}

function generatePollResults(count) {
  // Generate realistic-looking poll results
  const results = [];
  let remaining = 100;
  
  for (let i = 0; i < count - 1; i++) {
    const value = Math.floor(Math.random() * (remaining / (count - i)));
    results.push(value);
    remaining -= value;
  }
  results.push(remaining);
  
  // Shuffle for randomness
  return results.sort(() => Math.random() - 0.5);
}

// ===== Quiz Interactivity =====
function initQuizzes() {
  const quizzes = document.querySelectorAll('.quiz-block');
  
  quizzes.forEach(quiz => {
    const options = quiz.querySelectorAll('.quiz-option');
    const feedback = quiz.querySelector('.quiz-feedback');
    const correctAnswer = quiz.dataset.correct;
    
    options.forEach(option => {
      option.addEventListener('click', () => {
        if (quiz.classList.contains('answered')) return;
        
        quiz.classList.add('answered');
        const value = option.dataset.value;
        const isCorrect = value === correctAnswer;
        
        // Mark all options
        options.forEach(opt => {
          opt.classList.add('disabled');
          if (opt.dataset.value === correctAnswer) {
            opt.classList.add('correct');
          } else if (opt === option && !isCorrect) {
            opt.classList.add('incorrect');
          }
        });
        
        // Show feedback
        if (feedback) {
          feedback.classList.add('visible');
          feedback.classList.add(isCorrect ? 'correct' : 'incorrect');
          feedback.textContent = isCorrect 
            ? '✓ Correct! ' + (quiz.dataset.feedbackCorrect || '')
            : '✗ Not quite. ' + (quiz.dataset.feedbackIncorrect || '');
        }
      });
    });
  });
}

// ===== Reveal Blocks (Accordion) =====
function initRevealBlocks() {
  const reveals = document.querySelectorAll('.reveal-block');
  
  reveals.forEach(reveal => {
    const trigger = reveal.querySelector('.reveal-trigger');
    
    trigger.addEventListener('click', () => {
      reveal.classList.toggle('open');
    });
  });
}

// ===== Stats Count-Up Animation =====
function initStatsCountUp() {
  const statsBlocks = document.querySelectorAll('.stats-block');
  
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const statValues = entry.target.querySelectorAll('.stat-value');
        
        statValues.forEach(stat => {
          const target = parseInt(stat.dataset.value) || parseInt(stat.textContent) || 0;
          const suffix = stat.dataset.suffix || '';
          const prefix = stat.dataset.prefix || '';
          const duration = 2000;
          
          if (typeof anime !== 'undefined') {
            anime({
              targets: stat,
              innerHTML: [0, target],
              round: 1,
              duration: duration,
              easing: 'easeOutExpo',
              update: function() {
                stat.textContent = prefix + Math.round(stat.innerHTML) + suffix;
              },
              complete: function() {
                stat.textContent = prefix + target + suffix;
              }
            });
          } else {
            // Fallback without anime.js
            stat.textContent = prefix + target + suffix;
          }
        });
        
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.5 });
  
  statsBlocks.forEach(block => observer.observe(block));
}

// ===== Mermaid Diagram Initialization =====
function initMermaidDiagrams() {
  if (typeof mermaid === 'undefined') return;
  
  mermaid.initialize({
    startOnLoad: true,
    theme: 'dark',
    themeVariables: {
      primaryColor: '#7986cb',
      primaryTextColor: '#e8e8f0',
      primaryBorderColor: '#4a4a6a',
      lineColor: '#4db6ac',
      secondaryColor: '#16162a',
      tertiaryColor: '#1a1a2e',
      background: '#12121a',
      mainBkg: '#16162a',
      secondBkg: '#1a1a2e',
      border1: '#4a4a6a',
      border2: '#3a3a5a',
      arrowheadColor: '#4db6ac',
      fontFamily: 'Inter, sans-serif',
      fontSize: '14px',
      textColor: '#e8e8f0',
      nodeTextColor: '#e8e8f0'
    },
    flowchart: {
      curve: 'basis',
      padding: 20
    },
    sequence: {
      actorMargin: 50,
      boxMargin: 10
    }
  });
}

// ===== Related Articles Loader =====
async function initRelatedArticles() {
  const relatedBlock = document.querySelector('.related-block[data-auto-load]');
  if (!relatedBlock) return;
  
  const currentSlug = relatedBlock.dataset.currentSlug;
  const grid = relatedBlock.querySelector('.related-grid');
  
  try {
    const response = await fetch('/blog/articles.json');
    const data = await response.json();
    
    const related = getRelatedArticles(currentSlug, data.articles, 3);
    
    if (related.length === 0) {
      relatedBlock.style.display = 'none';
      return;
    }
    
    grid.innerHTML = related.map(article => `
      <a href="/blog/${article.slug}.html" class="related-card">
        <div class="related-category">${article.category}</div>
        <div class="related-card-title">${article.title}</div>
        <div class="related-excerpt">${article.excerpt}</div>
      </a>
    `).join('');
    
  } catch (err) {
    console.error('Failed to load related articles:', err);
    relatedBlock.style.display = 'none';
  }
}

function getRelatedArticles(currentSlug, allArticles, limit = 3) {
  const current = allArticles.find(a => a.slug === currentSlug);
  if (!current) return allArticles.slice(0, limit);
  
  return allArticles
    .filter(a => a.slug !== currentSlug)
    .filter(a => 
      a.category === current.category || 
      (a.tags && current.tags && a.tags.some(t => current.tags.includes(t)))
    )
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, limit);
}

// ===== Hero Animation (Scale-In) =====
function initHeroAnimation() {
  const hero = document.querySelector('.hero-block');
  if (!hero || typeof anime === 'undefined') return;

  anime.timeline()
    .add({
      targets: '.hero-block .category-badge',
      opacity: [0, 1],
      translateY: [20, 0],
      duration: 600,
      easing: 'easeOutCubic'
    })
    .add({
      targets: '.hero-block .article-title',
      opacity: [0, 1],
      scale: [2.5, 1],
      duration: 1200,
      easing: 'easeOutExpo'
    }, '-=200')
    .add({
      targets: '.hero-block .article-meta',
      opacity: [0, 1],
      translateY: [15, 0],
      duration: 500,
      easing: 'easeOutCubic'
    }, '-=400')
    .add({
      targets: '.hero-block .hero-image',
      opacity: [0, 1],
      translateY: [30, 0],
      scale: [0.95, 1],
      duration: 800,
      easing: 'easeOutCubic'
    }, '-=200');
}

// Run hero animation on load
window.addEventListener('load', initHeroAnimation);

// ===== Utility: Debounce =====
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

// ===== Export for use in other scripts =====
window.BlogUtils = {
  initScrollAnimations,
  initReadingProgress,
  initCodeBlocks,
  initImageLightbox,
  initPolls,
  initQuizzes,
  initRevealBlocks,
  initStatsCountUp,
  initMermaidDiagrams,
  initRelatedArticles,
  getRelatedArticles
};

