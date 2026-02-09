/**
 * Basketball Play Data Models & Presets
 *
 * Data layer for plays, formations, and Firestore persistence.
 * Court coordinates: x = 0-50 (sideline to sideline), y = 0-47 (baseline to half-court)
 * Basket center: (25, 5.25)
 */

const PlayData = {

  // Court dimensions (feet)
  COURT: {
    WIDTH: 50,
    DEPTH: 47,    // half court
    BASKET_X: 25,
    BASKET_Y: 5.25,
    THREE_PT_RADIUS: 23.75,
    KEY_WIDTH: 16,
    KEY_DEPTH: 19,
    FT_LINE_Y: 19,
    FT_CIRCLE_RADIUS: 6
  },

  // Player position labels
  POSITIONS: {
    PG: 'PG',  // Point Guard
    SG: 'SG',  // Shooting Guard
    SF: 'SF',  // Small Forward
    PF: 'PF',  // Power Forward
    C: 'C'     // Center
  },

  // Movement types for animation styling
  MOVE_TYPES: {
    CUT: 'cut',           // Sharp movement without ball
    DRIBBLE: 'dribble',   // Movement with ball
    SCREEN: 'screen',     // Setting a screen (short move, hold)
    PASS: 'pass',         // Ball movement (edge between players)
    ROLL: 'roll',         // Roll after screen
    FADE: 'fade',         // Fade away from screen
    SPOT_UP: 'spot-up'    // Move to open spot
  },

  // ═══════════════════════════════════════════════════════════════
  // PRESET FORMATIONS
  // ═══════════════════════════════════════════════════════════════

  FORMATIONS: {
    'horns': {
      name: 'Horns',
      description: 'Two bigs at elbows, wings in corners, PG at top of key',
      offense: [
        { id: 'o1', label: 'PG', x: 25, y: 32 },
        { id: 'o2', label: 'SG', x: 5,  y: 8 },
        { id: 'o3', label: 'SF', x: 45, y: 8 },
        { id: 'o4', label: 'PF', x: 17, y: 20 },
        { id: 'o5', label: 'C',  x: 33, y: 20 }
      ]
    },
    '1-4-high': {
      name: '1-4 High',
      description: 'PG at top, four players spread across the free throw line extended',
      offense: [
        { id: 'o1', label: 'PG', x: 25, y: 35 },
        { id: 'o2', label: 'SG', x: 8,  y: 20 },
        { id: 'o3', label: 'SF', x: 42, y: 20 },
        { id: 'o4', label: 'PF', x: 17, y: 20 },
        { id: 'o5', label: 'C',  x: 33, y: 20 }
      ]
    },
    '1-3-1': {
      name: '1-3-1',
      description: 'PG up top, three across the free throw line, center on the block',
      offense: [
        { id: 'o1', label: 'PG', x: 25, y: 34 },
        { id: 'o2', label: 'SG', x: 10, y: 20 },
        { id: 'o3', label: 'SF', x: 40, y: 20 },
        { id: 'o4', label: 'PF', x: 25, y: 20 },
        { id: 'o5', label: 'C',  x: 25, y: 8 }
      ]
    },
    'spread': {
      name: 'Spread (5-Out)',
      description: 'All five players spread around the three-point line',
      offense: [
        { id: 'o1', label: 'PG', x: 25, y: 36 },
        { id: 'o2', label: 'SG', x: 6,  y: 24 },
        { id: 'o3', label: 'SF', x: 44, y: 24 },
        { id: 'o4', label: 'PF', x: 10, y: 10 },
        { id: 'o5', label: 'C',  x: 40, y: 10 }
      ]
    },
    'box': {
      name: 'Box Set',
      description: 'Four players in a box around the key, PG at top',
      offense: [
        { id: 'o1', label: 'PG', x: 25, y: 35 },
        { id: 'o2', label: 'SG', x: 17, y: 20 },
        { id: 'o3', label: 'SF', x: 33, y: 20 },
        { id: 'o4', label: 'PF', x: 17, y: 8 },
        { id: 'o5', label: 'C',  x: 33, y: 8 }
      ]
    }
  },

  // Default defense - man-to-man mirroring offense
  getManToManDefense(offense) {
    return offense.map((player, i) => ({
      id: `d${i + 1}`,
      label: `${i + 1}`,
      x: player.x + (player.x > 25 ? -2 : player.x < 25 ? 2 : 0),
      y: Math.max(3, player.y - 3)
    }));
  },

  // Zone defense formations
  DEFENSE_FORMATIONS: {
    '2-3-zone': {
      name: '2-3 Zone',
      defense: [
        { id: 'd1', label: '1', x: 18, y: 25 },
        { id: 'd2', label: '2', x: 32, y: 25 },
        { id: 'd3', label: '3', x: 10, y: 12 },
        { id: 'd4', label: '4', x: 25, y: 8 },
        { id: 'd5', label: '5', x: 40, y: 12 }
      ]
    },
    '3-2-zone': {
      name: '3-2 Zone',
      defense: [
        { id: 'd1', label: '1', x: 25, y: 28 },
        { id: 'd2', label: '2', x: 12, y: 22 },
        { id: 'd3', label: '3', x: 38, y: 22 },
        { id: 'd4', label: '4', x: 17, y: 10 },
        { id: 'd5', label: '5', x: 33, y: 10 }
      ]
    },
    '1-3-1-zone': {
      name: '1-3-1 Zone',
      defense: [
        { id: 'd1', label: '1', x: 25, y: 30 },
        { id: 'd2', label: '2', x: 12, y: 19 },
        { id: 'd3', label: '3', x: 25, y: 19 },
        { id: 'd4', label: '4', x: 38, y: 19 },
        { id: 'd5', label: '5', x: 25, y: 6 }
      ]
    }
  },

  // ═══════════════════════════════════════════════════════════════
  // PRESET PLAYS
  // ═══════════════════════════════════════════════════════════════

  PRESET_PLAYS: {
    'pick-and-roll': {
      name: 'Pick and Roll',
      description: 'Classic PnR: PG uses screen from C, C rolls to basket',
      tags: ['halfcourt', 'ball-screen', 'two-man-game'],
      formation: 'horns',
      steps: [
        {
          duration: 1200,
          description: 'C comes up to set ball screen',
          movements: [
            { playerId: 'o5', toX: 27, toY: 30, type: 'screen' }
          ],
          ball: { holder: 'o1' }
        },
        {
          duration: 1500,
          description: 'PG drives right off screen, SG spots up',
          movements: [
            { playerId: 'o1', toX: 35, toY: 24, type: 'dribble' },
            { playerId: 'o2', toX: 5, toY: 14, type: 'spot-up' }
          ],
          ball: { holder: 'o1' }
        },
        {
          duration: 1200,
          description: 'C rolls to basket',
          movements: [
            { playerId: 'o5', toX: 28, toY: 10, type: 'roll' }
          ],
          ball: { holder: 'o1' }
        },
        {
          duration: 800,
          description: 'PG passes to rolling C or kicks to corner',
          movements: [],
          ball: { holder: 'o5', passFrom: 'o1' }
        }
      ]
    },
    'give-and-go': {
      name: 'Give and Go',
      description: 'PG passes to wing, cuts to basket for return pass',
      tags: ['halfcourt', 'cutting', 'two-man-game'],
      formation: '1-4-high',
      steps: [
        {
          duration: 1000,
          description: 'PG passes to SG on the wing',
          movements: [],
          ball: { holder: 'o2', passFrom: 'o1' }
        },
        {
          duration: 1400,
          description: 'PG cuts hard to the basket',
          movements: [
            { playerId: 'o1', toX: 20, toY: 8, type: 'cut' }
          ],
          ball: { holder: 'o2' }
        },
        {
          duration: 800,
          description: 'SG passes back to PG for layup',
          movements: [],
          ball: { holder: 'o1', passFrom: 'o2' }
        }
      ]
    },
    'backdoor-cut': {
      name: 'Backdoor Cut',
      description: 'Wing fakes up, cuts behind defender to basket for easy score',
      tags: ['halfcourt', 'cutting', 'read-defense'],
      formation: 'spread',
      steps: [
        {
          duration: 800,
          description: 'SF fakes toward the ball',
          movements: [
            { playerId: 'o3', toX: 42, toY: 28, type: 'cut' }
          ],
          ball: { holder: 'o1' }
        },
        {
          duration: 1200,
          description: 'SF reverses and cuts backdoor to basket',
          movements: [
            { playerId: 'o3', toX: 30, toY: 6, type: 'cut' }
          ],
          ball: { holder: 'o1' }
        },
        {
          duration: 600,
          description: 'PG delivers bounce pass for layup',
          movements: [],
          ball: { holder: 'o3', passFrom: 'o1' }
        }
      ]
    },
    'motion-weak': {
      name: 'Motion Weak Side',
      description: 'Ball reversal with weak side action - screen and cut',
      tags: ['halfcourt', 'motion', 'ball-movement'],
      formation: 'horns',
      steps: [
        {
          duration: 1000,
          description: 'PG passes to PF at elbow',
          movements: [],
          ball: { holder: 'o4', passFrom: 'o1' }
        },
        {
          duration: 1200,
          description: 'PG cuts through, C screens for SF',
          movements: [
            { playerId: 'o1', toX: 40, toY: 14, type: 'cut' },
            { playerId: 'o5', toX: 38, toY: 12, type: 'screen' }
          ],
          ball: { holder: 'o4' }
        },
        {
          duration: 1000,
          description: 'SF curls off screen, PF passes',
          movements: [
            { playerId: 'o3', toX: 32, toY: 10, type: 'cut' }
          ],
          ball: { holder: 'o3', passFrom: 'o4' }
        },
        {
          duration: 800,
          description: 'SF attacks basket or kicks out',
          movements: [
            { playerId: 'o3', toX: 28, toY: 6, type: 'dribble' }
          ],
          ball: { holder: 'o3' }
        }
      ]
    }
  },

  // ═══════════════════════════════════════════════════════════════
  // PLAY CRUD
  // ═══════════════════════════════════════════════════════════════

  /**
   * Create a new empty play from a formation
   */
  createPlay(name, formationId) {
    const formation = this.FORMATIONS[formationId] || this.FORMATIONS['horns'];
    const defense = this.getManToManDefense(formation.offense);

    return {
      id: null, // set on save
      name: name || 'New Play',
      description: '',
      tags: [],
      formation: {
        offense: JSON.parse(JSON.stringify(formation.offense)),
        defense: JSON.parse(JSON.stringify(defense)),
        ball: { holder: 'o1' }
      },
      steps: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  },

  /**
   * Load a preset play with full formation data
   */
  loadPreset(presetId) {
    const preset = this.PRESET_PLAYS[presetId];
    if (!preset) return null;

    const formation = this.FORMATIONS[preset.formation] || this.FORMATIONS['horns'];
    const defense = this.getManToManDefense(formation.offense);

    return {
      id: presetId,
      name: preset.name,
      description: preset.description,
      tags: preset.tags || [],
      formation: {
        offense: JSON.parse(JSON.stringify(formation.offense)),
        defense: JSON.parse(JSON.stringify(defense)),
        ball: preset.steps.length > 0 ? preset.steps[0].ball : { holder: 'o1' }
      },
      steps: JSON.parse(JSON.stringify(preset.steps)),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  },

  /**
   * Save play to Firestore
   */
  async savePlay(play) {
    const user = window.AuthService?.getUser();
    const db = window.FirebaseApp?.getDb();
    if (!user || !db) return null;

    const data = {
      ...play,
      courseId: 'city-high-basketball',
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    try {
      if (play.id && !this.PRESET_PLAYS[play.id]) {
        // Update existing
        await db.collection('users').doc(user.uid)
          .collection('basketballPlays').doc(play.id).set(data, { merge: true });
        return play.id;
      } else {
        // Create new
        data.createdAt = firebase.firestore.FieldValue.serverTimestamp();
        const ref = await db.collection('users').doc(user.uid)
          .collection('basketballPlays').add(data);
        return ref.id;
      }
    } catch (error) {
      console.error('Error saving play:', error);
      return null;
    }
  },

  /**
   * Load all user plays from Firestore
   */
  async loadPlays() {
    const user = window.AuthService?.getUser();
    const db = window.FirebaseApp?.getDb();
    if (!user || !db) return [];

    try {
      const snapshot = await db.collection('users').doc(user.uid)
        .collection('basketballPlays')
        .orderBy('updatedAt', 'desc')
        .get();

      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error loading plays:', error);
      return [];
    }
  },

  /**
   * Delete a play from Firestore
   */
  async deletePlay(playId) {
    const user = window.AuthService?.getUser();
    const db = window.FirebaseApp?.getDb();
    if (!user || !db) return false;

    try {
      await db.collection('users').doc(user.uid)
        .collection('basketballPlays').doc(playId).delete();
      return true;
    } catch (error) {
      console.error('Error deleting play:', error);
      return false;
    }
  },

  /**
   * Export play as JSON string
   */
  exportPlay(play) {
    return JSON.stringify(play, null, 2);
  },

  /**
   * Import play from JSON string
   */
  importPlay(jsonStr) {
    try {
      const play = JSON.parse(jsonStr);
      if (!play.formation || !play.name) {
        throw new Error('Invalid play format');
      }
      play.id = null;
      play.updatedAt = new Date().toISOString();
      return play;
    } catch (error) {
      console.error('Error importing play:', error);
      return null;
    }
  }
};

window.PlayData = PlayData;
