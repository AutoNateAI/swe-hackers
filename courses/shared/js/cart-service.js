/**
 * Cart Service for AutoNateAI Shop
 * Client-side shopping cart with localStorage persistence
 *
 * Usage:
 * 1. Include script: <script src="shared/js/cart-service.js"></script>
 * 2. Access via window.CartService
 * 3. Call CartService.init() on page load
 */

const CartService = {
  STORAGE_KEY: 'autonateai_cart',
  items: [],
  _listeners: [],

  /* ---- INITIALIZATION ---- */
  init() {
    this.load();
    this.updateBadge();
    this.renderDrawer();
  },

  /* ---- ADD ITEM ---- */
  addItem(productId, quantity = 1, options = {}) {
    const product = window.WhopService?.getProduct(productId);
    if (!product) {
      console.warn('CartService: Product not found:', productId);
      return;
    }

    // Check if item already exists (same product + size + color)
    const existingIndex = this.items.findIndex(item =>
      item.productId === productId &&
      (item.size || null) === (options.size || null) &&
      (item.color || null) === (options.color || null)
    );

    if (existingIndex > -1) {
      this.items[existingIndex].quantity += quantity;
    } else {
      this.items.push({
        productId: product.id,
        name: product.name,
        price: product.price,
        image: product.image || null,
        type: product.type || 'merch',
        quantity: quantity,
        size: options.size || null,
        color: options.color || null,
        addedAt: Date.now()
      });
    }

    this.save();
    this.updateBadge();
    this.renderDrawer();
    this._animateBadge();
    this._notify('add', productId);
  },

  /* ---- REMOVE ITEM ---- */
  removeItem(productId, size = null, color = null) {
    this.items = this.items.filter(item =>
      !(item.productId === productId &&
        (item.size || null) === (size || null) &&
        (item.color || null) === (color || null))
    );

    this.save();
    this.updateBadge();
    this.renderDrawer();
    this._notify('remove', productId);
  },

  /* ---- UPDATE QUANTITY ---- */
  updateQuantity(productId, quantity, size = null, color = null) {
    const item = this.items.find(i =>
      i.productId === productId &&
      (i.size || null) === (size || null) &&
      (i.color || null) === (color || null)
    );

    if (!item) return;

    if (quantity <= 0) {
      this.removeItem(productId, size, color);
      return;
    }

    item.quantity = quantity;
    this.save();
    this.updateBadge();
    this.renderDrawer();
  },

  /* ---- GETTERS ---- */
  getItems() {
    return this.items;
  },

  getItemCount() {
    return this.items.reduce((sum, item) => sum + item.quantity, 0);
  },

  getSubtotal() {
    return this.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  },

  /* ---- CLEAR ---- */
  clear() {
    this.items = [];
    this.save();
    this.updateBadge();
    this.renderDrawer();
  },

  /* ---- PERSISTENCE ---- */
  save() {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.items));
    } catch (e) {
      console.warn('CartService: Could not save to localStorage:', e);
    }
  },

  load() {
    try {
      const data = localStorage.getItem(this.STORAGE_KEY);
      this.items = data ? JSON.parse(data) : [];
    } catch (e) {
      console.warn('CartService: Could not load from localStorage:', e);
      this.items = [];
    }
  },

  /* ---- BADGE ---- */
  updateBadge() {
    const badge = document.getElementById('cart-badge');
    if (!badge) return;

    const count = this.getItemCount();
    badge.textContent = count;
    badge.style.display = count > 0 ? 'flex' : 'none';
  },

  _animateBadge() {
    const badge = document.getElementById('cart-badge');
    if (!badge || typeof anime === 'undefined') return;

    anime({
      targets: badge,
      scale: [1, 1.4, 1],
      duration: 400,
      easing: 'easeOutBack'
    });
  },

  /* ---- DRAWER OPEN/CLOSE ---- */
  openDrawer() {
    const drawer = document.getElementById('cart-drawer');
    const overlay = document.getElementById('cart-overlay');
    if (drawer) drawer.classList.add('open');
    if (overlay) overlay.classList.add('open');
    document.body.style.overflow = 'hidden';
    this.renderDrawer();
  },

  closeDrawer() {
    const drawer = document.getElementById('cart-drawer');
    const overlay = document.getElementById('cart-overlay');
    if (drawer) drawer.classList.remove('open');
    if (overlay) overlay.classList.remove('open');
    document.body.style.overflow = '';
  },

  /* ---- I18N HELPERS ---- */
  _fp(amount) {
    return window.I18n ? window.I18n.formatPrice(amount) : '$' + amount.toFixed(2);
  },
  _tp(productId, field) {
    var key = 'product.' + productId + '.' + (field === 'description' ? 'desc' : field);
    if (window.I18n) { var val = window.I18n.t(key); if (val !== key) return val; }
    return null;
  },

  /* ---- RENDER DRAWER ---- */
  renderDrawer() {
    const itemsContainer = document.getElementById('cart-items');
    const emptyState = document.getElementById('cart-empty');
    const footer = document.getElementById('cart-footer');
    const upsell = document.getElementById('cart-upsell');
    const countEl = document.getElementById('cart-count');
    const totalEl = document.getElementById('cart-total-price');

    if (!itemsContainer) return;

    const count = this.getItemCount();
    const subtotal = this.getSubtotal();

    // Update count header
    if (countEl) countEl.textContent = count;

    // Empty vs filled state
    if (count === 0) {
      itemsContainer.innerHTML = '';
      if (emptyState) emptyState.style.display = 'flex';
      if (footer) footer.style.display = 'none';
      if (upsell) upsell.style.display = 'none';
      return;
    }

    if (emptyState) emptyState.style.display = 'none';
    if (footer) footer.style.display = 'block';

    // Render items
    itemsContainer.innerHTML = this.items.map(item => {
      const displayName = this._tp(item.productId, 'name') || item.name;
      const imageHtml = item.image
        ? `<img src="${item.image}" alt="${displayName}" class="cart-item-thumb">`
        : `<div class="cart-item-thumb cart-thumb-placeholder"><span>A</span></div>`;

      const detailParts = [];
      if (item.size) detailParts.push(`Size: ${item.size}`);
      if (item.color) detailParts.push(`Color: ${item.color}`);
      const detailHtml = detailParts.length > 0
        ? `<p class="cart-item-detail">${detailParts.join(' &bull; ')}</p>`
        : '';

      return `
        <div class="cart-item" data-product-id="${item.productId}" data-size="${item.size || ''}" data-color="${item.color || ''}">
          ${imageHtml}
          <div class="cart-item-info">
            <h4 class="cart-item-name">${displayName}</h4>
            ${detailHtml}
            <span class="cart-item-price">${this._fp(item.price * item.quantity)}</span>
          </div>
          <div class="cart-item-qty">
            <button class="qty-btn qty-minus" aria-label="Decrease quantity">-</button>
            <span class="qty-value">${item.quantity}</span>
            <button class="qty-btn qty-plus" aria-label="Increase quantity">+</button>
          </div>
          <button class="cart-item-remove" aria-label="Remove ${displayName}">&times;</button>
        </div>
      `;
    }).join('');

    // Update total
    if (totalEl) totalEl.textContent = this._fp(subtotal);

    // Bind quantity and remove handlers
    itemsContainer.querySelectorAll('.cart-item').forEach(el => {
      const pid = el.dataset.productId;
      const size = el.dataset.size || null;
      const color = el.dataset.color || null;

      el.querySelector('.qty-minus').addEventListener('click', () => {
        const item = this.items.find(i => i.productId === pid && (i.size || null) === size && (i.color || null) === color);
        if (item) this.updateQuantity(pid, item.quantity - 1, size, color);
      });

      el.querySelector('.qty-plus').addEventListener('click', () => {
        const item = this.items.find(i => i.productId === pid && (i.size || null) === size && (i.color || null) === color);
        if (item) this.updateQuantity(pid, item.quantity + 1, size, color);
      });

      el.querySelector('.cart-item-remove').addEventListener('click', () => {
        this.removeItem(pid, size, color);
      });
    });

    // Render upsell
    this._renderUpsell();
  },

  /* ---- UPSELL ---- */
  _renderUpsell() {
    const container = document.getElementById('cart-upsell-items');
    const wrapper = document.getElementById('cart-upsell');
    if (!container || !wrapper) return;

    const cartProductIds = this.items.map(i => i.productId);
    const allProducts = window.WhopService?.getProducts() || [];

    // Suggest products not in cart
    const suggestions = allProducts
      .filter(p => !cartProductIds.includes(p.id))
      .slice(0, 2);

    if (suggestions.length === 0) {
      wrapper.style.display = 'none';
      return;
    }

    wrapper.style.display = 'block';
    container.innerHTML = suggestions.map(p => {
      const uName = this._tp(p.id, 'name') || p.name;
      return `
      <div class="upsell-item" data-product-id="${p.id}">
        <div class="upsell-item-info">
          <span class="upsell-item-name">${uName}</span>
          <span class="upsell-item-price">${this._fp(p.price)}</span>
        </div>
        <button class="upsell-add-btn" data-product-id="${p.id}" aria-label="Add ${uName}">+ Add</button>
      </div>`;
    }).join('');

    container.querySelectorAll('.upsell-add-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.addItem(btn.dataset.productId, 1);
      });
    });
  },

  /* ---- LISTENERS ---- */
  onChange(callback) {
    this._listeners.push(callback);
  },

  _notify(action, productId) {
    this._listeners.forEach(cb => {
      try { cb(action, productId, this.items); } catch (e) { /* ignore */ }
    });
  }
};

// Export
window.CartService = CartService;
