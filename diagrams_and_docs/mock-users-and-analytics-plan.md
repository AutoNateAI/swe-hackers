# Mock Users & Analytics Dashboard Plan

## Overview

This document outlines:
1. Complete mapping of courses, lessons, and activities
2. Mock user profiles and engagement patterns  
3. Data generation strategy for AI agents
4. Dashboard 3x3 visualization grid design

---

## Part 1: Course & Activity Mapping

### Courses Overview

| Course | ID | Chapters | Target Audience | Focus |
|--------|-----|----------|-----------------|-------|
| Apprentice | `apprentice` | 7 (ch0-ch6) | Beginners | Python fundamentals |
| Junior | `junior` | 7 (ch0-ch6) | Early career | JavaScript/web dev |
| Senior | `senior` | 7 (ch0-ch6) | Experienced | System design |
| Undergrad | `undergrad` | 7 (ch0-ch6) | College students | CS fundamentals |
| Endless Opportunities | `endless-opportunities` | 5 (week0-week4) | All levels | Critical thinking |

### Chapter Structure (Per Course)

```
Chapter Pattern:
├── ch0-origins     # Introduction, philosophy, setup
├── ch1-stone       # Fundamentals (variables, data types)
├── ch2-lightning   # Control flow (loops, decisions)  
├── ch3-magnetism   # Functions and modularity
├── ch4-architect   # Design patterns
├── ch5-capstone1   # Project application
└── ch6-capstone2   # Advanced integration
```

### Activity Types per Lesson

Each lesson contains:

| Activity Type | ID Pattern | Description | Tracked Data |
|--------------|------------|-------------|--------------|
| **Story Steps** | `{storyId}-step-{n}` | Animated diagram steps | viewedAt, duration |
| **Quiz Questions** | `{storyId}-quiz-{n}` | Multiple choice | correct, attemptNumber, score |
| **Lesson Progress** | `{lessonId}` | Overall lesson tracking | completed, progressPercent, totalTimeSpent |

### Detailed Activity Count (Example: Apprentice)

```
apprentice/
├── ch0-origins/
│   ├── stories: 3 (three-forces, binary, navigation)
│   │   └── steps per story: 5-6 each (~16 total)
│   └── quizzes: 3 (3 questions each = 9 quiz questions)
│
├── ch1-stone/
│   ├── stories: 3 (variables, datatypes, input-output)
│   │   └── steps: 5-6 each (~16 total)
│   └── quizzes: 3 (3 questions each = 9 quiz questions)
│
├── ch2-lightning/
│   ├── stories: 3 (decisions, control-flow, loops)
│   │   └── steps: 5-6 each (~16 total)
│   └── quizzes: 3 (3 questions each = 9 quiz questions)
│
├── ch3-magnetism/
│   ├── stories: 3 (functions, parameters, return)
│   │   └── steps: 4-5 each (~14 total)
│   └── quizzes: 3 (3 questions each = 9 quiz questions)
│
├── ch4-architect/
│   ├── stories: 3
│   └── quizzes: 3
│
├── ch5-capstone1/
│   ├── stories: 3-4
│   └── quizzes: 2-3
│
└── ch6-capstone2/
    ├── stories: 3
    └── quizzes: 2-3

TOTALS PER COURSE (approximate):
- Stories: ~21-24
- Story Steps: ~100-120
- Quiz Questions: ~50-60
```

---

## Part 2: Mock User Profiles

### 6 Mock Users with Distinct Patterns

| # | Name | Email | Password | Profile |
|---|------|-------|----------|---------|
| 1 | Alex Chen | mock.alex@swehackers.dev | `MockUser123!` | Power learner, high engagement |
| 2 | Jordan Rivera | mock.jordan@swehackers.dev | `MockUser123!` | Consistent daily learner |
| 3 | Sam Taylor | mock.sam@swehackers.dev | `MockUser123!` | Weekend warrior |
| 4 | Casey Morgan | mock.casey@swehackers.dev | `MockUser123!` | Burst learner (binges then breaks) |
| 5 | Riley Parker | mock.riley@swehackers.dev | `MockUser123!` | Slow and steady |
| 6 | Drew Kim | mock.drew@swehackers.dev | `MockUser123!` | Dropped off (churned user) |

### Detailed User Profiles

