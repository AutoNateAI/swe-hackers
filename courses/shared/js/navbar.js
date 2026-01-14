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
          <a href="{{baseUrl}}catalog.html" class="nav-link" data-page="catalog">Courses</a>
          <a href="{{baseUrl}}blog/" class="nav-link" data-page="blog">Blog</a>
          <a href="{{baseUrl}}partnerships.html" class="nav-link" data-page="partnerships">Partnerships</a>
          <a href="{{baseUrl}}challenges.html" class="nav-link" data-page="challenges">Challenges</a>
        </div>
        
        <div class="nav-cta">
          <a href="{{baseUrl}}auth/login.html" class="nav-btn secondary">Sign In</a>
          <a href="{{baseUrl}}auth/register.html" class="nav-btn primary">Get Started</a>
        </div>
        
        <button class="mobile-menu-btn" id="mobile-menu-btn" aria-label="Toggle menu">☰</button>
      </div>
      
      <div class="mobile-menu" id="mobile-menu">
        <a href="{{baseUrl}}catalog.html">Courses</a>
        <a href="{{baseUrl}}blog/">Blog</a>
        <a href="{{baseUrl}}partnerships.html">Partnerships</a>
        <a href="{{baseUrl}}challenges.html">Challenges</a>
        <div class="mobile-divider"></div>
        <div class="mobile-cta">
          <a href="{{baseUrl}}auth/login.html" class="nav-btn secondary">Sign In</a>
          <a href="{{baseUrl}}auth/register.html" class="nav-btn primary">Get Started</a>
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
    const html = this.template.replace(/\{\{baseUrl\}\}/g, baseUrl);
    
    container.innerHTML = html;
    
    const activePage = options.activePage || this.detectCurrentPage();
    this.highlightActiveLink(activePage);
    
    this.setupMobileMenu();
    this.setupScrollEffect();
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
    
    if (path.includes('catalog')) return 'catalog';
    if (path.includes('/blog')) return 'blog';
    if (path.includes('partnerships') || path.includes('enterprise')) return 'partnerships';
    if (path.includes('challenges')) return 'challenges';
    
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
