/**
 * Authentication Service for AutoNateAI Learning Hub
 * Handles user registration, login, logout, and session management
 */

const AuthService = {
  // State
  currentUser: null,
  authStateListeners: [],
  redirectAfterLogin: null,
  _authReadyPromise: null,
  _authReadyResolve: null,

  /**
   * Initialize auth service and set up auth state listener
   */
  init() {
    const auth = window.FirebaseApp.getAuth();
    if (!auth) {
      console.error('Firebase Auth not initialized');
      return;
    }

    // Create a promise that resolves when auth is truly ready
    this._authReadyPromise = new Promise((resolve) => {
      this._authReadyResolve = resolve;
    });

    // Listen for auth state changes
    // Firebase fires this immediately with null, then again with user if session exists
    let firstCall = true;
    auth.onAuthStateChanged((user) => {
      this.currentUser = user;
      
      if (user) {
        console.log('👤 User signed in:', user.email);
        this.updateUserProfile(user);
        // User is definitely signed in, resolve immediately
        if (this._authReadyResolve) {
          this._authReadyResolve(user);
          this._authReadyResolve = null;
        }
      } else {
        console.log('👤 User signed out');
        // On first call with null, wait a moment for session restoration
        if (firstCall) {
          firstCall = false;
          // Give Firebase time to restore session from storage
          setTimeout(() => {
            if (this._authReadyResolve) {
              this._authReadyResolve(this.currentUser);
              this._authReadyResolve = null;
            }
          }, 300);
        } else {
          // Subsequent calls mean user actually signed out
          if (this._authReadyResolve) {
            this._authReadyResolve(null);
            this._authReadyResolve = null;
          }
        }
      }
      
      this.notifyListeners(user);
    });
  },

  /**
   * Wait for auth state to be resolved
   * Returns a promise that resolves with the user (or null)
   */
  waitForAuthState() {
    if (!this._authReadyPromise) {
      // If init wasn't called yet, return null
      return Promise.resolve(null);
    }
    return this._authReadyPromise;
  },

  /**
   * Register a new user with email and password
   */
  async register(email, password, displayName = null) {
    const auth = window.FirebaseApp.getAuth();
    
    try {
      const userCredential = await auth.createUserWithEmailAndPassword(email, password);
      const user = userCredential.user;
      
      // Update display name if provided
      if (displayName) {
        await user.updateProfile({ displayName });
      }
      
      // Create user document in Firestore
      await this.createUserDocument(user, { displayName });
      
      return { success: true, user };
    } catch (error) {
      console.error('Registration error:', error);
      return { success: false, error: this.getErrorMessage(error.code) };
    }
  },

  /**
   * Sign in with email and password
   */
  async loginWithEmail(email, password) {
    const auth = window.FirebaseApp.getAuth();
    
    try {
      const userCredential = await auth.signInWithEmailAndPassword(email, password);
      return { success: true, user: userCredential.user };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: this.getErrorMessage(error.code) };
    }
  },

  /**
   * Sign in with Google
   */
  async loginWithGoogle() {
    const auth = window.FirebaseApp.getAuth();
    const provider = new firebase.auth.GoogleAuthProvider();
    
    try {
      const result = await auth.signInWithPopup(provider);
      const user = result.user;
      
      // Check if this is a new user
      if (result.additionalUserInfo?.isNewUser) {
        await this.createUserDocument(user);
      }
      
      return { success: true, user };
    } catch (error) {
      console.error('Google login error:', error);
      return { success: false, error: this.getErrorMessage(error.code) };
    }
  },

  /**
   * Sign out the current user
   */
  async logout() {
    const auth = window.FirebaseApp.getAuth();
    
    try {
      await auth.signOut();
      return { success: true };
    } catch (error) {
      console.error('Logout error:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Send password reset email
   */
  async resetPassword(email) {
    const auth = window.FirebaseApp.getAuth();
    
    try {
      await auth.sendPasswordResetEmail(email);
      return { success: true };
    } catch (error) {
      console.error('Password reset error:', error);
      return { success: false, error: this.getErrorMessage(error.code) };
    }
  },

  /**
   * Create user document in Firestore
   */
  async createUserDocument(user, additionalData = {}) {
    const db = window.FirebaseApp.getDb();
    if (!db) return;

    const userRef = db.collection('users').doc(user.uid);
    const prefsRef = db.collection('users').doc(user.uid)
      .collection('notificationPrefs').doc('default');
    
    const userData = {
      uid: user.uid,
      email: user.email,
      displayName: additionalData.displayName || user.displayName || user.email.split('@')[0],
      photoURL: user.photoURL || null,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      lastLoginAt: firebase.firestore.FieldValue.serverTimestamp(),
      courses: {},
      progress: {},
      settings: {
        emailNotifications: true,
        theme: 'dark'
      }
    };

    try {
      await userRef.set(userData, { merge: true });
      await prefsRef.set({
        inApp: true,
        email: false,
        push: false,
        frequency: 'daily',
        topics: {
          progress: true,
          streaks: true,
          admin: true
        },
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
      console.log('User document created/updated');
    } catch (error) {
      console.error('Error creating user document:', error);
    }
  },

  /**
   * Update user profile on login
   */
  async updateUserProfile(user) {
    const db = window.FirebaseApp.getDb();
    if (!db) return;

    const userRef = db.collection('users').doc(user.uid);
    
    try {
      await userRef.update({
        lastLoginAt: firebase.firestore.FieldValue.serverTimestamp()
      });
    } catch (error) {
      // Document might not exist yet
      if (error.code === 'not-found') {
        await this.createUserDocument(user);
      }
    }
  },

  /**
   * Get user-friendly error messages
   */
  getErrorMessage(errorCode) {
    const errorMessages = {
      'auth/email-already-in-use': 'This email is already registered. Try logging in instead.',
      'auth/invalid-email': 'Please enter a valid email address.',
      'auth/operation-not-allowed': 'Email/password accounts are not enabled.',
      'auth/weak-password': 'Password should be at least 6 characters.',
      'auth/user-disabled': 'This account has been disabled.',
      'auth/user-not-found': 'No account found with this email.',
      'auth/wrong-password': 'Incorrect password. Please try again.',
      'auth/too-many-requests': 'Too many failed attempts. Please try again later.',
      'auth/popup-closed-by-user': 'Sign-in popup was closed. Please try again.',
      'auth/cancelled-popup-request': 'Only one popup request allowed at a time.',
      'auth/network-request-failed': 'Network error. Please check your connection.'
    };
    
    return errorMessages[errorCode] || 'An error occurred. Please try again.';
  },

  /**
   * Add auth state listener
   */
  onAuthStateChanged(callback) {
    this.authStateListeners.push(callback);
    // Only call immediately if auth has been resolved
    if (this._authReadyPromise) {
      this._authReadyPromise.then(() => {
        // Only call if still subscribed
        if (this.authStateListeners.includes(callback)) {
          callback(this.currentUser);
        }
      });
    }
    return () => {
      this.authStateListeners = this.authStateListeners.filter(cb => cb !== callback);
    };
  },

  /**
   * Notify all listeners of auth state change
   */
  notifyListeners(user) {
    this.authStateListeners.forEach(callback => callback(user));
  },

  /**
   * Check if user is authenticated
   */
  isAuthenticated() {
    return this.currentUser !== null;
  },

  /**
   * Get current user
   */
  getUser() {
    return this.currentUser;
  },

  /**
   * Set redirect URL for after login
   */
  setRedirectUrl(url) {
    this.redirectAfterLogin = url;
    sessionStorage.setItem('redirectAfterLogin', url);
  },

  /**
   * Get and clear redirect URL
   */
  getRedirectUrl() {
    const url = this.redirectAfterLogin || sessionStorage.getItem('redirectAfterLogin');
    this.redirectAfterLogin = null;
    sessionStorage.removeItem('redirectAfterLogin');
    return url;
  }
};

// Export
window.AuthService = AuthService;

