# Leaderboard Tab Design Model

## Overview
The Leaderboard tab creates a competitive and motivating environment by displaying user rankings based on points, streaks, and achievements. It encourages engagement through friendly competition and recognition of top learners.

---

## Page Layout

```
┌────────────────────────────────────────────────────────────────────────┐
│ SIDEBAR (existing)                    │ MAIN CONTENT                   │
│                                       │                                │
│ [Logo]                                │ ┌──────────────────────────────┤
│                                       │ │ HEADER: "Leaderboard" 🏅     │
│ Main                                  │ └──────────────────────────────┤
│  • Dashboard                          │                                │
│  • Course Library                     │ ┌──────────────────────────────┤
│  • Daily Challenges                   │ │ YOUR RANK CARD               │
│                                       │ │ [#12] [Avatar] You have 2450 │
│ Learning                              │ │ points • Rising Star rank    │
│  • My Progress                        │ └──────────────────────────────┤
│  • Achievements                       │                                │
│  • Notes                              │ ┌──────────────────────────────┤
│                                       │ │ TOP 3 PODIUM                 │
│ Community                             │ │    🥇          🥈       🥉   │
│  • Discord                            │ │   [1st]      [2nd]    [3rd]  │
│  • Leaderboard (ACTIVE)               │ └──────────────────────────────┤
│                                       │                                │
│ Account                               │ ┌──────────────────────────────┤
│  • Profile                            │ │ FILTER TABS                  │
│  • Settings                           │ │ [All Time] [This Week]       │
│  • Sign Out                           │ │ [This Month] [By Course]     │
│                                       │ └──────────────────────────────┤
│ [User Card]                           │                                │
│                                       │ ┌──────────────────────────────┤
│                                       │ │ LEADERBOARD TABLE            │
│                                       │ │ #4  [Avatar] User4   2100pts │
│                                       │ │ #5  [Avatar] User5   1950pts │
│                                       │ │ #6  [Avatar] User6   1800pts │
│                                       │ │ ...                          │
│                                       │ └──────────────────────────────┤
└───────────────────────────────────────┴────────────────────────────────┘
```

---

## Component Designs

### 1. Your Rank Card
Highlights the current user's position on the leaderboard.

```
┌─────────────────────────────────────────────────────────────────────────┐
│  YOUR RANKING                                                           │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │  #12        [👤 Avatar]    You                                    │  │
│  │  ▲ 3                       2,450 points • Rising Star             │  │
│  │                            🔥 7 day streak                        │  │
│  │                                                                   │  │
│  │  [███████████████░░░░░░░] 245 pts to reach #11                    │  │
│  └───────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
```

**Features:**
- Current rank with change indicator (▲ up, ▼ down, — same)
- User avatar and name
- Total points and rank title
- Current streak
- Progress bar to next rank position

**CSS Pattern:**
- Background: `var(--bg-card)` with accent border
- Highlighted with subtle glow
- Border radius: `var(--radius-lg)`

---

