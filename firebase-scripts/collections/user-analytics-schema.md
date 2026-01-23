# UserAnalytics Collection Schema

## Overview

The `userAnalytics` collection stores computed learning analytics for each user. This data is derived from activity attempts and engagement patterns, providing insights for:
- Personalized learning recommendations
- Learning style identification
- Strength and growth area detection
- Engagement pattern analysis

## Collection Path

```
userAnalytics/{userId}
```

Each document ID matches the user's Firebase Auth UID.

## Document Structure

```javascript
{
  // Core identifier
  userId: string,              // Firebase Auth UID (matches document ID)
  
  // Learning Style Analysis
  learningStyle: {
    primary: string,           // "visual" | "auditory" | "kinesthetic" | "reading"
    secondary: string | null,  // Second strongest learning style
    confidence: number,        // 0-1, how confident we are in this assessment
    dataPoints: number,        // Number of activities used in assessment
    breakdown: {               // Performance by activity type
      dragDrop: number,        // Average score on drag-drop activities
      multipleChoice: number,  // Average score on multiple choice
      codeCompletion: number,  // Average score on code completion
      freeResponse: number,    // Average score on free response
      matching: number         // Average score on matching activities
    }
  },
  
  // Areas of Strength (topics with >80% average score)
  strengthAreas: [
    {
      topic: string,           // e.g., "variables", "loops", "functions"
      score: number,           // 0-1, average score in this topic
      attempts: number,        // Total attempts in this topic
      lastActivity: Timestamp  // Most recent activity in this topic
    }
  ],
  
  // Areas for Growth (topics with <60% average score)
  growthAreas: [
    {
      topic: string,           // Topic identifier
      score: number,           // 0-1, average score
      attempts: number,        // Total attempts
      suggestedResources: [    // Recommended content
        {
          type: string,        // "lesson" | "activity" | "challenge"
          id: string,          // Resource identifier
          title: string        // Human-readable title
        }
      ]
    }
  ],
  
  // Engagement Patterns
  engagementPatterns: {
    preferredTimes: [string],  // e.g., ["18:00-20:00", "09:00-11:00"]
    avgSessionLength: number,  // Average session length in minutes
    peakPerformanceDay: string,// Day of week with best scores
    peakPerformanceHour: number, // Hour (0-23) with best performance
    consistencyScore: number,  // 0-1, regularity of learning
    streakRecord: number,      // Longest streak achieved
    currentStreak: number,     // Current active streak
    totalSessionCount: number, // Total number of learning sessions
    totalTimeSpentMinutes: number // Total time invested
  },
  
  // Persistence Metrics
  persistenceMetrics: {
    avgAttemptsBeforeSuccess: number, // Average tries before getting correct
    giveUpRate: number,        // 0-1, how often they abandon activities
    retryAfterFailure: number, // 0-1, how often they retry after failure
    improvementRate: number,   // Average score improvement per attempt
    totalAttempts: number,     // Total activity attempts
    totalCorrect: number,      // Total correct answers
    overallAccuracy: number    // totalCorrect / totalAttempts
  },
  
  // Summary Statistics (30-day window)
  summaryStats: {
    activitiesCompleted: number,
    averageScore: number,
    totalTimeSpentMinutes: number,
    uniqueTopics: number,
    uniqueCourses: number,
    periodStart: Timestamp,    // Start of measurement window
    periodEnd: Timestamp       // End of measurement window
  },
  
  // Metadata
  lastComputed: Timestamp,     // When analytics were last calculated
  computeVersion: string,      // Version of computation algorithm used
  dataQuality: {
    hasEnoughData: boolean,    // >= 10 activity attempts
    activityCount: number,     // Total activities used in computation
    daysCovered: number        // Days of data available
  }
}
```

## Field Definitions

### Learning Style

We infer learning style from activity type performance:

| Activity Type | Primary Learning Style |
|--------------|----------------------|
| `drag-drop`, `matching` | Visual |
| `code-completion`, `free-response` | Kinesthetic |
| `multiple-choice` | Reading/Writing |
| Audio-based activities | Auditory |

Higher performance in specific activity types suggests that learning style preference.

### Strength vs Growth Areas

- **Strength Areas**: Topics where `averageScore >= 0.80` with `attempts >= 3`
- **Growth Areas**: Topics where `averageScore < 0.60` with `attempts >= 2`