#### User 1: Alex Chen (Power Learner)
```yaml
engagement_level: HIGH
courses:
  - apprentice: COMPLETED (100%)
  - junior: IN_PROGRESS (75%)
  - endless-opportunities: COMPLETED (100%)

behavior_patterns:
  sessions_per_week: 5-7
  avg_session_length: 45-60 min
  peak_hours: [19, 20, 21]  # Evening learner
  peak_days: [Mon, Tue, Wed, Thu, Fri]
  streak_record: 28 days
  current_streak: 12 days
  
quiz_performance:
  accuracy: 85-95%
  retry_rate: 15%  # Rarely needs to retry
  improvement_trend: STABLE_HIGH

activity_distribution:
  weekday_ratio: 0.8
  weekend_ratio: 0.2
```

#### User 2: Jordan Rivera (Consistent Learner)
```yaml
engagement_level: MEDIUM-HIGH
courses:
  - undergrad: IN_PROGRESS (60%)
  - senior: IN_PROGRESS (30%)

behavior_patterns:
  sessions_per_week: 4-5
  avg_session_length: 20-30 min
  peak_hours: [7, 8, 12, 13]  # Morning & lunch
  peak_days: [Mon, Tue, Wed, Thu, Fri]
  streak_record: 45 days
  current_streak: 18 days

quiz_performance:
  accuracy: 70-80%
  retry_rate: 30%
  improvement_trend: GRADUAL_IMPROVEMENT

activity_distribution:
  weekday_ratio: 0.9
  weekend_ratio: 0.1
```

#### User 3: Sam Taylor (Weekend Warrior)
```yaml
engagement_level: MEDIUM
courses:
  - apprentice: IN_PROGRESS (45%)
  - endless-opportunities: IN_PROGRESS (40%)

behavior_patterns:
  sessions_per_week: 2-3
  avg_session_length: 60-90 min  # Long weekend sessions
  peak_hours: [10, 11, 14, 15]  # Mid-day weekends
  peak_days: [Sat, Sun]
  streak_record: 5 days
  current_streak: 2 days

quiz_performance:
  accuracy: 65-75%
  retry_rate: 35%
  improvement_trend: VARIABLE

activity_distribution:
  weekday_ratio: 0.15
  weekend_ratio: 0.85
```

#### User 4: Casey Morgan (Burst Learner)
```yaml
engagement_level: VARIABLE
courses:
  - junior: IN_PROGRESS (55%)

behavior_patterns:
  sessions_per_week: 0-10 (binge weeks vs gap weeks)
  avg_session_length: 30-45 min
  peak_hours: [21, 22, 23]  # Night owl
  peak_days: varies by burst
  streak_record: 14 days
  current_streak: 0 days

burst_pattern:
  # 3 bursts over the time period:
  - burst_1: Oct 18 - Nov 5 (18 days active)
  - gap_1: Nov 6 - Nov 25 (20 days inactive)
  - burst_2: Nov 26 - Dec 15 (20 days active)
  - gap_2: Dec 16 - Jan 5 (21 days inactive)
  - burst_3: Jan 6 - Jan 23 (current, 17 days active)

quiz_performance:
  accuracy: 60-85%  # Variable based on fatigue
  retry_rate: 40%
  improvement_trend: INCONSISTENT
```

#### User 5: Riley Parker (Slow & Steady)
```yaml
engagement_level: LOW-MEDIUM
courses:
  - apprentice: IN_PROGRESS (25%)

behavior_patterns:
  sessions_per_week: 1-2
  avg_session_length: 15-20 min
  peak_hours: [20, 21]
  peak_days: [Tue, Thu]
  streak_record: 8 days
  current_streak: 3 days

quiz_performance:
  accuracy: 75-85%
  retry_rate: 25%
  improvement_trend: SLOW_BUT_STEADY

note: "Takes time, but retains well"
```

#### User 6: Drew Kim (Churned User)
```yaml
engagement_level: NONE (churned)
courses:
  - endless-opportunities: STARTED (15%)

behavior_patterns:
  sessions_per_week: 0 (stopped)
  last_active: Nov 30, 2025
  
churn_pattern:
  - joined: Oct 18, 2025
  - active: Oct 18 - Oct 28 (11 days)
  - sporadic: Oct 29 - Nov 15 (occasional)
  - inactive: Nov 16 - Nov 30 (minimal)
  - churned: Dec 1+ (no activity)

quiz_performance:
  accuracy: 55-65%  # Struggled
  retry_rate: 50%
  
churn_signals:
  - decreasing_session_length
  - increasing_time_between_sessions
  - low_quiz_scores
  - no_course_progress_after_week_2
```

---

## Part 3: Firestore Data Structure

### Collections to Populate

