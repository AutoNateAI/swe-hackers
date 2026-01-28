/**
 * Notification Service for AutoNateAI
 * In-app inbox + optional email/push preferences.
 */

const NotificationService = {
  state: {
    user: null,
    prefs: null,
    notifications: [],
    filter: 'all',
    unsubscribe: null
  },

  async init() {
    const user = await window.AuthService.waitForAuthState();
    if (!user) return;

    this.state.user = user;
    await this.ensurePrefs();
    this.bindUI();
    this.subscribeToNotifications();

    if (this.state.prefs?.push) {
      await this.registerPushToken();
    }
  },

  async ensurePrefs() {
    const existing = await window.DataService.getNotificationPrefs();
    if (existing) {
      this.state.prefs = existing;
      return;
    }

    const defaults = {
      inApp: true,
      email: false,
      push: false,
      frequency: 'daily',
      autoRemoveRead: true,
      topics: {
        progress: true,
        streaks: true,
        admin: true
      }
    };

    await window.DataService.updateNotificationPrefs(defaults);
    this.state.prefs = defaults;
  },

  bindUI() {
    this.button = document.getElementById('notification-btn');
    this.panel = document.getElementById('notification-panel');
    this.list = document.getElementById('notification-list');
    this.count = document.getElementById('notification-count');
    this.dot = document.getElementById('notification-dot');
    this.markAllBtn = document.getElementById('notification-mark-all');
    this.filterBtns = document.querySelectorAll('[data-notification-filter]');

    this.prefEmail = document.getElementById('pref-email');
    this.prefPush = document.getElementById('pref-push');
    this.prefFrequency = document.getElementById('pref-frequency');
    this.prefRemoveRead = document.getElementById('pref-remove-read');

    if (!this.button || !this.panel || !this.list) return;

    this.button.addEventListener('click', (e) => {
      e.stopPropagation();
      this.togglePanel();
    });

    document.addEventListener('click', (e) => {
      if (!this.panel.contains(e.target) && !this.button.contains(e.target)) {
        this.closePanel();
      }
    });

    if (this.markAllBtn) {
      this.markAllBtn.addEventListener('click', async () => {
        await window.DataService.markAllNotificationsRead();
        if (this.state.prefs?.autoRemoveRead) {
          await window.DataService.deleteReadNotifications();
        }
      });
    }

    this.filterBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        this.filterBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.state.filter = btn.dataset.notificationFilter;
        this.renderList();
      });
    });

    if (this.prefEmail) {
      this.prefEmail.checked = !!this.state.prefs?.email;
      this.prefEmail.addEventListener('change', () => this.updatePrefs());
    }

    if (this.prefRemoveRead) {
      this.prefRemoveRead.checked = this.state.prefs?.autoRemoveRead !== false;
      this.prefRemoveRead.addEventListener('change', () => this.updatePrefs());
    }

    if (this.prefPush) {
      this.prefPush.checked = !!this.state.prefs?.push;
      this.prefPush.addEventListener('change', async () => {
        if (this.prefPush.checked) {
          const allowed = await this.requestPushPermission();
          if (!allowed) {
            this.prefPush.checked = false;
          }
        }
        await this.updatePrefs();
      });
    }

    if (this.prefFrequency) {
      this.prefFrequency.value = this.state.prefs?.frequency || 'daily';
      this.prefFrequency.addEventListener('change', () => this.updatePrefs());
    }
  },

  async updatePrefs() {
    const prefs = {
      inApp: true,
      email: !!this.prefEmail?.checked,
      push: !!this.prefPush?.checked,
      frequency: this.prefFrequency?.value || 'daily',
      autoRemoveRead: this.prefRemoveRead?.checked ?? this.state.prefs?.autoRemoveRead ?? true,
      topics: this.state.prefs?.topics || { progress: true, streaks: true, admin: true }
    };

    await window.DataService.updateNotificationPrefs(prefs);
    this.state.prefs = prefs;

    if (prefs.push) {
      await this.registerPushToken();
    }
  },

  async requestPushPermission() {
    if (!('Notification' in window)) {
      console.warn('Push notifications not supported in this browser.');
      return false;
    }

    if (Notification.permission === 'granted') return true;

    const result = await Notification.requestPermission();
    return result === 'granted';
  },

  async registerPushToken() {
    const messaging = window.FirebaseApp.getMessaging?.();
    if (!messaging || !navigator.serviceWorker) {
      console.warn('Messaging not available for push registration.');
      return;
    }

    const vapidKey = window.FirebaseApp.getVapidKey?.();
    if (!vapidKey) {
      console.warn('Missing VAPID key; push registration skipped.');
      return;
    }

    try {
      const registration = await navigator.serviceWorker.register('../firebase-messaging-sw.js');
      const token = await messaging.getToken({ vapidKey, serviceWorkerRegistration: registration });
      if (token) {
        await window.DataService.saveNotificationToken(token, 'web');
      }
    } catch (error) {
      console.error('Error registering push token:', error);
    }
  },

  subscribeToNotifications() {
    const db = window.FirebaseApp.getDb();
    if (!db || !this.state.user) return;

    const ref = db.collection('users')
      .doc(this.state.user.uid)
      .collection('notifications')
      .orderBy('createdAt', 'desc')
      .limit(50);

    if (this.state.unsubscribe) {
      this.state.unsubscribe();
    }

    this.state.unsubscribe = ref.onSnapshot(snapshot => {
      this.state.notifications = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      this.renderList();
      this.updateBadge();
    });
  },

  renderList() {
    if (!this.list) return;
    this.list.innerHTML = '';

    const filtered = this.state.filter === 'unread'
      ? this.state.notifications.filter(n => !n.read)
      : this.state.notifications;

    if (filtered.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'notification-empty';
      empty.textContent = 'No notifications yet.';
      this.list.appendChild(empty);
      return;
    }

    filtered.forEach(notification => {
      const item = document.createElement('button');
      item.className = `notification-item${notification.read ? '' : ' unread'}`;
      item.type = 'button';

      const time = this.formatTimeAgo(notification.createdAt);
      item.innerHTML = `
        <span class="notification-indicator" aria-hidden="true"></span>
        <div class="notification-content">
          <div class="notification-title">${this.escape(notification.title)}</div>
          <div class="notification-body">${this.escape(notification.body)}</div>
        </div>
        <div class="notification-actions">
          <div class="notification-meta">${time}</div>
          <button class="notification-delete" type="button" aria-label="Delete notification">×</button>
        </div>
      `;

      const deleteBtn = item.querySelector('.notification-delete');
      if (deleteBtn) {
        deleteBtn.addEventListener('click', async (event) => {
          event.stopPropagation();
          await window.DataService.deleteNotification(notification.id);
        });
      }

      item.addEventListener('click', async () => {
        if (!notification.read) {
          await window.DataService.markNotificationRead(notification.id);
        }
        if (this.state.prefs?.autoRemoveRead) {
          await window.DataService.deleteNotification(notification.id);
        }
        if (notification.link) {
          window.location.href = notification.link;
        }
      });

      this.list.appendChild(item);
    });
  },

  updateBadge() {
    const unread = this.state.notifications.filter(n => !n.read).length;
    if (this.count) {
      this.count.textContent = unread > 99 ? '99+' : String(unread);
      this.count.style.display = unread > 0 ? 'flex' : 'none';
    }
    if (this.dot) {
      this.dot.style.display = unread > 0 ? 'block' : 'none';
    }
  },

  togglePanel() {
    if (this.panel.classList.contains('open')) {
      this.closePanel();
    } else {
      this.panel.classList.add('open');
      this.panel.setAttribute('aria-hidden', 'false');
    }
  },

  closePanel() {
    this.panel.classList.remove('open');
    this.panel.setAttribute('aria-hidden', 'true');
  },

  notifyLessonComplete({ courseId, lessonId, lessonName, link }) {
    return this.createNotification({
      type: 'lesson_complete',
      title: 'Lesson complete',
      body: `${lessonName} is now complete.`,
      source: 'progress',
      relatedId: lessonId,
      link
    });
  },

  notifyQuizMastery({ activityId, score, link }) {
    return this.createNotification({
      type: 'quiz_mastery',
      title: 'Quiz mastery',
      body: `Perfect first try on ${activityId}.`,
      source: 'activity',
      relatedId: activityId,
      metadata: { score },
      link
    });
  },

  notifyStreak({ currentStreak }) {
    return this.createNotification({
      type: 'streak',
      title: 'Streak milestone',
      body: `You reached a ${currentStreak}-day streak.`,
      source: 'progress',
      relatedId: String(currentStreak)
    });
  },

  async createNotification(payload) {
    return window.DataService.createNotification(payload);
  },

  formatTimeAgo(timestamp) {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const diff = Date.now() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  },

  escape(value) {
    if (!value) return '';
    return String(value).replace(/[&<>"']/g, (char) => {
      const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
      return map[char] || char;
    });
  }
};

window.NotificationService = NotificationService;
