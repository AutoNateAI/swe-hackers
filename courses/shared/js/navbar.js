/**
 * Shared Navbar Component
 * Handles mobile menu, scroll effects, and active link highlighting
 * 
 * Usage: Include this script on any page with the marketing-nav
 * <script src="shared/js/navbar.js"></script>
 */

(function() {
  'use strict';
  
  // Wait for DOM
  document.addEventListener('DOMContentLoaded', initNavbar);
  
  function initNavbar() {
    const nav = document.getElementById('nav');
    if (!nav) return;
    
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    if (!mobileMenuBtn) return;
    
    // Determine base path based on current location
    const basePath = getBasePath();
    
    // Inject mobile menu if it doesn't exist
    let mobileMenu = document.getElementById('mobile-menu');
    if (!mobileMenu) {
      mobileMenu = createMobileMenu(basePath);
      nav.appendChild(mobileMenu);
    }
    
    // Setup event listeners
    setupMobileMenuToggle(mobileMenuBtn, mobileMenu);
    setupScrollEffect(nav);
    highlightActiveLink();
  }
  
  function getBasePath() {
    const path = window.location.pathname;
    
    // Check if we're in a subdirectory
    if (path.includes('/blog/') || path.includes('/course/') || path.includes('/auth/') || path.includes('/dashboard/')) {
      return '../';
    }
    return '';
  }
  
  function createMobileMenu(basePath) {
    const menu = document.createElement('div');
    menu.className = 'mobile-menu';
    menu.id = 'mobile-menu';
    
    menu.innerHTML = `
      <a href="${basePath}catalog.html">Courses</a>
      <a href="${basePath}blog/">Blog</a>
      <a href="${basePath}consulting.html">Consulting</a>
      <a href="${basePath}enterprise.html">Enterprise</a>
      <a href="${basePath}challenges.html">Challenges</a>
      <div class="mobile-divider"></div>
      <div class="mobile-cta">
        <a href="${basePath}auth/login.html" class="nav-btn secondary">Sign In</a>
        <a href="${basePath}auth/register.html" class="nav-btn primary">Get Started</a>
      </div>
    `;
    
    return menu;
  }
  
  function setupMobileMenuToggle(btn, menu) {
    // Toggle on button click
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
  }
  
  function setupScrollEffect(nav) {
    window.addEventListener('scroll', () => {
      if (window.scrollY > 50) {
        nav.classList.add('scrolled');
      } else {
        nav.classList.remove('scrolled');
      }
    });
    
    // Check initial scroll position
    if (window.scrollY > 50) {
      nav.classList.add('scrolled');
    }
  }
  
  function highlightActiveLink() {
    const path = window.location.pathname;
    const navLinks = document.querySelectorAll('.nav-links .nav-link, .mobile-menu a:not(.nav-btn)');
    
    navLinks.forEach(link => {
      const href = link.getAttribute('href');
      if (!href) return;
      
      // Check if current path matches this link
      const isActive = 
        (href.includes('catalog') && path.includes('catalog')) ||
        (href.includes('blog') && path.includes('/blog')) ||
        (href.includes('consulting') && path.includes('consulting')) ||
        (href.includes('enterprise') && path.includes('enterprise')) ||
        (href.includes('challenges') && path.includes('challenges'));
      
      if (isActive) {
        link.style.color = 'var(--accent-primary)';
      }
    });
  }
})();

