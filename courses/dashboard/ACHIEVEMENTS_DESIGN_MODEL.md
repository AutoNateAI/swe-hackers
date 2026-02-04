# Achievements Tab Design Model

## Overview
The Achievements tab will gamify the learning experience by rewarding users for completing milestones, maintaining streaks, and engaging with the platform. It follows the existing AutoNateAI dashboard design patterns.

---

## Page Layout

```
┌────────────────────────────────────────────────────────────────────────┐
│ SIDEBAR (existing)                    │ MAIN CONTENT                   │
│                                       │                                │
│ [Logo]                                │ ┌──────────────────────────────┤
│                                       │ │ HEADER: "Achievements" 🏆    │
│ Main                                  │ └──────────────────────────────┤
│  • Dashboard                          │                                │
│  • Course Library                     │ ┌──────────────────────────────┤
│  • Daily Challenges                   │ │ ACHIEVEMENT STATS BAR        │
│                                       │ │ [Total: 12/45] [Points: 2450]│
│ Learning                              │ │ [Rank: Rising Star]          │
│  • My Progress                        │ └──────────────────────────────┤
│  • Achievements (ACTIVE)              │                                │
│  • Notes                              │ ┌──────────────────────────────┤
│                                       │ │ FILTER TABS                  │
│ Community                             │ │ [All] [Unlocked] [Locked]    │
│  • Discord                            │ │ [Learning] [Streaks] [Social]│
│  • Leaderboard                        │ └──────────────────────────────┤
│                                       │                                │
│ Account                               │ ┌──────────────────────────────┤
│  • Profile                            │ │ FEATURED ACHIEVEMENT         │
│  • Settings                           │ │ (Next milestone to unlock)   │
│  • Sign Out                           │ │ [Large card with progress]   │
│                                       │ └──────────────────────────────┤
│                                       │                                │
│ [User Card]                           │ ┌──────────────────────────────┤
│                                       │ │ ACHIEVEMENTS GRID            │
│                                       │ │ ┌─────┐ ┌─────┐ ┌─────┐     │
│                                       │ │ │ 🏅  │ │ 🔥  │ │ 📚  │     │
│                                       │ │ │Badge│ │Badge│ │Badge│     │
│                                       │ │ └─────┘ └─────┘ └─────┘     │
│                                       │ │ ┌─────┐ ┌─────┐ ┌─────┐     │
│                                       │ │ │ ⚡  │ │ 🎯  │ │ 🌟  │     │
│                                       │ │ │Badge│ │Badge│ │Badge│     │
│                                       │ │ └─────┘ └─────┘ └─────┘     │
│                                       │ └──────────────────────────────┤
└───────────────────────────────────────┴────────────────────────────────┘
```

---

## Component Designs

### 1. Achievement Stats Bar
A horizontal summary bar at the top showing overall progress.

```
┌─────────────────────────────────────────────────────────────────────────┐
│  🏆 12 / 45 Unlocked    │    ⭐ 2,450 Points    │    🎖️ Rising Star     │
│  ████████░░░░░░░░ 27%   │                       │    Next: Explorer     │
└─────────────────────────────────────────────────────────────────────────┘
```

**CSS Pattern:**
- Background: `var(--bg-card)` with gradient accent top border
- Grid layout: 3 equal columns
- Border radius: `var(--radius-lg)`
- Padding: `var(--space-lg)`

---

### 2. Filter Tabs
Category-based filtering for achievements.

```
┌──────────────────────────────────────────────────────────────────────────┐
│ [All ✓]  [Unlocked]  [In Progress]  |  [Learning]  [Streaks]  [Community]│
└──────────────────────────────────────────────────────────────────────────┘
```

**Categories:**
- **Status filters:** All, Unlocked, In Progress, Locked
- **Type filters:** Learning, Streaks, Community, Milestones

**CSS Pattern:** Same as `progress-tabs` from progress.html

---

### 3. Featured Achievement Card
Highlights the next achievement the user is closest to unlocking.

```
┌─────────────────────────────────────────────────────────────────────────┐
│  ✨ NEXT UP                                                             │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  [🔥]     7-Day Streak Master                                    │   │
│  │           Complete lessons for 7 consecutive days                │   │
│  │                                                                  │   │
│  │  Progress: 5/7 days                                              │   │
│  │  [████████████░░░░] 71%                                          │   │
│  │                                                                  │   │
│  │  🎁 Reward: +150 points, "Dedicated Learner" title               │   │
│  └─────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
```

**CSS Pattern:**
- Background: `linear-gradient(135deg, var(--bg-card), var(--bg-tertiary))`
- Subtle glow/border animation to draw attention
- Larger icon (64px)

---

### 4. Achievement Badge Card
Individual achievement display in the grid.

**Unlocked State:**
```
┌───────────────────────────┐
│                           │
│         [🏅]              │  <- Large icon (48px)
│                           │
│    First Steps            │  <- Title (bold)
│  Complete your first      │  <- Description (muted)
│       lesson              │
│                           │
│  ✓ Unlocked Jan 15        │  <- Status (success color)
│    +50 points             │  <- Points earned
└───────────────────────────┘
```

**Locked State:**
```
┌───────────────────────────┐
│                           │
│         [🔒]              │  <- Grayed out icon
│                           │
│    ??? Hidden ???         │  <- OR show name
│  Complete 5 lessons       │  <- Progress hint
│                           │
│  Progress: 2/5            │  <- Current progress
│  [████░░░░░░] 40%         │  <- Progress bar
└───────────────────────────┘
```