### 2. Top 3 Podium
Showcases the top 3 learners in a visually prominent podium layout.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              🥇                                         │
│                           [Avatar]                                      │
│                           User1                                         │
│                          5,240 pts                                      │
│                                                                         │
│           🥈                                      🥉                    │
│        [Avatar]                                [Avatar]                 │
│         User2                                   User3                   │
│        4,180 pts                               3,920 pts                │
│                                                                         │
│     ┌─────────┐     ┌─────────────┐     ┌─────────┐                    │
│     │   2nd   │     │     1st     │     │   3rd   │                    │
│     └─────────┘     └─────────────┘     └─────────┘                    │
└─────────────────────────────────────────────────────────────────────────┘
```

**Features:**
- First place elevated in center
- Second and third on sides
- Large avatars
- Medal icons (🥇🥈🥉)
- Points display

**CSS Pattern:**
- Podium blocks with gradients
- Gold: `linear-gradient(180deg, #ffd54f, #ffb300)`
- Silver: `linear-gradient(180deg, #e0e0e0, #9e9e9e)`
- Bronze: `linear-gradient(180deg, #ffab91, #d84315)`

---

### 3. Filter Tabs
Time period and category filters.

```
┌──────────────────────────────────────────────────────────────────────────┐
│  [All Time ✓]  [This Week]  [This Month]  |  [By Points]  [By Streak]   │
└──────────────────────────────────────────────────────────────────────────┘
```

**Filters:**
- **Time:** All Time, This Week, This Month
- **Metric:** By Points, By Streak, By Achievements

---

### 4. Leaderboard Table
Main ranking list starting from position #4.

```
┌─────────────────────────────────────────────────────────────────────────┐
│  RANK    USER                           POINTS    STREAK    ACHIEVEMENTS│
├─────────────────────────────────────────────────────────────────────────┤
│   4      [👤] Alice Johnson             2,100     🔥 12     🏆 15       │
│          ▲ 2  Rising Star                                              │
├─────────────────────────────────────────────────────────────────────────┤
│   5      [👤] Bob Smith                 1,950     🔥 5      🏆 12       │
│          — 0  Student                                                   │
├─────────────────────────────────────────────────────────────────────────┤
│   6      [👤] Carol Davis               1,800     🔥 8      🏆 11       │
│          ▼ 1  Student                                                   │
├─────────────────────────────────────────────────────────────────────────┤
│  ...                                                                    │
└─────────────────────────────────────────────────────────────────────────┘
```

**Row Features:**
- Rank number with change indicator
- User avatar
- Display name
- Rank title
- Points
- Streak count
- Achievement count
- Hover highlight
- Current user row highlighted differently

---

### 5. Empty/Loading States

**Loading:**
```
┌─────────────────────────────────────────────────────────────────────────┐
│                              ⏳                                         │
│                    Loading leaderboard...                               │
└─────────────────────────────────────────────────────────────────────────┘
```

**No Data (new platform):**
```
┌─────────────────────────────────────────────────────────────────────────┐
│                              🏅                                         │
│                    Be the first to climb!                               │
│           Start learning to appear on the leaderboard                   │
│                      [Start Learning →]                                 │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Ranking System

### Rank Titles (from achievements page)
| Points Range | Title | Icon |
|--------------|-------|------|
| 0 - 99 | Newcomer | 🌱 |
| 100 - 299 | Learner | 📖 |
| 300 - 749 | Student | 🎓 |
| 750 - 1499 | Rising Star | ⭐ |
| 1500 - 2999 | Scholar | 🏛️ |
| 3000 - 4999 | Expert | 💎 |
| 5000 - 9999 | Master | 👑 |
| 10000+ | Legend | 🏆 |

### Points Sources
- Completing lessons
- Maintaining streaks
- Unlocking achievements
- Daily challenges

---

## Color Scheme

| Element | Color Variable |
|---------|---------------|
| Gold (1st) | `#ffd54f` / `var(--accent-warning)` |
| Silver (2nd) | `#e0e0e0` |
| Bronze (3rd) | `#ffab91` |
| Rank up indicator | `var(--accent-success)` (#66bb6a) |
| Rank down indicator | `var(--accent-error)` (#ef5350) |
| Current user highlight | `rgba(121, 134, 203, 0.15)` |
| Table row hover | `rgba(255, 255, 255, 0.03)` |

---

## Responsive Design

### Desktop (>1024px)
- Full podium layout
- Table with all columns
- Your rank card full width

### Tablet (768px - 1024px)
- Podium slightly condensed
- Table hides achievement column
- Your rank card stacks vertically

### Mobile (<768px)
- Podium becomes horizontal scroll or stacked
- Table becomes card-based list
- Simplified stats per user
- Your rank card compact

---

## Firebase Data Structure

### Leaderboard Collection
```javascript
// Collection: leaderboard (public, read-only for users)
// Document: global
{
  rankings: [
    {
      rank: 1,
      userId: "uid123",
      displayName: "Alice Johnson",
      photoURL: "https://...",
      points: 5240,
      currentStreak: 14,
      achievementCount: 22,
      rankTitle: "Master",
      lastUpdated: Timestamp
    },
    // ... more users
  ],
  lastCalculated: Timestamp
}

// For time-based leaderboards
// Document: weekly / monthly
{
  startDate: Timestamp,
  endDate: Timestamp,
  rankings: [ ... ]
}
```

### User Stats (already exists)
```javascript
// users/{userId}/stats/current
{
  totalPoints: 2450,
  currentStreak: 7,
  longestStreak: 14,
  lessonsCompleted: 25,
  achievementsUnlocked: 15
}
```

### Privacy Considerations
- Only display name and avatar (public info)
- No email addresses on leaderboard
- Users can opt-out in settings (future feature)

---

## Animations

1. **Podium Entrance** - Staggered rise animation for top 3
2. **Rank Change** - Pulse/glow when user's rank changes
3. **Row Hover** - Subtle background transition
4. **Counter Animation** - Points animate up on load
5. **Progress Bar** - Smooth fill animation

---

## User Experience Flow

1. User navigates to Leaderboard tab
2. "Your Rank" card shows their current position immediately
3. Top 3 podium displays prominently
4. Full rankings table loads below
5. User can filter by time period or metric
6. Clicking another user could show mini-profile (future)
7. Rankings update periodically (cloud function)

---

## Implementation Notes

### Data Fetching Strategy
- **Option A:** Real-time calculation on page load (slower, but always fresh)
- **Option B:** Pre-calculated leaderboard updated via Cloud Function (faster, scheduled updates)

For MVP, use Option A with client-side calculation. Migrate to Option B as user base grows.

### Client-Side Calculation (MVP)
```javascript
// Fetch all users' public stats
// Sort by points
// Display top N (e.g., 50)
// Find current user's position
```

### Security Rules
```javascript
// Users can only read leaderboard data
// Users cannot write to leaderboard (only Cloud Functions)
match /leaderboard/{document} {
  allow read: if request.auth != null;
  allow write: if false; // Only admin/functions
}
```

---

## Implementation Priority

**Phase 1 (MVP):**
- Your rank card
- Top 3 podium
- Full rankings table (top 50)
- All-time filter only
- Client-side calculation

**Phase 2 (Enhancement):**
- Time-based filters (weekly/monthly)
- Metric filters (streak, achievements)
- Cloud Function for pre-calculation
- Pagination for large user bases
- Mini-profile on user click

---

## Files to Create/Modify

### Create:
1. `leaderboard.html` - Main Leaderboard page

### Modify:
1. `index.html` - Update sidebar link (remove Coming Soon)
2. `profile.html` - Update sidebar link
3. `settings.html` - Update sidebar link

---

*Design follows AutoNateAI Learning Hub design system: dark theme, Space Grotesk headings, Inter body text, consistent spacing and border radius.*
