/**
 * Quiz System - Interactive comprehension quizzes with localStorage persistence
 * 
 * Usage:
 *   const quiz = new Quiz('my-quiz', questions);
 * 
 * HTML Structure Required:
 *   <div class="quiz-card" id="my-quiz">
 *     <div class="quiz-header">
 *       <h4>📝 Check Your Understanding</h4>
 *       <div class="quiz-progress">
 *         <span class="answered">0</span>/<span class="total">4</span> answered
 *         <span class="score"></span>
 *       </div>
 *     </div>
 *     <div class="quiz-carousel"></div>
 *     <div class="quiz-nav">
 *       <button class="quiz-nav-btn prev" disabled>← Prev</button>
 *       <div class="quiz-dots"></div>
 *       <button class="quiz-nav-btn next">Next →</button>
 *     </div>
 *   </div>
 */

class Quiz {
  constructor(containerId, questions) {
    this.containerId = containerId;
    this.container = document.getElementById(containerId);
    this.questions = questions;
    this.currentIndex = 0;
    this.answers = this.loadAnswers();
    
    if (this.container) {
      this.init();
    } else {
      console.warn(`Quiz container '${containerId}' not found`);
    }
  }

  loadAnswers() {
    const saved = localStorage.getItem(`quiz-${this.containerId}`);
    return saved ? JSON.parse(saved) : {};
  }

  saveAnswers() {
    localStorage.setItem(`quiz-${this.containerId}`, JSON.stringify(this.answers));
  }

  clearAnswers() {
    this.answers = {};
    localStorage.removeItem(`quiz-${this.containerId}`);
    this.renderQuestions();
    this.updateProgress();
    this.updateDots();
    this.showQuestion(0);
  }

  init() {
    this.renderQuestions();
    this.renderDots();
    this.setupNavigation();
    this.updateProgress();
    this.showQuestion(0);
  }

  renderQuestions() {
    const carousel = this.container.querySelector('.quiz-carousel');
    if (!carousel) return;

    carousel.innerHTML = this.questions.map((q, i) => `
      <div class="quiz-question" data-index="${i}">
        <div class="question-number">Question ${i + 1} of ${this.questions.length}</div>
        <div class="question-text">${q.question}</div>
        <div class="quiz-options">
          ${q.options.map((opt, j) => `
            <button class="quiz-option" data-option="${j}">${opt}</button>
          `).join('')}
        </div>
        <div class="quiz-feedback"></div>
      </div>
    `).join('');

    // Add click handlers
    carousel.querySelectorAll('.quiz-option').forEach(btn => {
      btn.addEventListener('click', (e) => this.selectAnswer(e));
    });

    // Restore previous answers
    Object.entries(this.answers).forEach(([qIndex, answer]) => {
      this.applyAnswer(parseInt(qIndex), answer);
    });
  }

  renderDots() {
    const dotsContainer = this.container.querySelector('.quiz-dots');
    if (!dotsContainer) return;

    dotsContainer.innerHTML = this.questions.map((_, i) => 
      `<div class="quiz-dot" data-index="${i}"></div>`
    ).join('');

    dotsContainer.querySelectorAll('.quiz-dot').forEach(dot => {
      dot.addEventListener('click', () => {
        this.showQuestion(parseInt(dot.dataset.index));
      });
    });

    this.updateDots();
  }

  setupNavigation() {
    const prevBtn = this.container.querySelector('.quiz-nav-btn.prev');
    const nextBtn = this.container.querySelector('.quiz-nav-btn.next');

    if (prevBtn) {
      prevBtn.addEventListener('click', () => this.showQuestion(this.currentIndex - 1));
    }
    if (nextBtn) {
      nextBtn.addEventListener('click', () => this.showQuestion(this.currentIndex + 1));
    }
  }

