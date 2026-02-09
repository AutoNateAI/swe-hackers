/**
 * Basketball Notes Manager
 *
 * Quick notes with play configuration snapshots.
 * Each note captures the current play state so you can replay it later.
 */

const NotesManager = {

  _notes: [],
  _container: null,
  _onLoadSnapshot: null,

  /**
   * Initialize notes manager
   * @param {string} containerId - DOM container for notes list
   * @param {Function} onLoadSnapshot - Callback when user loads a note's snapshot
   */
  init(containerId, onLoadSnapshot) {
    this._container = document.getElementById(containerId);
    this._onLoadSnapshot = onLoadSnapshot;
    this._loadNotes();
  },

  /**
   * Create a note with current play snapshot
   * @param {string} text - Note text
   * @param {object} playSnapshot - Current play configuration
   */
  async createNote(text, playSnapshot) {
    const note = {
      id: null,
      text: text,
      playSnapshot: playSnapshot ? JSON.parse(JSON.stringify(playSnapshot)) : null,
      createdAt: new Date().toISOString(),
      stepIndex: playSnapshot?._currentStep || 0
    };

    // Save to Firestore
    const user = window.AuthService?.getUser();
    const db = window.FirebaseApp?.getDb();

    if (user && db) {
      try {
        const ref = await db.collection('users').doc(user.uid)
          .collection('basketballNotes').add({
            ...note,
            courseId: 'city-high-basketball',
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
          });
        note.id = ref.id;
      } catch (error) {
        console.error('Error saving note:', error);
        note.id = 'local-' + Date.now();
      }
    } else {
      note.id = 'local-' + Date.now();
    }

    this._notes.unshift(note);
    this._render();
    return note;
  },

  /**
   * Delete a note
   */
  async deleteNote(noteId) {
    const user = window.AuthService?.getUser();
    const db = window.FirebaseApp?.getDb();

    if (user && db && !noteId.startsWith('local-')) {
      try {
        await db.collection('users').doc(user.uid)
          .collection('basketballNotes').doc(noteId).delete();
      } catch (error) {
        console.error('Error deleting note:', error);
      }
    }

    this._notes = this._notes.filter(n => n.id !== noteId);
    this._render();
  },

  /**
   * Load notes from Firestore
   */
  async _loadNotes() {
    const user = window.AuthService?.getUser();
    const db = window.FirebaseApp?.getDb();

    if (user && db) {
      try {
        const snapshot = await db.collection('users').doc(user.uid)
          .collection('basketballNotes')
          .where('courseId', '==', 'city-high-basketball')
          .orderBy('createdAt', 'desc')
          .limit(50)
          .get();

        this._notes = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
      } catch (error) {
        console.error('Error loading notes:', error);
        this._notes = [];
      }
    }

    this._render();
  },

  /**
   * Get all notes
   */
  getNotes() {
    return [...this._notes];
  },

  /**
   * Render notes list
   */
  _render() {
    if (!this._container) return;

    if (this._notes.length === 0) {
      this._container.innerHTML = `
        <div class="notes-empty">
          <p>No notes yet</p>
          <p class="notes-empty-hint">Add notes during play review to save snapshots</p>
        </div>
      `;
      return;
    }

    this._container.innerHTML = this._notes.map(note => `
      <div class="note-item" data-id="${note.id}">
        <div class="note-content">
          <div class="note-text">${this._escapeHtml(note.text)}</div>
          <div class="note-meta">
            ${this._formatTime(note.createdAt)}
            ${note.playSnapshot ? `<span class="note-has-snapshot">has snapshot</span>` : ''}
          </div>
        </div>
        <div class="note-actions">
          ${note.playSnapshot ? `<button class="note-load-btn" data-id="${note.id}" title="Load snapshot">&#9654;</button>` : ''}
          <button class="note-delete-btn" data-id="${note.id}" title="Delete">&times;</button>
        </div>
      </div>
    `).join('');

    // Attach event listeners
    this._container.querySelectorAll('.note-load-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const note = this._notes.find(n => n.id === btn.dataset.id);
        if (note?.playSnapshot && this._onLoadSnapshot) {
          this._onLoadSnapshot(note.playSnapshot, note.stepIndex);
        }
      });
    });

    this._container.querySelectorAll('.note-delete-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.deleteNote(btn.dataset.id);
      });
    });
  },

  _escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  },

  _formatTime(dateStr) {
    if (!dateStr) return '';
    try {
      const date = typeof dateStr === 'string' ? new Date(dateStr) :
                   dateStr._seconds ? new Date(dateStr._seconds * 1000) : new Date(dateStr);
      const now = new Date();
      const diff = now - date;

      if (diff < 60000) return 'just now';
      if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
      if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch {
      return '';
    }
  }
};

window.NotesManager = NotesManager;
