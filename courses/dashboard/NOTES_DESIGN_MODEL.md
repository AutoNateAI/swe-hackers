# Notes Tab Design Model

## Overview
The Notes tab provides a dedicated space for learners to create, organize, and manage their study notes. It expands on the basic notes functionality in the Progress page with enhanced features like folders, search, markdown support, and better organization.

---

## Page Layout

```
┌────────────────────────────────────────────────────────────────────────┐
│ SIDEBAR (existing)                    │ MAIN CONTENT                   │
│                                       │                                │
│ [Logo]                                │ ┌──────────────────────────────┤
│                                       │ │ HEADER: "Notes" 📝           │
│ Main                                  │ └──────────────────────────────┤
│  • Dashboard                          │                                │
│  • Course Library                     │ ┌──────────────────────────────┤
│  • Daily Challenges                   │ │ NOTES STATS BAR              │
│                                       │ │ [Total: 24] [This Week: 5]   │
│ Learning                              │ │ [Favorites: 8]               │
│  • My Progress                        │ └──────────────────────────────┤
│  • Achievements                       │                                │
│  • Notes (ACTIVE)                     │ ┌──────────────────────────────┤
│                                       │ │ TOOLBAR                      │
│ Community                             │ │ [+ New Note] [Search...    ] │
│  • Discord                            │ │ [All] [Favorites] [By Course]│
│  • Leaderboard                        │ └──────────────────────────────┤
│                                       │                                │
│ Account                               │ ┌─────────────┬────────────────┤
│  • Profile                            │ │ NOTES LIST  │ NOTE EDITOR    │
│  • Settings                           │ │             │                │
│  • Sign Out                           │ │ [Note 1]    │ [Title Input]  │
│                                       │ │ [Note 2]    │                │
│ [User Card]                           │ │ [Note 3]    │ [Content Area] │
│                                       │ │ [Note 4]    │ with Markdown  │
│                                       │ │ ...         │                │
│                                       │ │             │ [Course Tag]   │
│                                       │ │             │ [Save] [Delete]│
│                                       │ └─────────────┴────────────────┤
└───────────────────────────────────────┴────────────────────────────────┘
```

---

## Component Designs

### 1. Notes Stats Bar
A horizontal summary showing note statistics.

```
┌─────────────────────────────────────────────────────────────────────────┐
│  📝 24 Total Notes    │    📅 5 This Week    │    ⭐ 8 Favorites        │
└─────────────────────────────────────────────────────────────────────────┘
```

**CSS Pattern:**
- Background: `var(--bg-card)` with gradient accent top border
- Grid layout: 3 equal columns
- Border radius: `var(--radius-lg)`
- Padding: `var(--space-lg)`

---

### 2. Toolbar
Action bar with create button, search, and filters.

```
┌──────────────────────────────────────────────────────────────────────────┐
│  [+ New Note]    [🔍 Search notes...                    ]                │
│                                                                          │
│  [All]  [⭐ Favorites]  [📚 Apprentice]  [🎓 Undergrad]  [🚀 Junior]    │
└──────────────────────────────────────────────────────────────────────────┘
```

**Features:**
- New Note button (primary action)
- Search input with live filtering
- Filter tabs: All, Favorites, and by Course

---

### 3. Notes List Panel (Left Side)
Scrollable list of all notes with preview.

```
┌───────────────────────────┐
│ Your Notes (24)           │
├───────────────────────────┤
│ ┌─────────────────────┐   │
│ │ ⭐ Variables & Types │   │
│ │ A variable is a...   │   │
│ │ 🌟 Apprentice • 2d   │   │
│ └─────────────────────┘   │
│                           │
│ ┌─────────────────────┐   │
│ │ Functions Explained  │   │
│ │ Functions are reusa..│   │
│ │ 🌟 Apprentice • 5d   │   │
│ └─────────────────────┘   │
│                           │
│ ┌─────────────────────┐   │
│ │ API Integration     │   │
│ │ REST APIs allow...   │   │
│ │ 🚀 Junior • 1w       │   │
│ └─────────────────────┘   │
│         ...               │
└───────────────────────────┘
```

**Note Item Features:**
- Title (truncated with ellipsis)
- Content preview (2 lines)
- Course tag icon
- Relative timestamp
- Favorite star indicator
- Active state with border highlight

---

### 4. Note Editor Panel (Right Side)
Full-featured editor for creating and editing notes.

```
┌─────────────────────────────────────────────────────────────────────────┐
│  [Title: Variables and Data Types                                     ] │
├─────────────────────────────────────────────────────────────────────────┤
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │ # Variables and Data Types                                        │  │
│  │                                                                   │  │
│  │ A **variable** is a named container that stores data in memory.  │  │
│  │                                                                   │  │
│  │ ## Common Data Types                                              │  │
│  │ - `int` - whole numbers                                          │  │
│  │ - `float` - decimal numbers                                      │  │
│  │ - `str` - text strings                                           │  │
│  │ - `bool` - True/False                                            │  │
│  │                                                                   │  │
│  │ ## Example Code                                                   │  │
│  │ ```python                                                        │  │
│  │ name = "Alice"                                                   │  │
│  │ age = 25                                                         │  │
│  │ ```                                                              │  │
│  └───────────────────────────────────────────────────────────────────┘  │
├─────────────────────────────────────────────────────────────────────────┤
│  [📚 Select Course ▼]   [⭐ Favorite]        [🗑️ Delete]  [💾 Save]    │
└─────────────────────────────────────────────────────────────────────────┘
```

**Editor Features:**
- Title input field
- Large textarea for content
- Course selector dropdown
- Favorite toggle button
- Delete button (with confirmation)
- Save button
- Auto-save indicator (optional)
- Character/word count (optional)

