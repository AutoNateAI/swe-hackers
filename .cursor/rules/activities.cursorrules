# AutoNateAI Activity Creation Guide

When creating interactive activities for lessons, follow these patterns and conventions.

## Activity System Overview

Activities are tracked via `ActivityTracker.js` which:
- Auto-discovers elements with `data-activity` attribute
- Tracks timing, attempts, and scores
- Saves to Firestore with offline fallback
- Provides visual feedback

## Required Attributes

Every activity needs:
```html
<div 
  data-activity="unique-activity-id"  <!-- Required: unique ID -->
  data-type="quiz|dragdrop|code|demo" <!-- Required: activity type -->
  data-points="10"                    <!-- Optional: points value -->
>
```

## Activity Types

### 1. Quiz (Multiple Choice)

```html
<div 
  class="quiz-container" 
  data-activity="quiz-ch1-example"
  data-type="quiz"
  data-points="10"
  data-answer="B"  <!-- Fallback answer if not in Firestore -->
>
  <div class="quiz-header">
    <span class="quiz-icon">🧠</span>
    <h3 class="quiz-title">Knowledge Check</h3>
  </div>

  <p class="quiz-question">Your question here?</p>

  <div class="quiz-options">
    <div class="quiz-option" data-value="A">
      <span class="quiz-option-letter">A</span>
      <span>First option</span>
    </div>
    <div class="quiz-option" data-value="B">
      <span class="quiz-option-letter">B</span>
      <span>Correct answer</span>
    </div>
    <div class="quiz-option" data-value="C">
      <span class="quiz-option-letter">C</span>
      <span>Third option</span>
    </div>
  </div>

  <div class="quiz-feedback"
    data-correct-msg="Great job! Explanation here."
    data-incorrect-msg="Not quite. Hint here."
  ></div>

  <button class="quiz-btn" disabled>Check Answer</button>
</div>
```

**Scoring**: Binary (1 = correct, 0 = incorrect)

---

### 2. Drag & Drop (Matching)

```html
<div 
  class="dragdrop-container"
  data-activity="dragdrop-ch1-example"
  data-type="dragdrop"
  data-points="15"
>
  <div class="dragdrop-title">🎯 Match the Items</div>
  
  <!-- Draggable items -->
  <div class="draggables">
    <div data-draggable="item-1">Item One</div>
    <div data-draggable="item-2">Item Two</div>
    <div data-draggable="item-3">Item Three</div>
  </div>

  <!-- Drop zones with correct answers -->
  <div class="dropzones">
    <div data-dropzone="zone-a" data-correct="item-1">
      <span class="zone-label">Zone A</span>
    </div>
    <div data-dropzone="zone-b" data-correct="item-2">
      <span class="zone-label">Zone B</span>
    </div>
    <div data-dropzone="zone-c" data-correct="item-3">
      <span class="zone-label">Zone C</span>
    </div>
  </div>

  <div class="dragdrop-feedback"></div>
  <button class="dragdrop-btn" disabled>Check Matches</button>
</div>
```

**Scoring**: Partial credit (correctCount / totalZones)

---

### 3. Code Challenge

```html
<div 
  class="code-challenge"
  data-activity="code-ch1-example"
  data-type="code"
  data-points="20"
  data-keywords="print,input,variable"  <!-- Keywords to check for -->
>
  <div class="code-challenge-title">💻 Code Challenge</div>
  <p class="code-challenge-desc">
    Write Python code that does X, Y, and Z.
  </p>
  
  <textarea 
    class="code-input" 
    placeholder="# Write your code here..."
  ></textarea>
  
  <div class="code-output"></div>
  <div class="code-feedback"></div>
  <button class="run-btn">▶ Run Code</button>
</div>
```

**Scoring**: Partial credit (keywordsFound / totalKeywords)

**Alternative**: Use `data-tests` for structured test cases:
```html
data-tests='[{"name": "Has print", "contains": "print"}]'
```

---

### 4. Interactive Demo

```html
<div 
  class="demo-container"
  data-activity="demo-ch1-example"
  data-type="demo"
  data-points="10"
  data-interactions="3"  <!-- Required clicks to complete -->
>
  <div class="demo-title">🎮 Interactive Demo</div>
  <span class="demo-status">Click to explore</span>
  
  <div class="demo-area">
    <!-- Each clickable element needs data-interact -->
    <div class="clickable-item" data-interact="item-1">
      Click me first
    </div>
    <div class="clickable-item" data-interact="item-2">
      Click me second
    </div>
    <div class="clickable-item" data-interact="item-3">
      Click me third
    </div>
  </div>
  
  <!-- Progress dots (one per interaction) -->
  <div class="demo-progress">
    <div class="demo-progress-dot"></div>
    <div class="demo-progress-dot"></div>
    <div class="demo-progress-dot"></div>
  </div>
</div>
```

**Scoring**: Engagement-based (0.5 + clicks/threshold * 0.5)

---

## Naming Conventions

Activity IDs should follow this pattern:
```
{type}-{chapter}-{topic}

Examples:
- quiz-ch1-datatypes
- dragdrop-ch2-operators
- code-ch3-loops
- demo-ch1-memory
```

## CSS Classes Available

### Quiz
- `.quiz-container` - Main wrapper
- `.quiz-option` - Option button
- `.quiz-option.selected` - Selected state
- `.quiz-btn` - Submit button
- `.quiz-feedback` - Feedback area

### Drag & Drop
- `.dragdrop-container` - Main wrapper
- `.draggables` - Container for draggable items
- `[data-draggable]` - Draggable item
- `.dropzones` - Container for drop zones
- `[data-dropzone]` - Drop zone
- `.dragdrop-btn` - Submit button
- `.dragdrop-feedback` - Feedback area

### Code Challenge
- `.code-challenge` - Main wrapper
- `.code-input` - Textarea for code
- `.code-output` - Test results area
- `.run-btn` - Run button
- `.code-feedback` - Feedback area

### Demo
- `.demo-container` - Main wrapper
- `.demo-area` - Interactive area
- `[data-interact]` - Clickable element
- `.demo-progress` - Progress dots container
- `.demo-progress-dot` - Individual dot
- `.demo-status` - Status label

## Data Storage

Activities are stored in Firestore:
```
users/{userId}/activityAttempts/{attemptId}
{
  activityId: "quiz-ch1-datatypes",
  activityType: "quiz",
  courseId: "apprentice",
  lessonId: "ch1-stone",
  attemptNumber: 1,
  correct: true,
  score: 1.0,
  timeSpentMs: 1500,
  response: { selected: "B" },
  startedAt: "...",
  completedAt: "..."
}
```

Aggregated stats are on course progress:
```
users/{userId}/courseProgress/{courseId}
{
  activityStats: {
    totalAttempts: 5,
    totalCorrect: 4,
    avgScore: 0.85,
    byType: {
      quiz: { attempts: 2, avgScore: 1.0 },
      dragdrop: { attempts: 1, avgScore: 0.75 }
    }
  }
}
```

## Tips

1. **Always test activities** after creating them
2. **Use meaningful IDs** that indicate chapter and topic
3. **Provide helpful feedback** in quiz `data-correct-msg` and `data-incorrect-msg`
4. **Set appropriate points** based on difficulty (5-10 easy, 15-20 medium, 25+ hard)
5. **For demos**, set `data-interactions` to match the number of `data-interact` elements