**CSS Pattern:**
- Background: `var(--bg-card)`
- Border: `1px solid rgba(255, 255, 255, 0.05)`
- Hover: `translateY(-3px)` with shadow
- Locked cards: `opacity: 0.6`, grayscale filter on icon
- Unlocked cards: subtle glow in accent color

---

## Achievement Categories & Examples

### Learning Achievements
| Icon | Name | Description | Points |
|------|------|-------------|--------|
| 🎓 | First Steps | Complete your first lesson | 50 |
| 📖 | Bookworm | Complete 10 lessons | 150 |
| 🏛️ | Scholar | Complete 25 lessons | 300 |
| 🎯 | Chapter Master | Complete an entire chapter | 200 |
| 🌟 | Course Graduate | Complete an entire course | 500 |
| 💎 | Knowledge Seeker | Complete all Stone Force lessons | 250 |
| ⚡ | Lightning Fast | Complete all Lightning Force lessons | 250 |
| 🧲 | Attraction Expert | Complete all Magnetism Force lessons | 250 |

### Streak Achievements
| Icon | Name | Description | Points |
|------|------|-------------|--------|
| 🔥 | Getting Warm | 3-day learning streak | 75 |
| 🔥 | On Fire | 7-day learning streak | 150 |
| 🔥 | Unstoppable | 14-day learning streak | 300 |
| 🔥 | Legend | 30-day learning streak | 500 |
| ☀️ | Early Bird | Complete a lesson before 9 AM | 50 |
| 🌙 | Night Owl | Complete a lesson after 10 PM | 50 |
| 📅 | Weekend Warrior | Learn on both Sat & Sun | 100 |

### Community Achievements
| Icon | Name | Description | Points |
|------|------|-------------|--------|
| 👋 | Welcome | Join the Discord community | 25 |
| 💬 | Conversation Starter | Post your first message | 50 |
| 🤝 | Helper | Help another learner | 100 |
| 📝 | Note Taker | Create 5 notes | 75 |
| 🃏 | Card Shark | Study 50 flashcards | 100 |

### Milestone Achievements
| Icon | Name | Description | Points |
|------|------|-------------|--------|
| 🚀 | Launch Day | Sign up and start learning | 25 |
| ⏰ | Time Invested | Spend 10 hours learning | 200 |
| 📈 | Rising Star | Reach 500 total points | 100 |
| 🌟 | All Star | Reach 2000 total points | 250 |
| 👑 | Champion | Reach 5000 total points | 500 |

---

## Color Scheme (using existing variables)

| Element | Color Variable |
|---------|---------------|
| Unlocked badge glow | `var(--accent-primary)` (#7986cb) |
| Progress bar fill | `linear-gradient(90deg, var(--accent-primary), var(--accent-secondary))` |
| Success/Unlocked text | `var(--accent-success)` (#66bb6a) |
| Locked overlay | `rgba(0, 0, 0, 0.5)` |
| Points highlight | `var(--accent-warning)` (#ffd54f) |
| Streak fire | `var(--accent-error)` (#ef5350) |

---

## Responsive Design

### Desktop (>1024px)
- 4-column achievement grid
- Full stats bar visible

### Tablet (768px - 1024px)
- 3-column achievement grid
- Stats bar stacks if needed

### Mobile (<768px)
- 2-column achievement grid
- Stats bar becomes vertical stack
- Filter tabs scroll horizontally

---

## Firebase Data Structure

```javascript
// User achievements document: users/{userId}/achievements
{
  totalPoints: 2450,
  rank: "rising_star",
  unlockedAchievements: {
    "first_steps": {
      unlockedAt: Timestamp,
      pointsAwarded: 50
    },
    "getting_warm": {
      unlockedAt: Timestamp,
      pointsAwarded: 75
    }
    // ... more achievements
  },
  progress: {
    "bookworm": { current: 7, target: 10 },
    "on_fire": { current: 5, target: 7 },
    // ... achievements in progress
  }
}
```

---

## Animations

1. **Unlock Animation:** When viewing a newly unlocked achievement, show a celebratory animation (confetti or glow pulse)

2. **Progress Updates:** Smooth counter animation when points increase (using anime.js)

3. **Card Hover:** `transform: translateY(-3px)` with box-shadow increase

4. **Filter Tab Switch:** `fadeIn` animation (same as progress.html)

---

## User Experience Flow

1. User navigates to Achievements tab
2. Stats bar shows overall progress at a glance
3. Featured card highlights next achievable milestone
4. Grid shows all achievements with clear locked/unlocked states
5. Clicking an achievement shows details in a modal (optional for v1)
6. Real-time updates when achievements are unlocked elsewhere

---

## Implementation Priority

**Phase 1 (MVP):**
- Stats bar with totals
- Achievement grid with all categories
- Basic locked/unlocked states
- Filter tabs

**Phase 2 (Enhancement):**
- Featured achievement card
- Unlock animations
- Achievement detail modal
- Real-time progress tracking

---

## Files to Create

1. `achievements.html` - Main page
2. Page-specific CSS (inline in `<style>` tag, following progress.html pattern)
3. Achievement definitions (JavaScript object)
4. Firebase integration for tracking

---

*Design follows AutoNateAI Learning Hub design system: dark theme, Space Grotesk headings, Inter body text, consistent spacing and border radius.*