---

### 5. Empty States

**No Notes Yet:**
```
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                         │
│                              📝                                         │
│                                                                         │
│                    No notes yet                                         │
│           Start capturing your learning journey!                        │
│                                                                         │
│                    [+ Create Your First Note]                           │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

**No Search Results:**
```
┌─────────────────────────────────────────────────────────────────────────┐
│                              🔍                                         │
│                    No notes found                                       │
│           Try a different search term or filter                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Features List

### Core Features (MVP)
1. **Create Notes** - Title, content, course association
2. **Edit Notes** - Modify existing notes
3. **Delete Notes** - Remove with confirmation
4. **List View** - Scrollable list with previews
5. **Search** - Filter notes by title/content
6. **Course Filtering** - View notes by course
7. **Favorites** - Mark important notes

### Enhanced Features (Future)
1. **Markdown Preview** - Toggle between edit/preview modes
2. **Auto-save** - Save drafts automatically
3. **Tags** - Custom tags beyond courses
4. **Export** - Download notes as markdown/PDF
5. **Keyboard Shortcuts** - Ctrl+S to save, etc.
6. **Note Templates** - Pre-defined templates for common note types

---

## Color Scheme (using existing variables)

| Element | Color Variable |
|---------|---------------|
| New Note button | `var(--accent-primary)` (#7986cb) |
| Favorite star (active) | `var(--accent-warning)` (#ffd54f) |
| Delete button | `var(--accent-error)` (#ef5350) |
| Save button | `var(--accent-primary)` (#7986cb) |
| Course tags | Course-specific colors |
| Search highlight | `rgba(121, 134, 203, 0.3)` |

### Course Tag Colors
```css
.tag-apprentice { background: rgba(171, 71, 188, 0.15); color: #ab47bc; }
.tag-undergrad { background: rgba(121, 134, 203, 0.15); color: #7986cb; }
.tag-junior { background: rgba(255, 213, 79, 0.15); color: #ffd54f; }
.tag-senior { background: rgba(77, 182, 172, 0.15); color: #4db6ac; }
.tag-endless { background: rgba(102, 187, 106, 0.15); color: #66bb6a; }
```

---

## Responsive Design

### Desktop (>1024px)
- Two-column layout: 320px list + flexible editor
- Full stats bar visible

### Tablet (768px - 1024px)
- Two-column layout with narrower list (280px)
- Stats bar condenses

### Mobile (<768px)
- Single column layout
- List view with tap to open editor
- Back button to return to list
- Stats bar becomes vertical or hidden

---

## Firebase Data Structure

```javascript
// User notes collection: users/{userId}/notes/{noteId}
{
  title: "Variables and Data Types",
  content: "A **variable** is a named container...",
  courseId: "apprentice",  // optional
  lessonId: "ch1-stone",   // optional - link to specific lesson
  isFavorite: true,
  createdAt: Timestamp,
  updatedAt: Timestamp,
  wordCount: 245  // optional metadata
}
```

### Indexes Needed
- `users/{userId}/notes` ordered by `updatedAt` desc
- `users/{userId}/notes` where `courseId == X` ordered by `updatedAt` desc
- `users/{userId}/notes` where `isFavorite == true` ordered by `updatedAt` desc

---

## Animations

1. **Note List Items** - Staggered fade-in on load
2. **Note Selection** - Smooth highlight transition
3. **Save Feedback** - Brief pulse/checkmark animation
4. **Delete** - Fade out and collapse
5. **Search** - Smooth filter with no results animation

---

## User Experience Flow

1. User navigates to Notes tab
2. Stats bar shows overview of their notes
3. List displays all notes sorted by most recent
4. User can search or filter by course/favorites
5. Clicking a note loads it in the editor
6. User edits and saves (manual or auto-save)
7. New notes appear at top of list
8. Delete with confirmation removes note

---

## Keyboard Shortcuts (Enhancement)

| Shortcut | Action |
|----------|--------|
| `Ctrl/Cmd + N` | New note |
| `Ctrl/Cmd + S` | Save note |
| `Ctrl/Cmd + F` | Focus search |
| `Escape` | Clear selection / close editor on mobile |
| `Ctrl/Cmd + D` | Toggle favorite |

---

## Implementation Priority

**Phase 1 (MVP):**
- Stats bar with totals
- Notes list with search
- Note editor (create/edit/delete)
- Course filtering
- Favorites functionality
- Firebase integration

**Phase 2 (Enhancement):**
- Markdown preview toggle
- Auto-save with draft indicator
- Keyboard shortcuts
- Word/character count
- Export functionality

---

## Files to Create/Modify

### Create:
1. `notes.html` - Main Notes page

### Modify:
1. `index.html` - Update sidebar link (remove Coming Soon)
2. `profile.html` - Update sidebar link
3. `settings.html` - Update sidebar link
4. `progress.html` - Already has link, verify it works

---

## Differences from Progress Page Notes

The dedicated Notes tab improves upon the basic notes in Progress:

| Feature | Progress Page | Notes Tab |
|---------|--------------|-----------|
| Stats overview | ❌ | ✅ |
| Search | ❌ | ✅ |
| Favorites | ❌ | ✅ |
| Filter by course | ❌ | ✅ |
| Delete confirmation | ❌ | ✅ |
| Better empty states | ❌ | ✅ |
| Responsive mobile view | Basic | Full |
| Dedicated URL | ❌ | ✅ |

---

*Design follows AutoNateAI Learning Hub design system: dark theme, Space Grotesk headings, Inter body text, consistent spacing and border radius.*