```
firestore/
├── users/{userId}/
│   ├── profile
│   ├── courseProgress/{courseId}
│   │   └── lessons: { lessonId: { completed, progressPercent, completedAt, ... } }
│   └── activityAttempts/{attemptId}
│
└── userAnalytics/{userId}
    └── (auto-computed by Cloud Functions)
```

### User Document Structure

```javascript
// users/{userId}
{
  email: "mock.alex@swehackers.dev",
  displayName: "Alex Chen",
  createdAt: Timestamp,
  role: "student",
  
  // Set by Firebase Auth (create user with email/password)
}
```

### Course Progress Structure

```javascript
// users/{userId}/courseProgress/{courseId}
{
  courseId: "apprentice",
  enrolled: true,
  enrolledAt: Timestamp,
  lastActivity: Timestamp,
  
  lessons: {
    "ch0-origins": {
      completed: true,
      completedAt: Timestamp,
      progressPercent: 100,
      viewedSections: 3,
      totalSections: 3,
      lastViewedAt: Timestamp
    },
    "ch1-stone": {
      completed: true,
      completedAt: Timestamp,
      progressPercent: 100,
      viewedSections: 3,
      totalSections: 3,
      lastViewedAt: Timestamp
    },
    // ... etc
  }
}
```

### Activity Attempts Structure

```javascript
// users/{userId}/activityAttempts/{attemptId}
{
  activityId: "variables-story-quiz-1",
  activityType: "quiz",  // or "story-step", "manual-test", etc.
  courseId: "apprentice",
  lessonId: "ch1-stone",
  
  correct: true,
  score: 100,
  attemptNumber: 1,
  
  createdAt: Timestamp,
  timeSpent: 45000,  // milliseconds
  
  // Optional metadata
  questionIndex: 0,
  selectedAnswer: 2,
  correctAnswer: 2
}
```

---

## Part 4: Data Generation Strategy

### Agent Instructions

Each of the 6 AI agents should:

1. **Authenticate** as their mock user (or create if doesn't exist)
2. **Generate activity data** following their specific pattern
3. **Spread data** across Oct 18, 2025 → Jan 23, 2026 (98 days)

### Time Distribution Algorithm

```python
# Pseudo-code for generating realistic timestamps

def generate_activity_timestamps(user_profile, start_date, end_date):
    timestamps = []
    current_date = start_date
    
    while current_date <= end_date:
        # Check if this day should have activity
        day_of_week = current_date.weekday()  # 0=Mon, 6=Sun
        
        if is_active_day(user_profile, day_of_week, current_date):
            # Determine number of sessions
            sessions = random.choice(user_profile['sessions_per_day'])
            
            for _ in range(sessions):
                # Pick a peak hour with some variance
                hour = weighted_choice(user_profile['peak_hours'])
                minute = random.randint(0, 59)
                
                session_start = datetime(
                    current_date.year, 
                    current_date.month, 
                    current_date.day,
                    hour, minute
                )
                
                # Generate activities within session
                session_length = random.gauss(
                    user_profile['avg_session_length'], 
                    variance=10
                )
                
                # Add activity timestamps
                timestamps.extend(
                    generate_session_activities(session_start, session_length)
                )
        
        current_date += timedelta(days=1)
    
    return timestamps
```

### Human-Realistic Patterns

```yaml
# Patterns to incorporate:

natural_breaks:
  - holidays: [Nov 28-29, Dec 24-26, Dec 31, Jan 1]  # Thanksgiving, Christmas, NYE
  - typical_gaps: "Even engaged users skip 1-2 days randomly"

session_decay:
  - "Activity count decreases toward end of sessions"
  - "Quiz accuracy decreases slightly when tired"

time_of_day_effects:
  - morning: "Higher quiz accuracy"
  - evening: "More story consumption, less quizzing"
  - night: "More breaks between activities"

weekly_rhythm:
  - "Monday: Fresh start, higher engagement"
  - "Friday: Lower engagement (weekend prep)"
  - "Sunday evening: Slight uptick (prep for week)"
```

---

## Part 5: Dashboard 3x3 Grid Design

### Grid Layout

```
┌─────────────────┬─────────────────┬─────────────────┐
│  Activity       │  Weekly         │  Learning       │
│  Heatmap        │  Pattern        │  Streak         │
│  (contribution) │  (bar chart)    │  (flame+days)   │
├─────────────────┼─────────────────┼─────────────────┤
│  Progress       │  Accuracy       │  Time Spent     │
│  Over Time      │  Trend          │  Distribution   │
│  (line chart)   │  (line chart)   │  (donut chart)  │
├─────────────────┼─────────────────┼─────────────────┤
│  Skill          │  Course         │  Activity       │
│  Radar          │  Breakdown      │  Types          │
│  (radar chart)  │  (stacked bar)  │  (pie chart)    │
└─────────────────┴─────────────────┴─────────────────┘
```

### Chart Specifications

#### Row 1: Activity Overview

| Chart | Data Source | Interaction |
|-------|-------------|-------------|
| **Activity Heatmap** | `activityAttempts` grouped by date | Hover: show count |
| **Weekly Pattern** | `activityAttempts` grouped by day-of-week | Highlight current day |
| **Learning Streak** | `userAnalytics.engagementPatterns` | Flame animation |

#### Row 2: Performance Metrics

| Chart | Data Source | Interaction |
|-------|-------------|-------------|
| **Progress Over Time** | `courseProgress` completion % by date | Hover: show milestone |
| **Accuracy Trend** | `activityAttempts` quiz scores over time | Line with moving avg |
| **Time Distribution** | `activityAttempts.timeSpent` by activity type | Hover: show hours |

#### Row 3: Skills & Breakdown

| Chart | Data Source | Interaction |
|-------|-------------|-------------|
| **Skill Radar** | `userAnalytics.skills` | Hover: show score |
| **Course Breakdown** | `courseProgress` per course | Click: filter view |
| **Activity Types** | `activityAttempts.activityType` counts | Hover: show count |

### Data for Each Chart

```javascript
// 1. Activity Heatmap
{
  type: "heatmap",
  data: activityAttempts.groupBy(date).count(),
  period: "12 weeks"
}

// 2. Weekly Pattern  
{
  type: "bar",
  data: {
    Sun: count, Mon: count, Tue: count, ...
  }
}

// 3. Learning Streak
{
  type: "custom",
  data: {
    currentStreak: number,
    streakRecord: number,
    recentDays: [{ date, active }]
  }
}

// 4. Progress Over Time
{
  type: "line",
  data: [
    { date: "2025-10-18", value: 0, label: "Started" },
    { date: "2025-10-25", value: 15, label: "Ch0 Complete" },
    ...
  ]
}

// 5. Accuracy Trend
{
  type: "line",
  data: [
    { date: "2025-10-18", accuracy: 70 },
    { date: "2025-10-25", accuracy: 75 },
    ...
  ],
  showMovingAverage: true
}

// 6. Time Distribution
{
  type: "donut",
  data: {
    "Story Steps": 45,  // percent
    "Quizzes": 35,
    "Review": 20
  }
}

// 7. Skill Radar
{
  type: "radar",
  data: {
    "Variables": 85,
    "Control Flow": 70,
    "Functions": 60,
    "Data Types": 90,
    "I/O": 75
  }
}

// 8. Course Breakdown
{
  type: "stacked-bar",
  data: [
    { course: "apprentice", completed: 100, inProgress: 0 },
    { course: "junior", completed: 50, inProgress: 25 },
    ...
  ]
}

// 9. Activity Types
{
  type: "pie",
  data: {
    "MultipleChoice": 45,
    "DragDrop": 20,
    "FreeResponse": 15,
    "Matching": 12,
    "CodeCompletion": 8
  }
}
```

---

## Part 6: Agent Task Assignment

### Agent Task Template

Each agent should execute this workflow:

```markdown
## Agent Task: Generate Mock Data for [USER_NAME]

### User Profile
- Email: mock.[name]@swehackers.dev
- Password: MockUser123!
- Courses: [list]
- Engagement Level: [HIGH/MEDIUM/LOW]

### Date Range
- Start: October 18, 2025
- End: January 23, 2026
- Total Days: 98

### Activity Pattern
[Include specific pattern from user profile above]

### Steps

1. **Create Firebase Auth User** (if not exists)
   - Use Firebase Admin SDK or REST API
   - Set email and password
   - Store UID

2. **Create User Document**
   - Path: `users/{uid}`
   - Include displayName, email, createdAt

3. **Generate Course Progress**
   - For each enrolled course:
     - Create `courseProgress/{courseId}` document
     - Fill in lesson completion data with realistic timestamps

4. **Generate Activity Attempts**
   - For each completed lesson:
     - Generate story step views (viewedAt timestamps)
     - Generate quiz attempts (with scores based on accuracy profile)
   - Spread across date range following engagement pattern

5. **Trigger Analytics Computation**
   - The Cloud Functions will auto-compute userAnalytics
   - Or manually trigger if needed

### Validation
- [ ] User can log in with credentials
- [ ] Dashboard shows populated data
- [ ] Activity heatmap shows expected pattern
- [ ] Streak calculation is correct
```

### Agent Assignment Matrix

| Agent | User | Primary Course | Secondary Course | Pattern |
|-------|------|----------------|------------------|---------|
| Agent 1 | Alex Chen | apprentice (100%) | junior (75%), endless (100%) | Power learner |
| Agent 2 | Jordan Rivera | undergrad (60%) | senior (30%) | Consistent |
| Agent 3 | Sam Taylor | apprentice (45%) | endless (40%) | Weekend |
| Agent 4 | Casey Morgan | junior (55%) | - | Burst |
| Agent 5 | Riley Parker | apprentice (25%) | - | Slow |
| Agent 6 | Drew Kim | endless (15%) | - | Churned |

---

## Part 7: Implementation Checklist

### Phase 1: Setup
- [ ] Create Firebase Auth users with mock emails
- [ ] Verify login works for all 6 users
- [ ] Test data model with one user manually

### Phase 2: Data Generation
- [ ] Agent 1: Alex Chen data
- [ ] Agent 2: Jordan Rivera data
- [ ] Agent 3: Sam Taylor data  
- [ ] Agent 4: Casey Morgan data
- [ ] Agent 5: Riley Parker data
- [ ] Agent 6: Drew Kim data

### Phase 3: Dashboard Update
- [ ] Replace messy layout with 3x3 grid
- [ ] Create AccuracyTrendChart component
- [ ] Create TimeDistributionChart component
- [ ] Create CourseBreakdownChart component
- [ ] Create ActivityTypesChart component
- [ ] Wire all charts to real data

### Phase 4: Validation
- [ ] Log in as each user and verify dashboard
- [ ] Take screenshots of different user types
- [ ] Verify analytics computations are correct
- [ ] Document any edge cases found

---

## Appendix: Firebase Scripts

### Create Mock User (Node.js)

```javascript
// scripts/create-mock-user.js
const admin = require('firebase-admin');

async function createMockUser(email, password, displayName) {
  try {
    // Create auth user
    const userRecord = await admin.auth().createUser({
      email,
      password,
      displayName,
      emailVerified: true
    });
    
    // Create user document
    await admin.firestore()
      .collection('users')
      .doc(userRecord.uid)
      .set({
        email,
        displayName,
        role: 'student',
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
    
    console.log(`Created user: ${email} (${userRecord.uid})`);
    return userRecord.uid;
    
  } catch (error) {
    console.error(`Failed to create ${email}:`, error);
    throw error;
  }
}

// Create all mock users
const mockUsers = [
  { email: 'mock.alex@swehackers.dev', name: 'Alex Chen' },
  { email: 'mock.jordan@swehackers.dev', name: 'Jordan Rivera' },
  { email: 'mock.sam@swehackers.dev', name: 'Sam Taylor' },
  { email: 'mock.casey@swehackers.dev', name: 'Casey Morgan' },
  { email: 'mock.riley@swehackers.dev', name: 'Riley Parker' },
  { email: 'mock.drew@swehackers.dev', name: 'Drew Kim' },
];

mockUsers.forEach(user => {
  createMockUser(user.email, 'MockUser123!', user.name);
});
```

### Generate Activity Data Template

```javascript
// scripts/generate-user-data.js

async function generateUserData(userId, profile) {
  const db = admin.firestore();
  const batch = db.batch();
  
  // Generate timestamps based on profile
  const activityDates = generateActivityDates(profile);
  
  for (const date of activityDates) {
    // For each active date, generate session activities
    const activities = generateSessionActivities(
      profile.courses,
      profile.quizAccuracy,
      date
    );
    
    for (const activity of activities) {
      const ref = db
        .collection('users')
        .doc(userId)
        .collection('activityAttempts')
        .doc();
      
      batch.set(ref, {
        ...activity,
        createdAt: admin.firestore.Timestamp.fromDate(date)
      });
    }
  }
  
  await batch.commit();
  console.log(`Generated ${activityDates.length} days of data for ${userId}`);
}
```

---

## Notes for AI Agents

1. **Timezone**: All timestamps should be in EST/EDT (Grand Rapids, MI timezone)
2. **Randomness**: Use seeded random for reproducibility 
3. **Batching**: Firestore allows 500 writes per batch
4. **Rate Limits**: Add delays between batches if needed
5. **Validation**: Log summaries after each user's data is generated

---

*Document created: Jan 23, 2026*
*For use with SWE Hackers learning platform*