  showQuestion(index) {
    if (index < 0 || index >= this.questions.length) return;
    
    this.currentIndex = index;
    
    // Hide all, show current
    this.container.querySelectorAll('.quiz-question').forEach((q, i) => {
      q.classList.toggle('active', i === index);
    });

    // Update nav buttons
    const prevBtn = this.container.querySelector('.quiz-nav-btn.prev');
    const nextBtn = this.container.querySelector('.quiz-nav-btn.next');
    if (prevBtn) prevBtn.disabled = index === 0;
    if (nextBtn) nextBtn.disabled = index === this.questions.length - 1;

    this.updateDots();
  }

  selectAnswer(e) {
    const btn = e.target;
    const questionEl = btn.closest('.quiz-question');
    const questionIndex = parseInt(questionEl.dataset.index);
    const selectedOption = parseInt(btn.dataset.option);
    
    // If already answered, don't allow changes
    if (this.answers[questionIndex] !== undefined) return;

    const question = this.questions[questionIndex];
    const isCorrect = selectedOption === question.correct;

    this.answers[questionIndex] = { selected: selectedOption, correct: isCorrect };
    this.saveAnswers();

    this.applyAnswer(questionIndex, this.answers[questionIndex]);
    this.updateProgress();
    this.updateDots();

    // Auto-advance after a delay
    if (this.currentIndex < this.questions.length - 1) {
      setTimeout(() => this.showQuestion(this.currentIndex + 1), 1500);
    }
  }

  applyAnswer(questionIndex, answer) {
    const questionEl = this.container.querySelector(`.quiz-question[data-index="${questionIndex}"]`);
    if (!questionEl) return;

    const options = questionEl.querySelectorAll('.quiz-option');
    const feedback = questionEl.querySelector('.quiz-feedback');
    const question = this.questions[questionIndex];

    options.forEach((opt, i) => {
      opt.classList.remove('selected', 'correct', 'incorrect');
      if (i === answer.selected) {
        opt.classList.add(answer.correct ? 'correct' : 'incorrect');
      }
      if (i === question.correct && !answer.correct) {
        opt.classList.add('correct');
      }
    });

    if (feedback) {
      feedback.className = `quiz-feedback show ${answer.correct ? 'correct' : 'incorrect'}`;
      feedback.textContent = answer.correct 
        ? '✓ Correct! ' + question.explanation
        : '✗ ' + question.explanation;
    }
  }

  updateProgress() {
    const answered = Object.keys(this.answers).length;
    const correct = Object.values(this.answers).filter(a => a.correct).length;
    
    const answeredEl = this.container.querySelector('.quiz-progress .answered');
    const totalEl = this.container.querySelector('.quiz-progress .total');
    const scoreEl = this.container.querySelector('.quiz-progress .score');

    if (answeredEl) answeredEl.textContent = answered;
    if (totalEl) totalEl.textContent = this.questions.length;
    
    if (scoreEl && answered > 0) {
      scoreEl.textContent = ` • ${correct}/${answered} correct`;
    }
  }

  updateDots() {
    this.container.querySelectorAll('.quiz-dot').forEach((dot, i) => {
      dot.classList.remove('active', 'answered', 'correct', 'incorrect');
      
      if (i === this.currentIndex) {
        dot.classList.add('active');
      }
      
      if (this.answers[i]) {
        dot.classList.add(this.answers[i].correct ? 'correct' : 'incorrect');
      }
    });
  }

  // Get current score
  getScore() {
    const answered = Object.keys(this.answers).length;
    const correct = Object.values(this.answers).filter(a => a.correct).length;
    return { answered, correct, total: this.questions.length };
  }

  // Check if quiz is complete
  isComplete() {
    return Object.keys(this.answers).length === this.questions.length;
  }
}

// Factory function for creating quizzes from data object
Quiz.createFromData = function(quizData) {
  const quizzes = {};
  Object.entries(quizData).forEach(([quizId, data]) => {
    quizzes[quizId] = new Quiz(quizId, data.questions);
  });
  return quizzes;
};

// Export for use as module or global
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Quiz;
} else if (typeof window !== 'undefined') {
  window.Quiz = Quiz;
}