Topics in between (0.60-0.80) are considered "developing" and not flagged.

### Engagement Patterns

- **preferredTimes**: Time windows (in local time) when user is most active
- **consistencyScore**: Based on variance in activity dates over 30 days
- **peakPerformanceDay/Hour**: When the user achieves highest scores

### Persistence Metrics

- **giveUpRate**: Activities where `attemptNumber == 1` and `correct == false` with no subsequent attempt
- **retryAfterFailure**: Percentage of failed attempts that are followed by another attempt
- **improvementRate**: Average score increase between first and last attempt on same activity

## Indexes Required

Add to `firestore.indexes.json`:

```json
{
  "indexes": [
    {
      "collectionGroup": "userAnalytics",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "summaryStats.averageScore", "order": "DESCENDING" },
        { "fieldPath": "lastComputed", "order": "DESCENDING" }
      ]
    }
  ]
}
```

## Security Rules

```javascript
match /userAnalytics/{userId} {
  // Users can read their own analytics
  allow read: if request.auth.uid == userId;
  
  // Only Cloud Functions can write (via Admin SDK, bypasses rules)
  allow write: if false;
}
```

## Computation Trigger

Analytics are recomputed when:
1. A new `activityAttempt` document is created (via `onActivityComplete` trigger)
2. Manually via `computeUserAnalytics` callable function
3. Scheduled batch job (nightly at 2 AM)

## Data Retention

- Analytics are computed from the last 30 days of activity data
- Historical snapshots may be archived to BigQuery monthly
- The `computeVersion` field allows migration when algorithm changes

## Example Document

```json
{
  "userId": "abc123xyz",
  "learningStyle": {
    "primary": "visual",
    "secondary": "kinesthetic",
    "confidence": 0.82,
    "dataPoints": 156,
    "breakdown": {
      "dragDrop": 0.92,
      "multipleChoice": 0.78,
      "codeCompletion": 0.85,
      "freeResponse": 0.71,
      "matching": 0.88
    }
  },
  "strengthAreas": [
    { "topic": "variables", "score": 0.94, "attempts": 23, "lastActivity": "2026-01-20T14:30:00Z" },
    { "topic": "loops", "score": 0.88, "attempts": 18, "lastActivity": "2026-01-19T16:45:00Z" },
    { "topic": "functions", "score": 0.85, "attempts": 31, "lastActivity": "2026-01-21T09:15:00Z" }
  ],
  "growthAreas": [
    {
      "topic": "recursion",
      "score": 0.52,
      "attempts": 8,
      "suggestedResources": [
        { "type": "lesson", "id": "ch3-recursion-basics", "title": "Recursion Fundamentals" },
        { "type": "activity", "id": "act-recursion-visual", "title": "Visualizing Recursive Calls" }
      ]
    }
  ],
  "engagementPatterns": {
    "preferredTimes": ["18:00-20:00", "09:00-11:00"],
    "avgSessionLength": 34,
    "peakPerformanceDay": "Tuesday",
    "peakPerformanceHour": 19,
    "consistencyScore": 0.78,
    "streakRecord": 14,
    "currentStreak": 5,
    "totalSessionCount": 42,
    "totalTimeSpentMinutes": 1428
  },
  "persistenceMetrics": {
    "avgAttemptsBeforeSuccess": 2.3,
    "giveUpRate": 0.08,
    "retryAfterFailure": 0.91,
    "improvementRate": 0.15,
    "totalAttempts": 156,
    "totalCorrect": 128,
    "overallAccuracy": 0.82
  },
  "summaryStats": {
    "activitiesCompleted": 47,
    "averageScore": 0.81,
    "totalTimeSpentMinutes": 680,
    "uniqueTopics": 8,
    "uniqueCourses": 2,
    "periodStart": "2025-12-22T00:00:00Z",
    "periodEnd": "2026-01-21T23:59:59Z"
  },
  "lastComputed": "2026-01-22T03:00:00Z",
  "computeVersion": "1.0.0",
  "dataQuality": {
    "hasEnoughData": true,
    "activityCount": 156,
    "daysCovered": 30
  }
}
```

## Related Collections

- `users/{userId}/activityAttempts` - Source data for analytics
- `users/{userId}/courseProgress` - Course-level progress data
- `leaderboards/{type}` - Aggregated rankings using analytics data
- `achievements/{id}` - Badges earned based on analytics milestones
