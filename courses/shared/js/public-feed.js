/**
 * Public Feed Controller
 * Renders a curated feed preview on the landing page with scroll gating
 * and login popup to convert visitors into users.
 */
const PublicFeed = {
  container: null,
  floatingCTA: null,
  authOverlay: null,
  isAuthMode: 'login', // 'login' or 'signup'
  pendingAction: null,  // action to complete after auth
  floatingDismissed: false,
  initialized: false,

  // ── Demo Posts ──
  demoPosts: [
    {
      id: 'pub-1',
      type: 'code_snippet',
      author: { name: 'Sarah M.', handle: '@sarahm', initials: 'SM', level: 3 },
      time: '2h ago',
      body: 'Just figured out a clean way to debounce API calls in React hooks. No library needed:',
      code: `const useDebounce = (value, delay = 300) => {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebounced(value);
    }, delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
};`,
      codeLang: 'JavaScript',
      tags: ['#javascript', '#react', '#hooks'],
      reactions: 42,
      comments: 8,
      topComment: { author: 'DevAlex', body: 'This is exactly what I needed. Clean and simple.' }
    },
    {
      id: 'pub-2',
      type: 'project_showcase',
      author: { name: 'Marcus D.', handle: '@marcusd', initials: 'MD', level: 5 },
      time: '4h ago',
      body: 'Shipped my full-stack portfolio tracker! Built with React + Node + Firebase. Real-time stock data, chart visualizations, and custom alerts. Took 3 weeks from spec to deploy.',
      tags: ['#react', '#firebase', '#showcase', '#fullstack'],
      reactions: 67,
      comments: 15,
      topComment: { author: 'BuilderJay', body: 'The chart animations are incredibly smooth. What library did you use?' }
    },
    {
      id: 'pub-3',
      type: 'milestone',
      author: { name: 'Priya K.', handle: '@priyak', initials: 'PK', level: 1 },
      time: '5h ago',
      body: '',
      milestone: { icon: '\u{1F389}', text: 'Completed API Architecture Course!', xp: '+500 XP earned' },
      tags: ['#milestone', '#api'],
      reactions: 28,
      comments: 6,
      topComment: { author: 'CoachNate', body: 'Congrats Priya! Your final project was outstanding.' }
    },
    {
      id: 'pub-4',
      type: 'automation_template',
      author: { name: 'James L.', handle: '@jamesl', initials: 'JL', level: 4 },
      time: '6h ago',
      body: 'Sharing my CI/CD pipeline template. Auto-runs lint, tests, builds, and deploys to Firebase on every push to main. Saves hours every week.',
      automation: {
        name: 'Full CI/CD Pipeline',
        steps: ['Git Push', 'Lint Check', 'Run Tests', 'Build', 'Deploy'],
        clones: 12
      },
      tags: ['#automation', '#devops', '#cicd'],
      reactions: 35,
      comments: 9,
      topComment: { author: 'DevOpsRita', body: 'Cloned this and had it running in 10 minutes. Great template.' }
    },
    {
      id: 'pub-5',
      type: 'challenge_win',
      author: { name: 'Taylor R.', handle: '@taylorr', initials: 'TR', level: 3 },
      time: '8h ago',
      body: 'Won this week\'s algorithm challenge! Binary tree traversal in O(n) with constant space using Morris traversal. Wild technique.',
      tags: ['#algorithms', '#challenge', '#winner'],
      reactions: 51,
      comments: 11,
      topComment: { author: 'AlgoKing', body: 'Morris traversal is so underrated. Great solution.' }
    },
    {
      id: 'pub-6',
      type: 'code_snippet',
      author: { name: 'Alex W.', handle: '@alexw', initials: 'AW', level: 2 },
      time: '10h ago',
      body: 'Wrote a utility to flatten deeply nested objects. Handy for transforming API responses:',
      code: `function flatten(obj, prefix = '') {
  return Object.entries(obj).reduce((acc, [key, val]) => {
    const path = prefix ? prefix + '.' + key : key;
    if (val && typeof val === 'object' && !Array.isArray(val)) {
      Object.assign(acc, flatten(val, path));
    } else {
      acc[path] = val;
    }
    return acc;
  }, {});
}`,
      codeLang: 'JavaScript',
      tags: ['#javascript', '#utilities', '#api'],
      reactions: 23,
      comments: 4,
      topComment: null
    },
    {
      id: 'pub-7',
      type: 'project_showcase',
      author: { name: 'Mia C.', handle: '@miac', initials: 'MC', level: 3 },
      time: '12h ago',
      body: 'Just released v2.0 of my open-source component library. New dark mode support, 15 new components, and full TypeScript types. Check it out!',
      tags: ['#opensource', '#typescript', '#components'],
      reactions: 44,
      comments: 7,
      topComment: null
    },
    {
      id: 'pub-8',
      type: 'code_snippet',
      author: { name: 'Devon P.', handle: '@devonp', initials: 'DP', level: 2 },
      time: '14h ago',
      body: 'Looking for 2 React developers to help build an AI-powered study tool. We have the backend ready and need help with the dashboard UI.',
      tags: ['#collab', '#react', '#ai'],
      reactions: 19,
      comments: 13,
      topComment: null
    }
  ],

  // ── Story Data ──
  demoStories: [
    { name: 'Sarah', initials: 'SM', active: true },
    { name: 'Marcus', initials: 'MD', active: true },
    { name: 'Priya', initials: 'PK', active: true },
    { name: 'James', initials: 'JL', active: false },
    { name: 'Taylor', initials: 'TR', active: true },
    { name: 'Alex', initials: 'AW', active: false },
    { name: 'Mia', initials: 'MC', active: true },
  ],

  // ── Context Messages ──
  contextMessages: {
    reaction: 'Sign up to react and show appreciation for great code',
    comment: 'Join the conversation \u2014 sign up to comment',
    follow: 'Follow builders and get their posts in your feed',
    profile: 'Sign up to see full profiles and connect with builders',
    scroll: 'You\'ve seen a preview \u2014 sign up to unlock the full feed',
    story: 'Sign up to view stories from the community',
    bookmark: 'Sign up to save posts for later',
    default: 'Join 500+ builders sharing code, projects, and automations'
  },

  // ── Init ──
  init() {
    this.container = document.getElementById('public-feed-container');
    if (!this.container) return;

    this.renderSkeletons();

    // Short delay for visual effect then render real content
    setTimeout(() => {
      this.render();
      this.setupScrollObserver();
      this.setupFloatingCTA();
      this.checkAuthState();
    }, 600);
  },

  // ── Auth State ──
  async checkAuthState() {
    try {
      if (typeof FirebaseApp !== 'undefined') {
        await FirebaseApp.init();
      }
      if (typeof AuthService !== 'undefined') {
        AuthService.init();
        const user = await AuthService.waitForAuthState();
        if (user) {
          this.onAuthenticated(user);
        }
      }
    } catch (e) {
      // Firebase not loaded on landing page -- that's fine, continue as guest
    }
  },

  onAuthenticated(user) {
    const section = document.querySelector('.public-feed-section');
    if (section) section.classList.add('authenticated');

    // Replace gate card with "Go to Feed" CTA
    const gate = this.container.querySelector('.public-feed-gate');
    if (gate) {
      gate.innerHTML = `
        <div class="pf-gate-icon">\u{1F389}</div>
        <div class="pf-gate-count">Welcome back, ${user.displayName || 'Builder'}!</div>
        <div class="pf-gate-text">Your personalized feed is waiting with posts from your courses and community.</div>
        <div class="pf-gate-btns">
          <a href="dashboard/feed.html" class="pf-btn-primary">Go to Your Feed <span>\u2192</span></a>
        </div>
      `;
    }

    // Hide floating CTA
    if (this.floatingCTA) {
      this.floatingCTA.classList.remove('visible');
    }
  },

  // ── Render Skeletons ──
  renderSkeletons() {
    const stream = document.createElement('div');
    stream.className = 'public-feed-stream';
    let html = '';
    for (let i = 0; i < 3; i++) {
      html += `
        <div class="public-feed-card pf-skeleton">
          <div class="skeleton-row">
            <div class="skeleton-circle"></div>
            <div style="flex:1">
              <div class="skeleton-line w60" style="margin-bottom:0.5rem"></div>
              <div class="skeleton-line w40"></div>
            </div>
          </div>
          <div class="skeleton-line w100" style="margin-bottom:0.5rem"></div>
          <div class="skeleton-line w80" style="margin-bottom:0.5rem"></div>
          <div class="skeleton-block"></div>
          <div class="skeleton-line w40"></div>
        </div>
      `;
    }
    stream.innerHTML = html;
    this.container.appendChild(stream);
  },

  // ── Main Render ──
  render() {
    this.container.innerHTML = '';
    const stream = document.createElement('div');
    stream.className = 'public-feed-stream';

    // Story bar
    stream.innerHTML += this.renderStoryBar();

    // Feed tabs
    stream.innerHTML += this.renderTabs();

    // Post cards
    const gateAt = window.innerWidth < 768 ? 3 : 5;
    const blurAt = gateAt + 2;

    this.demoPosts.forEach((post, i) => {
      const isBlurred = i >= gateAt && i < blurAt;
      const isGated = i >= blurAt;

      if (isGated) return; // don't render gated posts
      stream.innerHTML += this.renderPostCard(post, isBlurred);
    });

    // Gate card
    const remaining = this.demoPosts.length - blurAt + 10; // imply more
    stream.innerHTML += this.renderGateCard(remaining);

    this.container.appendChild(stream);

    // Bind click handlers
    this.bindActions();

    // Animate cards in
    if (typeof anime !== 'undefined') {
      anime({
        targets: '.public-feed-stream > *',
        opacity: [0, 1],
        translateY: [20, 0],
        delay: anime.stagger(80),
        duration: 500,
        easing: 'easeOutCubic'
      });
    }
  },

  // ── Story Bar ──
  renderStoryBar() {
    const circles = this.demoStories.map(s => `
      <div class="public-story-circle ${s.active ? 'active' : ''}" data-pf-gate="story">
        <div class="public-story-avatar">${s.initials}</div>
        <div class="public-story-name">${s.name}</div>
      </div>
    `).join('');
    return `<div class="public-story-bar">${circles}</div>`;
  },

  // ── Tabs ──
  renderTabs() {
    return `
      <div class="public-feed-tabs">
        <button class="public-feed-tab active">For You</button>
        <button class="public-feed-tab" data-pf-gate="scroll">Following</button>
        <button class="public-feed-tab" data-pf-gate="scroll">Trending</button>
      </div>
    `;
  },

  // ── Post Card ──
  renderPostCard(post, blurred) {
    const blurClass = blurred ? ' pf-blurred' : '';

    // Type badge
    const typeBadges = {
      code_snippet: '<span class="pf-badge type-code">Code</span>',
      project_showcase: '<span class="pf-badge type-showcase">Showcase</span>',
      milestone: '<span class="pf-badge type-milestone">Milestone</span>',
      automation_template: '<span class="pf-badge type-automation">Automation</span>',
      challenge_win: '<span class="pf-badge type-challenge">Challenge Win</span>',
      collab_request: '<span class="pf-badge type-collab">Collab</span>',
      project_update: '<span class="pf-badge type-update">Update</span>',
    };

    const mentorBadge = post.author.level > 0
      ? `<span class="pf-badge mentor">Mentor Lv.${post.author.level}</span>` : '';

    let bodyHTML = post.body ? `<div class="pf-card-body">${this.escapeHTML(post.body)}</div>` : '';

    // Code block
    if (post.code) {
      bodyHTML += `
        <div class="pf-code-block">
          <div class="pf-code-lang">${post.codeLang || 'Code'}</div>
          <pre style="margin:0;white-space:pre-wrap;">${this.escapeHTML(post.code)}</pre>
        </div>
      `;
    }

    // Milestone card
    if (post.milestone) {
      bodyHTML += `
        <div class="pf-milestone-card">
          <div class="pf-milestone-icon">${post.milestone.icon}</div>
          <div class="pf-milestone-text">${this.escapeHTML(post.milestone.text)}</div>
          <div class="pf-milestone-xp">${this.escapeHTML(post.milestone.xp)}</div>
        </div>
      `;
    }

    // Automation card
    if (post.automation) {
      const steps = post.automation.steps.map(s =>
        `<span class="pf-automation-step">${this.escapeHTML(s)}</span>`
      ).join('');
      bodyHTML += `
        <div class="pf-automation-card">
          <div class="pf-automation-header">
            <span>\u2699\uFE0F</span>
            <span class="pf-automation-name">${this.escapeHTML(post.automation.name)}</span>
          </div>
          <div class="pf-automation-steps">${steps}</div>
          <div class="pf-automation-meta">
            <span>${post.automation.clones} clones</span>
            <button class="pf-btn-secondary" style="padding:0.3rem 0.8rem;font-size:0.75rem;" data-pf-gate="scroll">Clone Template</button>
          </div>
        </div>
      `;
    }

    // Tags
    const tagsHTML = post.tags
      ? `<div class="pf-tags">${post.tags.map(t => `<span class="pf-tag">${this.escapeHTML(t)}</span>`).join('')}</div>`
      : '';

    // Top comment
    let commentHTML = '';
    if (post.topComment) {
      commentHTML = `
        <div class="pf-top-comment">
          <div class="pf-top-comment-avatar">${post.topComment.author.charAt(0)}</div>
          <div class="pf-top-comment-body">
            <span class="pf-top-comment-author">${this.escapeHTML(post.topComment.author)}</span>${this.escapeHTML(post.topComment.body)}
          </div>
        </div>
      `;
    }

    return `
      <div class="public-feed-card${blurClass}" data-post-id="${post.id}">
        <div class="pf-card-header">
          <div class="pf-avatar" data-pf-gate="profile">${post.author.initials}</div>
          <div class="pf-author-info">
            <div class="pf-author-row">
              <span class="pf-author-name" data-pf-gate="profile">${this.escapeHTML(post.author.name)}</span>
              <span class="pf-author-handle">${this.escapeHTML(post.author.handle)}</span>
              <span class="pf-time">${post.time}</span>
            </div>
            <div class="pf-meta-row">
              ${mentorBadge}
              ${typeBadges[post.type] || ''}
            </div>
          </div>
        </div>
        ${bodyHTML}
        ${tagsHTML}
        <div class="pf-engagement">
          <span>${post.reactions} reactions</span>
          <span>${post.comments} comments</span>
        </div>
        <div class="pf-actions">
          <button class="pf-action-btn" data-pf-gate="reaction">\u{1F525} React</button>
          <button class="pf-action-btn" data-pf-gate="comment">\u{1F4AC} Comment</button>
          <button class="pf-action-btn" data-pf-gate="bookmark">\u{1F516} Save</button>
          <button class="pf-action-btn">\u{1F517} Share</button>
        </div>
        ${commentHTML}
      </div>
    `;
  },

  // ── Gate Card ──
  renderGateCard(count) {
    return `
      <div class="public-feed-gate">
        <div class="pf-gate-icon">\u{1F512}</div>
        <div class="pf-gate-count">${count}+ more posts from today</div>
        <div class="pf-gate-avatars">
          <div class="pf-avatar">SM</div>
          <div class="pf-avatar">MD</div>
          <div class="pf-avatar">PK</div>
          <div class="pf-avatar">JL</div>
        </div>
        <div class="pf-gate-text">
          See code snippets, project showcases, automation templates, and more from 500+ builders in the community.
        </div>
        <div class="pf-gate-btns">
          <button class="pf-btn-primary" data-pf-gate="scroll">Sign Up Free</button>
          <button class="pf-btn-secondary" data-pf-gate="scroll">Log In</button>
        </div>
      </div>
    `;
  },

  // ── Bind Gated Actions ──
  bindActions() {
    this.container.querySelectorAll('[data-pf-gate]').forEach(el => {
      el.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const gateType = el.getAttribute('data-pf-gate');

        // Share button is free
        if (!gateType) return;

        this.showAuthPopup(gateType);
      });
    });
  },

  // ── Scroll Observer ──
  setupScrollObserver() {
    const section = document.querySelector('.public-feed-section');
    if (!section) return;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting && !this.floatingDismissed) {
          // Show floating CTA after feed is in view
          setTimeout(() => {
            if (this.floatingCTA && !document.querySelector('.public-feed-section.authenticated')) {
              this.floatingCTA.classList.add('visible');
            }
          }, 2000);
        }
      });
    }, { threshold: 0.3 });

    observer.observe(section);
  },

  // ── Floating CTA ──
  setupFloatingCTA() {
    this.floatingCTA = document.getElementById('public-feed-floating-cta');
    if (!this.floatingCTA) return;

    this.floatingCTA.querySelector('.pf-btn-primary')?.addEventListener('click', () => {
      this.showAuthPopup('default');
    });

    this.floatingCTA.querySelector('.pf-floating-dismiss')?.addEventListener('click', () => {
      this.floatingCTA.classList.remove('visible');
      this.floatingDismissed = true;
    });
  },

  // ── Auth Popup ──
  showAuthPopup(triggerType) {
    // If already authenticated, navigate to feed
    if (typeof AuthService !== 'undefined' && AuthService.isAuthenticated()) {
      window.location.href = 'dashboard/feed.html';
      return;
    }

    // Create overlay if not exists
    if (!this.authOverlay) {
      this.createAuthOverlay();
    }

    // Set context message
    const msg = this.contextMessages[triggerType] || this.contextMessages.default;
    this.authOverlay.querySelector('.pf-auth-context').textContent = msg;

    // Default to signup for gate triggers, login for existing user flows
    this.setAuthMode(triggerType === 'scroll' ? 'signup' : 'signup');

    // Show
    this.authOverlay.classList.add('visible');
    document.body.style.overflow = 'hidden';
  },

  hideAuthPopup() {
    if (this.authOverlay) {
      this.authOverlay.classList.remove('visible');
      document.body.style.overflow = '';
    }
  },

  createAuthOverlay() {
    const overlay = document.createElement('div');
    overlay.className = 'pf-auth-overlay';
    overlay.innerHTML = `
      <div class="pf-auth-modal">
        <button class="pf-auth-close">\u2715</button>
        <div class="pf-auth-header">
          <div class="pf-auth-title">Join the Builder Community</div>
          <div class="pf-auth-context"></div>
        </div>
        <button class="pf-auth-google">
          <svg width="18" height="18" viewBox="0 0 18 18"><path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/><path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z"/><path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.997 8.997 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"/><path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"/></svg>
          Continue with Google
        </button>
        <div class="pf-auth-divider">or</div>
        <form class="pf-auth-form">
          <input type="text" class="pf-auth-input pf-name-input" placeholder="Display Name" autocomplete="name">
          <input type="email" class="pf-auth-input" placeholder="Email" autocomplete="email" required>
          <input type="password" class="pf-auth-input" placeholder="Password" autocomplete="current-password" required>
          <div class="pf-auth-error"></div>
          <button type="submit" class="pf-auth-submit">Log In</button>
        </form>
        <div class="pf-auth-toggle">
          <span class="pf-toggle-text">Don't have an account?</span>
          <a class="pf-toggle-link">Sign up</a>
        </div>
      </div>
    `;

    // Close handlers
    overlay.querySelector('.pf-auth-close').addEventListener('click', () => this.hideAuthPopup());
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) this.hideAuthPopup();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') this.hideAuthPopup();
    });

    // Toggle signup/login
    overlay.querySelector('.pf-toggle-link').addEventListener('click', () => {
      this.setAuthMode(this.isAuthMode === 'login' ? 'signup' : 'login');
    });

    // Google auth
    overlay.querySelector('.pf-auth-google').addEventListener('click', () => this.handleGoogleAuth());

    // Form submit
    overlay.querySelector('.pf-auth-form').addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleFormAuth();
    });

    document.body.appendChild(overlay);
    this.authOverlay = overlay;
  },

  setAuthMode(mode) {
    this.isAuthMode = mode;
    if (!this.authOverlay) return;

    const form = this.authOverlay.querySelector('.pf-auth-form');
    const submit = this.authOverlay.querySelector('.pf-auth-submit');
    const toggleText = this.authOverlay.querySelector('.pf-toggle-text');
    const toggleLink = this.authOverlay.querySelector('.pf-toggle-link');
    const passwordInput = this.authOverlay.querySelector('input[type="password"]');

    if (mode === 'signup') {
      form.classList.add('signup-mode');
      submit.textContent = 'Create Account';
      toggleText.textContent = 'Already have an account?';
      toggleLink.textContent = 'Log in';
      passwordInput.autocomplete = 'new-password';
    } else {
      form.classList.remove('signup-mode');
      submit.textContent = 'Log In';
      toggleText.textContent = "Don't have an account?";
      toggleLink.textContent = 'Sign up';
      passwordInput.autocomplete = 'current-password';
    }

    // Clear error
    this.authOverlay.querySelector('.pf-auth-error').textContent = '';
  },

  async handleGoogleAuth() {
    if (typeof AuthService === 'undefined') {
      window.location.href = 'auth/register.html';
      return;
    }

    const btn = this.authOverlay.querySelector('.pf-auth-google');
    btn.disabled = true;
    btn.textContent = 'Signing in...';

    const result = await AuthService.loginWithGoogle();
    if (result.success) {
      this.hideAuthPopup();
      this.onAuthenticated(result.user);
    } else {
      this.authOverlay.querySelector('.pf-auth-error').textContent = result.error;
      btn.disabled = false;
      btn.innerHTML = `<svg width="18" height="18" viewBox="0 0 18 18"><path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/><path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z"/><path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.997 8.997 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"/><path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"/></svg> Continue with Google`;
    }
  },

  async handleFormAuth() {
    if (typeof AuthService === 'undefined') {
      window.location.href = this.isAuthMode === 'signup' ? 'auth/register.html' : 'auth/login.html';
      return;
    }

    const form = this.authOverlay.querySelector('.pf-auth-form');
    const email = form.querySelector('input[type="email"]').value.trim();
    const password = form.querySelector('input[type="password"]').value;
    const nameInput = form.querySelector('.pf-name-input');
    const name = nameInput.value.trim();
    const errorEl = this.authOverlay.querySelector('.pf-auth-error');
    const submit = this.authOverlay.querySelector('.pf-auth-submit');

    errorEl.textContent = '';

    if (!email || !password) {
      errorEl.textContent = 'Please fill in all fields.';
      return;
    }

    if (this.isAuthMode === 'signup' && !name) {
      errorEl.textContent = 'Please enter your name.';
      return;
    }

    submit.disabled = true;
    submit.textContent = this.isAuthMode === 'signup' ? 'Creating account...' : 'Logging in...';

    let result;
    if (this.isAuthMode === 'signup') {
      result = await AuthService.register(email, password, name);
    } else {
      result = await AuthService.loginWithEmail(email, password);
    }

    if (result.success) {
      this.hideAuthPopup();
      this.onAuthenticated(result.user);
    } else {
      errorEl.textContent = result.error;
      submit.disabled = false;
      submit.textContent = this.isAuthMode === 'signup' ? 'Create Account' : 'Log In';
    }
  },

  // ── Helpers ──
  escapeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
};

// Auto-init when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  // Small delay to let the hero section render first
  setTimeout(() => PublicFeed.init(), 200);
});

window.PublicFeed = PublicFeed;
