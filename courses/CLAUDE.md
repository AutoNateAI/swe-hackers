# AutoNateAI Learning Hub - Claude Rules

## Project Overview

This is the AutoNateAI Learning Hub, a Firebase-based learning platform. The Firebase project ID is `autonateai-learning-hub`.

## Firebase Scripts

Admin scripts live in `/Users/nathan.baker/Documents/code/swe-hackers/firebase-scripts/`. Always `cd` into that directory before running them. They use a service account key at `~/firebase-admin-key.json`.

### Granting Course Access

When a user needs access to a course (e.g. Endless Opportunities), use the existing grant script:

```bash
cd /Users/nathan.baker/Documents/code/swe-hackers/firebase-scripts
node grant-course-access.js <courseId> --hours=<N> [--dry-run]
```

**Important:** Setting `organizationAccess` on the user document alone is NOT enough. The dashboard checks for a `courseProgress/{courseId}` subcollection document to display courses. The `grant-course-access.js` script handles both. Always use it instead of manually updating Firestore fields.

- Use `--dry-run` first to verify which users will be affected
- `--hours=N` controls how far back to look for signups (default: 1 hour)
- For users who signed up a while ago, increase `--hours` accordingly

Examples:
```bash
# Grant access to users who signed up in the last 4 hours
node grant-course-access.js endless-opportunities --hours=4

# Preview what would happen without making changes
node grant-course-access.js endless-opportunities --hours=24 --dry-run
```

### Querying Lesson Activity

To see which users have been actively answering questions for a specific lesson:

```bash
cd /Users/nathan.baker/Documents/code/swe-hackers/firebase-scripts

# See which lessons have activity for a course
node query-lesson-activity.js endless-opportunities --list-lessons

# See who's been active on a specific lesson (with attempt counts, accuracy, timestamps)
node query-lesson-activity.js endless-opportunities week0-intro
node query-lesson-activity.js endless-opportunities week1-questions
node query-lesson-activity.js apprentice ch1-prompts
```

This shows each user's total attempts, correct count, accuracy %, unique activities completed, and first/last activity timestamps.

### Other Useful Scripts

```bash
# Query any Firestore path
node query-firestore.js users
node query-firestore.js users/{uid}
node query-firestore.js users/{uid}/courseProgress/endless-opportunities

# List users with activity data
node query-activities.js --list-users

# View a specific user's activities for a course
node query-activities.js <uid> <courseId>
```

## Course Access Model

- **`organizationAccess`** (user doc field): Controls whether RBAC allows the user to view organization-restricted courses
- **`courseProgress/{courseId}`** (subcollection doc): The enrollment record — the dashboard uses this to show courses to the user
- Both are required for a user to see and access a course

### Endless Opportunities Course

- Course ID: `endless-opportunities`
- Visibility: organization-restricted (requires `organizationAccess: ['endless-opportunities']`)
- Structure: 5 weeks (`week0-intro` through `week4-portfolio`)
- Partner: Endless Opportunities Foundation
