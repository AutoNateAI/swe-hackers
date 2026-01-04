# Firebase Scripts for AutoNateAI Learning Hub

CLI scripts for querying and managing Firestore data.

## Setup (One-time)

### 1. Download Service Account Key

1. Go to [Firebase Console](https://console.firebase.google.com/project/autonateai-learning-hub/settings/serviceaccounts/adminsdk)
2. Click **"Generate new private key"**
3. Save the file as: `~/firebase-admin-key.json`

### 2. Install Dependencies

```bash
cd firebase-scripts
npm install
```

## Available Scripts

### Query Firestore (General)

```bash
node query-firestore.js <path>

# Examples:
node query-firestore.js users
node query-firestore.js users/{uid}
node query-firestore.js users/{uid}/activityAttempts
node query-firestore.js users/{uid}/courseProgress/apprentice
node query-firestore.js activities
```

### Query Activities (Specialized)

```bash
node query-activities.js --list-users
node query-activities.js <userId> [courseId]

# Examples:
node query-activities.js --list-users
node query-activities.js abc123xyz
node query-activities.js abc123xyz apprentice
```

## For Cursor AI

These scripts allow Cursor to query Firestore data when debugging issues:

1. **Check if data was saved**: `node query-activities.js --list-users`
2. **View specific user's activities**: `node query-activities.js <uid> apprentice`
3. **Check course progress**: `node query-firestore.js users/<uid>/courseProgress/apprentice`

