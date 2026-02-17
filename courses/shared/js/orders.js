/**
 * Orders & Returns Page Logic for AutoNateAI Dashboard
 * Amazon-style order experience with product images, status timeline,
 * search/filters, expandable details, and multi-step return flow.
 */

(function () {
  'use strict';

  let currentUser = null;
  let ordersData = [];
  let filteredOrders = [];

  // Return flow state
  const returnState = {
    step: 1,
    orderId: '',
    reason: '',
    reasonKey: '',
    comments: ''
  };

  // =========================================================================
  // TAB SWITCHING
  // =========================================================================

  function setupTabs() {
    const tabs = document.querySelectorAll('.orders-tab');
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');

        document.querySelectorAll('.orders-tab-content').forEach(c => c.classList.remove('active'));
        const target = document.getElementById('tab-' + tab.dataset.tab);
        if (target) target.classList.add('active');
      });
    });
  }

  function switchToTab(tabName) {
    const tabs = document.querySelectorAll('.orders-tab');
    tabs.forEach(t => {
      t.classList.toggle('active', t.dataset.tab === tabName);
    });
    document.querySelectorAll('.orders-tab-content').forEach(c => c.classList.remove('active'));
    const target = document.getElementById('tab-' + tabName);
    if (target) target.classList.add('active');
  }

  // =========================================================================
  // FETCH ORDERS
  // =========================================================================

  async function fetchOrders(uid) {
    const db = window.FirebaseApp.getDb();
    if (!db) return [];

    try {
      const snapshot = await db
        .collection('purchases')
        .where('userId', '==', uid)
        .orderBy('createdAt', 'desc')
        .get();

      const orders = [];
      snapshot.forEach(doc => {
        orders.push({ id: doc.id, ...doc.data() });
      });
      return orders;
    } catch (error) {
      console.error('Orders: Error fetching purchases:', error);
      return [];
    }
  }

  // =========================================================================
  // SEARCH & FILTER
  // =========================================================================

  function setupSearch() {
    const searchInput = document.getElementById('order-search-input');
    const dateFilter = document.getElementById('order-date-filter');

    if (searchInput) {
      searchInput.addEventListener('input', () => {
        filterOrders(searchInput.value, dateFilter ? dateFilter.value : 'all');
      });
    }

    if (dateFilter) {
      dateFilter.addEventListener('change', () => {
        filterOrders(searchInput ? searchInput.value : '', dateFilter.value);
      });
    }
  }

  function filterOrders(searchTerm, dateRange) {
    const term = (searchTerm || '').toLowerCase().trim();
    const days = dateRange === 'all' ? null : parseInt(dateRange, 10);
    const cutoff = days ? new Date(Date.now() - days * 24 * 60 * 60 * 1000) : null;

    filteredOrders = ordersData.filter(order => {
      // Search filter
      if (term) {
        const product = window.WhopService ? window.WhopService.getProduct(order.productId) : null;
        const name = (product ? product.name : (order.productName || order.productId || '')).toLowerCase();
        if (!name.includes(term)) return false;
      }

      // Date filter
      if (cutoff) {
        const d = toDate(order.createdAt);
        if (!d || d < cutoff) return false;
      }

      return true;
    });

    renderOrderCards(filteredOrders);
  }

  // =========================================================================
  // RENDER ORDERS
  // =========================================================================

  function renderOrders(orders) {
    ordersData = orders;
    filteredOrders = orders;
    renderOrderCards(orders);
    populateReturnSelect(orders);
  }

  function renderOrderCards(orders) {
    const container = document.getElementById('orders-list');

    if (!orders || orders.length === 0) {
      const t = window.I18n ? window.I18n.t : k => k;
      container.innerHTML = `
        <div class="orders-empty">
          <div class="orders-empty__icon">&#x1F6CD;&#xFE0F;</div>
          <h2 class="orders-empty__title">${escapeHtml(t('orders.empty_title'))}</h2>
          <p class="orders-empty__desc">${escapeHtml(t('orders.empty_desc'))}</p>
          <a href="../shop.html" class="orders-empty__cta">${escapeHtml(t('orders.browse_shop'))} &#8594;</a>
        </div>
      `;
      return;
    }

    container.innerHTML = orders.map(order => {
      const product = window.WhopService ? window.WhopService.getProduct(order.productId) : null;
      const name = product ? product.name : (order.productName || order.productId || 'Unknown Product');
      const icon = product ? (product.platformIcon || '&#x1F4E6;') : '&#x1F4E6;';
      const imageUrl = product && product.image ? product.image : '';
      const amount = order.amount != null ? '$' + parseFloat(order.amount).toFixed(2) : '';
      const date = formatDate(order.createdAt);
      const status = order.status || 'completed';
      const orderId = order.id || '';
      const shortId = orderId.length > 8 ? orderId.slice(0, 8) + '...' : orderId;
      const t = window.I18n ? window.I18n.t : k => k;

      // Build item details line
      const detailParts = [];
      if (order.size) detailParts.push('Size: ' + order.size);
      if (order.color) detailParts.push('Color: ' + order.color);
      if (order.quantity && order.quantity > 1) detailParts.push('Qty: ' + order.quantity);
      const detailLine = detailParts.length > 0 ? detailParts.join(' &middot; ') : '';

      // Status line text
      const statusDisplay = getStatusDisplay(status, date);

      // Timeline HTML
      const timelineHtml = buildTimeline(status, t);

      // Delivery type
      const isDigital = !order.size && !order.color;
      const deliveryText = isDigital ? t('orders.digital_delivery') : t('orders.merch_shipping');

      // Image element
      const imageHtml = imageUrl
        ? `<img class="order-card__image" src="${escapeHtml(imageUrl)}" alt="${escapeHtml(name)}" onerror="this.outerHTML='<div class=\\'order-card__image-placeholder\\'>${icon}</div>'">`
        : `<div class="order-card__image-placeholder">${icon}</div>`;

      return `
        <div class="order-card" data-order-id="${escapeHtml(orderId)}">
          <div class="order-card__header">
            <div class="order-card__header-item">
              <span class="order-card__header-label">${escapeHtml(t('orders.order_placed'))}</span>
              <span class="order-card__header-value">${date}</span>
            </div>
            <div class="order-card__header-item">
              <span class="order-card__header-label">${escapeHtml(t('orders.total'))}</span>
              <span class="order-card__header-value">${amount}</span>
            </div>
            <div class="order-card__header-spacer"></div>
            <div class="order-card__header-item">
              <span class="order-card__header-label">${escapeHtml(t('orders.order_number'))}</span>
              <span class="order-card__order-id" title="${escapeHtml(orderId)}">${escapeHtml(shortId)}</span>
            </div>
          </div>

          <div class="order-card__body" onclick="window._orderToggleDetail('${escapeHtml(orderId)}')">
            ${imageHtml}
            <div class="order-card__info">
              <div class="order-card__name">${escapeHtml(name)}</div>
              ${detailLine ? `<div class="order-card__item-details">${detailLine}</div>` : ''}
              <div class="order-card__status-line">
                <span class="order-card__status-dot order-card__status-dot--${status}"></span>
                <span class="order-card__status-text">${statusDisplay.text}</span>
                <span class="order-card__status-date">${statusDisplay.date}</span>
              </div>
              ${timelineHtml}
            </div>
          </div>

          <div class="order-card__detail" id="detail-${escapeHtml(orderId)}">
            <div class="order-card__detail-row">
              <span class="order-card__detail-label">${escapeHtml(t('orders.order_number'))}</span>
              <span class="order-card__detail-value">${escapeHtml(orderId)}</span>
            </div>
            <div class="order-card__detail-row">
              <span class="order-card__detail-label">${escapeHtml(t('orders.total'))}</span>
              <span class="order-card__detail-value">${amount}</span>
            </div>
            <div class="order-card__detail-row">
              <span class="order-card__detail-label">${escapeHtml(t('orders.delivery'))}</span>
              <span class="order-card__detail-value">${escapeHtml(deliveryText)}</span>
            </div>
          </div>

          <div class="order-card__actions">
            <a href="../shop.html?highlight=${encodeURIComponent(order.productId || '')}" class="order-card__action-btn order-card__action-btn--primary">${escapeHtml(t('orders.buy_again'))}</a>
            <button class="order-card__action-btn" onclick="window._orderToggleDetail('${escapeHtml(orderId)}')">${escapeHtml(t('orders.track_package'))}</button>
            <button class="order-card__action-btn" onclick="window._orderReturnFromOrder('${escapeHtml(orderId)}')">${escapeHtml(t('orders.return_replace'))}</button>
          </div>
        </div>
      `;
    }).join('');

    // Animate cards
    if (window.anime) {
      anime({
        targets: '.order-card',
        opacity: [0, 1],
        translateY: [20, 0],
        delay: anime.stagger(80),
        easing: 'easeOutCubic',
        duration: 500
      });
    }
  }

  function getStatusDisplay(status, orderDate) {
    const t = window.I18n ? window.I18n.t : k => k;
    const statusMap = {
      pending: { text: t('orders.status_ordered'), date: orderDate },
      processing: { text: t('orders.status_processing'), date: '' },
      shipped: { text: t('orders.status_shipped'), date: '' },
      delivered: { text: t('orders.status_delivered'), date: '' },
      completed: { text: t('orders.status_delivered'), date: '' },
      refunded: { text: 'Refunded', date: '' }
    };
    return statusMap[status] || { text: status, date: '' };
  }

  function buildTimeline(status, t) {
    const steps = [
      { key: 'ordered', label: t('orders.status_ordered') },
      { key: 'processing', label: t('orders.status_processing') },
      { key: 'shipped', label: t('orders.status_shipped') },
      { key: 'delivered', label: t('orders.status_delivered') }
    ];

    const statusOrder = ['pending', 'processing', 'shipped', 'delivered', 'completed'];
    const currentIdx = statusOrder.indexOf(status);
    // Map 'completed' to 'delivered' level (index 3)
    const effectiveIdx = status === 'completed' ? 4 : currentIdx;

    let html = '<div class="order-timeline">';
    steps.forEach((step, i) => {
      const stepIdx = i; // 0=ordered, 1=processing, 2=shipped, 3=delivered
      const isCompleted = effectiveIdx > stepIdx;
      const isActive = effectiveIdx === stepIdx;
      const cls = isCompleted ? 'completed' : (isActive ? 'active' : '');

      html += `<div class="order-timeline__step ${cls}">
        <div class="order-timeline__dot"></div>
        <span class="order-timeline__label">${escapeHtml(step.label)}</span>
      </div>`;

      if (i < steps.length - 1) {
        const lineCompleted = effectiveIdx > stepIdx + 1 || (effectiveIdx === stepIdx + 1 && isCompleted);
        // line is completed if next step is completed
        const lineCls = effectiveIdx > i + 1 ? 'completed' : '';
        html += `<div class="order-timeline__line ${lineCls}"></div>`;
      }
    });
    html += '</div>';
    return html;
  }

  // =========================================================================
  // ORDER DETAIL EXPANSION
  // =========================================================================

  function toggleOrderDetail(orderId) {
    const detail = document.getElementById('detail-' + orderId);
    if (!detail) return;
    detail.classList.toggle('expanded');
  }

  // Expose to global for onclick handlers
  window._orderToggleDetail = toggleOrderDetail;

  // =========================================================================
  // BUY AGAIN & RETURN FROM ORDER
  // =========================================================================

  function handleReturnFromOrder(orderId) {
    switchToTab('returns');

    // Pre-select the order in the return form
    const select = document.getElementById('return-order-select');
    if (select) {
      select.value = orderId;
      // Enable next button since order is selected
      const nextBtn = document.getElementById('return-next-1');
      if (nextBtn) nextBtn.disabled = false;
    }

    // Reset to step 1
    goToReturnStep(1);
  }

  window._orderReturnFromOrder = handleReturnFromOrder;

  // =========================================================================
  // RETURNS
  // =========================================================================

  function populateReturnSelect(orders) {
    const select = document.getElementById('return-order-select');
    if (!select) return;

    select.innerHTML = '<option value="">-- Choose an order --</option>';

    orders.forEach(order => {
      const product = window.WhopService ? window.WhopService.getProduct(order.productId) : null;
      const name = product ? product.name : (order.productName || order.productId || 'Unknown Product');
      const date = formatDate(order.createdAt);
      const opt = document.createElement('option');
      opt.value = order.id;
      opt.textContent = `${name} (${date})`;
      select.appendChild(opt);
    });
  }

  async function submitReturn(orderId, reason) {
    const db = window.FirebaseApp.getDb();
    if (!db || !currentUser) return;

    const order = ordersData.find(o => o.id === orderId);
    if (!order) throw new Error('Order not found');

    const product = window.WhopService ? window.WhopService.getProduct(order.productId) : null;
    const productName = product ? product.name : (order.productName || order.productId || 'Unknown Product');

    await db.collection('returns').add({
      userId: currentUser.uid,
      orderId: orderId,
      productId: order.productId || '',
      productName: productName,
      reason: reason,
      status: 'pending',
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
  }

  async function fetchReturns(uid) {
    const db = window.FirebaseApp.getDb();
    if (!db) return [];

    try {
      const snapshot = await db
        .collection('returns')
        .where('userId', '==', uid)
        .orderBy('createdAt', 'desc')
        .get();

      const returns = [];
      snapshot.forEach(doc => {
        returns.push({ id: doc.id, ...doc.data() });
      });
      return returns;
    } catch (error) {
      console.error('Orders: Error fetching returns:', error);
      return [];
    }
  }

  function renderReturns(returns) {
    const container = document.getElementById('returns-list');
    const t = window.I18n ? window.I18n.t : k => k;

    if (!returns || returns.length === 0) {
      container.innerHTML = `
        <p style="color: var(--text-muted); font-size: 0.9rem;">${escapeHtml(t('orders.return_no_requests'))}</p>
      `;
      return;
    }

    container.innerHTML = returns.map(ret => {
      const status = ret.status || 'pending';
      const statusLabel = status.charAt(0).toUpperCase() + status.slice(1);
      const date = formatDate(ret.createdAt);

      // Mini status timeline for returns
      const returnSteps = ['pending', 'approved'];
      const isDenied = status === 'denied';
      const returnTimelineHtml = buildReturnTimeline(status);

      return `
        <div class="return-card">
          <div class="return-card__info">
            <div class="return-card__product">${escapeHtml(ret.productName || 'Unknown Product')}</div>
            <div class="return-card__reason">${escapeHtml(ret.reason || '')}</div>
            <div class="return-card__date">Submitted ${date}</div>
            ${returnTimelineHtml}
          </div>
          <span class="status-badge status-badge--${status}">${statusLabel}</span>
        </div>
      `;
    }).join('');
  }

  function buildReturnTimeline(status) {
    const steps = ['Pending', 'Reviewed', status === 'denied' ? 'Denied' : 'Approved'];
    const statusIdx = { pending: 0, approved: 2, denied: 2 };
    const currentIdx = statusIdx[status] != null ? statusIdx[status] : 0;

    let html = '<div class="return-card__status-timeline">';
    steps.forEach((step, i) => {
      const cls = i < currentIdx ? 'completed' : (i === currentIdx ? 'active' : '');
      html += `<span class="return-card__status-step ${cls}">${escapeHtml(step)}</span>`;
      if (i < steps.length - 1) {
        html += '<span class="return-card__status-arrow">&#8594;</span>';
      }
    });
    html += '</div>';
    return html;
  }

  // =========================================================================
  // MULTI-STEP RETURN FORM
  // =========================================================================

  function setupReturnForm() {
    const form = document.getElementById('return-form');
    if (!form) return;

    const orderSelect = document.getElementById('return-order-select');
    const nextBtn1 = document.getElementById('return-next-1');
    const nextBtn2 = document.getElementById('return-next-2');
    const nextBtn3 = document.getElementById('return-next-3');
    const backBtn2 = document.getElementById('return-back-2');
    const backBtn3 = document.getElementById('return-back-3');
    const backBtn4 = document.getElementById('return-back-4');

    // Step 1: Enable next when order selected
    if (orderSelect) {
      orderSelect.addEventListener('change', () => {
        returnState.orderId = orderSelect.value;
        if (nextBtn1) nextBtn1.disabled = !orderSelect.value;
      });
    }

    // Step 1 next
    if (nextBtn1) {
      nextBtn1.addEventListener('click', () => {
        if (!returnState.orderId) return;
        goToReturnStep(2);
      });
    }

    // Step 2: Reason selection
    const reasonOptions = document.querySelectorAll('.return-reason-option');
    reasonOptions.forEach(opt => {
      opt.addEventListener('click', () => {
        reasonOptions.forEach(o => o.classList.remove('selected'));
        opt.classList.add('selected');
        const radio = opt.querySelector('input[type="radio"]');
        if (radio) radio.checked = true;
        returnState.reasonKey = opt.dataset.reason || '';
        returnState.reason = opt.querySelector('.return-reason-option__text')?.textContent || '';
        if (nextBtn2) nextBtn2.disabled = false;
      });
    });

    // Step 2 navigation
    if (nextBtn2) {
      nextBtn2.addEventListener('click', () => {
        if (!returnState.reasonKey) return;
        goToReturnStep(3);
      });
    }
    if (backBtn2) backBtn2.addEventListener('click', () => goToReturnStep(1));

    // Step 3: Comments (next always enabled unless reason is "other" and comments empty)
    const commentsTextarea = document.getElementById('return-comments');
    if (nextBtn3 && commentsTextarea) {
      const updateStep3Next = () => {
        returnState.comments = commentsTextarea.value.trim();
        if (returnState.reasonKey === 'other') {
          nextBtn3.disabled = !returnState.comments;
        } else {
          nextBtn3.disabled = false;
        }
      };
      commentsTextarea.addEventListener('input', updateStep3Next);
      nextBtn3.addEventListener('click', () => {
        returnState.comments = commentsTextarea.value.trim();
        updateConfirmSummary();
        goToReturnStep(4);
      });
    }
    if (backBtn3) backBtn3.addEventListener('click', () => goToReturnStep(2));

    // Step 4: Back & Submit
    if (backBtn4) backBtn4.addEventListener('click', () => goToReturnStep(3));

    // Form submit
    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const submitBtn = document.getElementById('return-submit-btn');
      const fullReason = returnState.comments
        ? `${returnState.reason}: ${returnState.comments}`
        : returnState.reason;

      // Remove existing messages
      const existingMsg = form.querySelector('.form-message');
      if (existingMsg) existingMsg.remove();

      submitBtn.disabled = true;
      submitBtn.textContent = 'Submitting...';

      try {
        await submitReturn(returnState.orderId, fullReason);

        const msg = document.createElement('div');
        msg.className = 'form-message form-message--success';
        msg.textContent = 'Return request submitted successfully!';
        form.parentElement.insertBefore(msg, form);

        // Reset form and state
        form.reset();
        returnState.step = 1;
        returnState.orderId = '';
        returnState.reason = '';
        returnState.reasonKey = '';
        returnState.comments = '';
        document.querySelectorAll('.return-reason-option').forEach(o => o.classList.remove('selected'));
        goToReturnStep(1);
        if (nextBtn1) nextBtn1.disabled = true;
        if (nextBtn2) nextBtn2.disabled = true;

        // Refresh returns list
        const returns = await fetchReturns(currentUser.uid);
        renderReturns(returns);
      } catch (error) {
        console.error('Orders: Error submitting return:', error);
        const msg = document.createElement('div');
        msg.className = 'form-message form-message--error';
        msg.textContent = 'Failed to submit return request. Please try again.';
        form.parentElement.insertBefore(msg, form);
      } finally {
        submitBtn.disabled = false;
        const t = window.I18n ? window.I18n.t : k => k;
        submitBtn.textContent = t('orders.return_submit');
      }
    });
  }

  function goToReturnStep(step) {
    returnState.step = step;

    // Update step content visibility
    document.querySelectorAll('.return-step').forEach(el => el.classList.remove('active'));
    const stepEl = document.getElementById('return-step-' + step);
    if (stepEl) stepEl.classList.add('active');

    // Update step indicator
    const indicator = document.getElementById('return-steps-indicator');
    if (indicator) {
      indicator.querySelectorAll('.return-steps-indicator__step').forEach(el => {
        const s = parseInt(el.dataset.step, 10);
        el.classList.remove('active', 'completed');
        if (s < step) el.classList.add('completed');
        if (s === step) el.classList.add('active');
      });
      indicator.querySelectorAll('.return-steps-indicator__line').forEach((line, i) => {
        line.classList.toggle('completed', i < step - 1);
      });
    }

    // Handle step 3 next button state for "other" reason
    if (step === 3) {
      const nextBtn3 = document.getElementById('return-next-3');
      if (nextBtn3) {
        if (returnState.reasonKey === 'other') {
          nextBtn3.disabled = !returnState.comments;
        } else {
          nextBtn3.disabled = false;
        }
      }
    }
  }

  function updateConfirmSummary() {
    const container = document.getElementById('return-confirm-summary');
    if (!container) return;

    const order = ordersData.find(o => o.id === returnState.orderId);
    const product = order && window.WhopService ? window.WhopService.getProduct(order.productId) : null;
    const productName = product ? product.name : (order ? (order.productName || order.productId || 'Unknown') : 'Unknown');
    const t = window.I18n ? window.I18n.t : k => k;

    container.innerHTML = `
      <div class="return-confirm-summary__row">
        <span class="return-confirm-summary__label">${escapeHtml(t('orders.return_select'))}</span>
        <span class="return-confirm-summary__value">${escapeHtml(productName)}</span>
      </div>
      <div class="return-confirm-summary__row">
        <span class="return-confirm-summary__label">${escapeHtml(t('orders.return_reason'))}</span>
        <span class="return-confirm-summary__value">${escapeHtml(returnState.reason)}</span>
      </div>
      ${returnState.comments ? `
      <div class="return-confirm-summary__row">
        <span class="return-confirm-summary__label">${escapeHtml(t('orders.step_comments'))}</span>
        <span class="return-confirm-summary__value">${escapeHtml(returnState.comments)}</span>
      </div>` : ''}
    `;
  }

  // =========================================================================
  // HELPERS
  // =========================================================================

  function toDate(timestamp) {
    if (!timestamp) return null;
    if (timestamp.toDate) return timestamp.toDate();
    if (timestamp.seconds) return new Date(timestamp.seconds * 1000);
    const d = new Date(timestamp);
    return isNaN(d.getTime()) ? null : d;
  }

  function formatDate(timestamp) {
    const d = toDate(timestamp);
    if (!d) return 'Unknown date';
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  function escapeHtml(str) {
    if (str == null) return '';
    const div = document.createElement('div');
    div.textContent = String(str);
    return div.innerHTML;
  }

  // =========================================================================
  // SIDEBAR & AUTH (same pattern as library.html)
  // =========================================================================

  function loadUserInfo(user) {
    const displayName = user.displayName || user.email.split('@')[0];
    document.getElementById('user-name').textContent = displayName;
    const avatar = document.getElementById('user-avatar');
    if (user.photoURL) {
      avatar.innerHTML = '<img src="' + user.photoURL + '" alt="Avatar">';
    } else {
      avatar.textContent = displayName.charAt(0).toUpperCase();
    }
  }

  function setupSidebar() {
    const sidebar = document.getElementById('sidebar');
    const toggle = document.getElementById('sidebar-toggle');
    const overlay = document.getElementById('sidebar-overlay');
    const mobileBtn = document.getElementById('mobile-menu-btn');

    toggle.addEventListener('click', () => {
      sidebar.classList.toggle('collapsed');
      localStorage.setItem('sidebarCollapsed', sidebar.classList.contains('collapsed'));
    });

    if (localStorage.getItem('sidebarCollapsed') === 'true') {
      sidebar.classList.add('collapsed');
    }

    mobileBtn.addEventListener('click', () => { sidebar.classList.add('open'); });
    overlay.addEventListener('click', () => { sidebar.classList.remove('open'); });
  }

  function setupLogout() {
    document.getElementById('logout-link').addEventListener('click', async (e) => {
      e.preventDefault();
      await window.AuthService.logout();
      window.location.href = '../index.html';
    });
  }

  // =========================================================================
  // INIT
  // =========================================================================

  document.addEventListener('DOMContentLoaded', async () => {
    const loadingScreen = document.getElementById('auth-loading');
    const dashboardContent = document.getElementById('dashboard-content');

    // Initialize Firebase
    if (!window.FirebaseApp.init()) {
      console.error('Firebase initialization failed');
      loadingScreen.innerHTML = '<div class="loading-content"><p>Error loading. Please refresh.</p></div>';
      return;
    }

    window.AuthService.init();

    // Wait for auth state
    const user = await window.AuthService.waitForAuthState();

    if (!user) {
      window.AuthService.setRedirectUrl(window.location.href);
      window.location.href = '../auth/login.html';
      return;
    }

    currentUser = user;

    // User is logged in, show page
    loadingScreen.classList.add('hidden');
    dashboardContent.classList.add('ready');

    // Setup sidebar, user info, logout
    setupSidebar();
    setupLogout();
    loadUserInfo(user);
    setupTabs();
    setupSearch();
    setupReturnForm();

    // Check admin/basketball sections
    if (window.RBACService) {
      const isAdmin = await window.RBACService.hasRole('admin');
      if (isAdmin) document.getElementById('admin-section').style.display = 'block';
      const hasBasketball = isAdmin || await window.RBACService.belongsToOrganization('city-high-basketball');
      if (hasBasketball) document.getElementById('basketball-section').style.display = 'block';
    }

    // Load orders
    const orders = await fetchOrders(user.uid);
    renderOrders(orders);

    // Load returns
    const returns = await fetchReturns(user.uid);
    renderReturns(returns);

    // Listen for auth changes
    window.AuthService.onAuthStateChanged((user) => {
      if (!user) {
        window.location.href = '../auth/login.html';
      }
    });
  });
})();
