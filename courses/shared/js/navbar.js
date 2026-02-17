/**
 * Centralized Navbar Component
 * Single source of truth for navigation across all marketing pages
 * 
 * Usage:
 * 1. Add a container: <div id="navbar-container"></div>
 * 2. Include script: <script src="shared/js/navbar.js" defer></script>
 * 3. Call: NavbarComponent.inject('navbar-container')
 * 
 * Or for legacy pages with inline nav, just include the script and it will
 * enhance the existing nav with mobile menu and scroll effects.
 */

const NavbarComponent = {
  template: `
    <nav class="marketing-nav" id="nav">
      <div class="nav-container">
        <a href="{{baseUrl}}index.html" class="nav-logo">
          <span class="nav-logo-icon">🏛️</span>
          <span>AutoNateAI</span>
        </a>
        
        <div class="nav-links">
          <a href="{{baseUrl}}shop.html" class="nav-link" data-page="shop">Shop</a>
          <a href="{{baseUrl}}about.html" class="nav-link" data-page="about">About</a>
          <a href="{{baseUrl}}contact.html" class="nav-link" data-page="contact">Contact</a>
        </div>

        <div class="nav-cta">
          <a href="{{baseUrl}}dashboard/orders.html" class="nav-orders-link" data-auth-only="true">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/><path d="M9 14l2 2 4-4"/></svg>
            <span>Orders & Returns</span>
          </a>
          <a href="{{baseUrl}}auth/login.html" class="nav-btn secondary">Sign In</a>
          <a href="{{baseUrl}}shop.html" class="nav-btn primary">Browse Tools</a>
        </div>
        
        <button class="mobile-menu-btn" id="mobile-menu-btn" aria-label="Toggle menu">☰</button>
      </div>
      
      <div class="mobile-menu" id="mobile-menu">
        <a href="{{baseUrl}}shop.html">Shop</a>
        <a href="{{baseUrl}}about.html">About</a>
        <a href="{{baseUrl}}contact.html">Contact</a>
        <a href="{{baseUrl}}dashboard/orders.html" class="mobile-orders-link" data-auth-only="true">Orders & Returns</a>
        <div class="mobile-divider"></div>
        <div class="mobile-cta">
          <a href="{{baseUrl}}auth/login.html" class="nav-btn secondary">Sign In</a>
          <a href="{{baseUrl}}shop.html" class="nav-btn primary">Browse Tools</a>
        </div>
      </div>
    </nav>
  `,
  
  /**
   * Inject navbar into a container element
   * @param {string} containerId - ID of the container element
   * @param {Object} options - Configuration options
   * @param {string} options.baseUrl - Base URL for links (auto-detected if not provided)
   * @param {string} options.activePage - Current page to highlight (auto-detected if not provided)
   */
  inject(containerId, options = {}) {
    const container = document.getElementById(containerId);
    if (!container) {
      console.warn(`NavbarComponent: Container #${containerId} not found`);
      return;
    }

    const baseUrl = options.baseUrl || this.detectBaseUrl();
    let html = this.template.replace(/\{\{baseUrl\}\}/g, baseUrl);

    // Apply cached auth state immediately to prevent flicker
    const isLoggedIn = localStorage.getItem('navAuthState') === 'true';
    if (isLoggedIn) {
      const feedUrl = baseUrl + 'dashboard/feed.html';
      html = html.replace(
        new RegExp(`href="${baseUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}auth/login\\.html" class="nav-btn secondary">Sign In</`, 'g'),
        `href="${feedUrl}" class="nav-btn secondary">My Feed</`
      );
    } else {
      // Hide auth-only elements when not logged in (cached state)
      html = html.replace(/data-auth-only="true"/g, 'data-auth-only="true" style="display:none"');
    }

    container.innerHTML = html;

    const activePage = options.activePage || this.detectCurrentPage();
    this.highlightActiveLink(activePage);

    this.setupMobileMenu();
    this.setupScrollEffect();
    this.setupAuthAwareButtons(baseUrl);
  },

  /**
   * Check Firebase auth state and swap Sign In → My Feed if logged in
   */
  async setupAuthAwareButtons(baseUrl) {
    // Use the same Firebase + AuthService pattern as dashboard pages
    if (!window.FirebaseApp || !window.AuthService) return;

    if (!window.FirebaseApp.init()) return;
    window.AuthService.init();

    const user = await window.AuthService.waitForAuthState();
    const feedUrl = baseUrl + 'dashboard/feed.html';

    if (user) {
      localStorage.setItem('navAuthState', 'true');
      document.querySelectorAll('.nav-cta a.secondary, .mobile-cta a.secondary').forEach(btn => {
        btn.href = feedUrl;
        btn.textContent = 'My Feed';
      });
      // Show orders link when logged in
      document.querySelectorAll('[data-auth-only]').forEach(el => {
        el.style.display = '';
      });
    } else {
      localStorage.removeItem('navAuthState');
      document.querySelectorAll('.nav-cta a.secondary, .mobile-cta a.secondary').forEach(btn => {
        btn.href = baseUrl + 'auth/login.html';
        btn.textContent = 'Sign In';
      });
      // Hide orders link when logged out
      document.querySelectorAll('[data-auth-only]').forEach(el => {
        el.style.display = 'none';
      });
    }
  },
  
  /**
   * Detect base URL based on current page depth
   */
  detectBaseUrl() {
    const path = window.location.pathname;
    
    if (path.includes('/blog/') || 
        path.includes('/course/') || 
        path.includes('/auth/') || 
        path.includes('/dashboard/')) {
      return '../';
    }
    return '';
  },
  
  /**
   * Detect current page for active link highlighting
   */
  detectCurrentPage() {
    const path = window.location.pathname;
    
    if (path.includes('shop')) return 'shop';
    if (path.includes('about')) return 'about';
    if (path.includes('contact')) return 'contact';
    if (path.includes('/blog')) return 'blog';

    return '';
  },
  
  /**
   * Highlight the active navigation link
   */
  highlightActiveLink(activePage) {
    if (!activePage) return;
    
    const activeLink = document.querySelector(`[data-page="${activePage}"]`);
    if (activeLink) {
      activeLink.style.color = 'var(--accent-primary)';
    }
    
    // Also highlight in mobile menu
    const mobileLinks = document.querySelectorAll('.mobile-menu a:not(.nav-btn)');
    mobileLinks.forEach(link => {
      const href = link.getAttribute('href') || '';
      if (href.includes(activePage)) {
        link.style.color = 'var(--accent-primary)';
      }
    });
  },
  
  /**
   * Setup mobile menu toggle functionality
   */
  setupMobileMenu() {
    const btn = document.getElementById('mobile-menu-btn');
    const menu = document.getElementById('mobile-menu');
    
    if (!btn || !menu) return;
    
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = menu.classList.toggle('active');
      btn.textContent = isOpen ? '✕' : '☰';
      btn.setAttribute('aria-expanded', isOpen);
    });
    
    // Close when clicking a link
    menu.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        menu.classList.remove('active');
        btn.textContent = '☰';
      });
    });
    
    // Close when clicking outside
    document.addEventListener('click', (e) => {
      const nav = document.getElementById('nav');
      if (nav && !nav.contains(e.target) && menu.classList.contains('active')) {
        menu.classList.remove('active');
        btn.textContent = '☰';
      }
    });
  },
  
  /**
   * Setup scroll effect for navbar background
   */
  setupScrollEffect() {
    const nav = document.getElementById('nav');
    if (!nav) return;
    
    const handleScroll = () => {
      if (window.scrollY > 50) {
        nav.classList.add('scrolled');
      } else {
        nav.classList.remove('scrolled');
      }
    };
    
    window.addEventListener('scroll', handleScroll);
    handleScroll(); // Check initial position
  }
};

// Legacy support: Auto-initialize for pages with existing inline nav
(function() {
  'use strict';
  
  document.addEventListener('DOMContentLoaded', () => {
    // Check if navbar was injected via NavbarComponent
    const injectedNav = document.querySelector('#navbar-container #nav');
    
    // If not injected, enhance existing inline nav (legacy support)
    if (!injectedNav) {
      const existingNav = document.getElementById('nav');
      if (existingNav && existingNav.classList.contains('marketing-nav')) {
        // Setup mobile menu and scroll for legacy inline navbars
        NavbarComponent.setupMobileMenu();
        NavbarComponent.setupScrollEffect();
        
        // Highlight active link
        const activePage = NavbarComponent.detectCurrentPage();
        NavbarComponent.highlightActiveLink(activePage);
      }
    }
  });
})();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = NavbarComponent;
}
