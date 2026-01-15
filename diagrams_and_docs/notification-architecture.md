# Notification Architecture Research (AutoNateAI)

> **Purpose:** Define a reuse-first notification architecture that integrates with AutoNateAI subsystems without introducing unnecessary new patterns.

## The Vision

```mermaid
flowchart LR
    subgraph Today["Current State"]
        U1["User completes action"] --> S1["Action saved"]
        S1 --> G1["No notification feedback"]
    end

    subgraph Future["Target State"]
        U2["User completes action"] --> S2["Action saved"]
        S2 --> N2["Notification created"]
        N2 --> I2["In-app inbox"]
        N2 --> E2["Email digest"]
        N2 --> P2["Push optional"]
    end

    style G1 fill:#ff6b6b,stroke:#c92a2a,color:#fff
    style I2 fill:#51cf66,stroke:#2f9e44,color:#fff
```

### The Story: Closing the Feedback Loop

AutoNateAI already captures progress, activity attempts, and analytics. But when a student finishes a lesson or earns a streak, nothing **tells** them it happened. Notifications turn silent achievements into visible momentum — without adding new infrastructure unless it is required.

---

## Reuse-First Principles

| Principle                     | Reuse Target                                            | Why It Matters                                  |
| ---------------------------- | ------------------------------------------------------- | ----------------------------------------------- |
| **Shared JS Services**       | `data-service.js`, `auth.js`, `analytics-service.js`    | Consistent patterns, less duplication           |
| **Firestore-Centric Data**   | `users/{uid}/...` collections                            | Matches existing data model                     |
| **Client-First Rendering**   | Dashboard + lesson UI patterns                           | Minimal backend needs                           |
| **RBAC + Route Guard**       | Partner and admin access controls                        | Notifications should respect org boundaries     |
| **Event-Driven by Existing** | ProgressTracker + ActivityTracker events                | No new tracking system required                 |

---

## System Context

```mermaid
flowchart TB
    subgraph Users["Users"]
        U1["Students"]
        U2["Admins"]
        U3["Partners"]
    end

    subgraph Platform["AutoNateAI Platform"]
        subgraph Frontend["Static Frontend"]
            DB["Dashboard"]
            LES["Lessons"]
            AD["Admin Docs"]
        end

        subgraph SharedJS["Shared JS Layer"]
            AUTH["Auth Service"]
            DATA["Data Service"]
            PROG["Progress Tracker"]
            ACT["Activity Tracker"]
            ANA["Analytics Service"]
            NOTIF["Notification Service new"]
        end
    end

    subgraph Firebase["Firebase"]
        FS[(Firestore)]
        FBA["Firebase Auth"]
        FCF["Cloud Functions optional"]
    end

    Users --> Frontend
    Frontend --> SharedJS
    SharedJS --> Firebase

    style NOTIF fill:#7986cb,stroke:#3949ab,color:#fff
```

---

## Notification Sources (Reuse Existing Subsystems)

```mermaid
flowchart TB
    subgraph Sources["Existing Event Sources"]
        P1["ProgressTracker"]
        A1["ActivityTracker"]
        D1["DataService"]
        R1["RBAC"]
        AN1["AnalyticsService"]
    end

    subgraph Events["Event Types"]
        E1["Lesson Completed"]
        E2["Streak Updated"]
        E3["Quiz Mastery"]
        E4["Admin Announcement"]
        E5["Partner Course Access"]
    end

    P1 --> E1
    P1 --> E2
    A1 --> E3
    D1 --> E1
    D1 --> E2
    D1 --> E3
    R1 --> E5
    AN1 --> E2
    AN1 --> E3
    D1 --> E4
```

**Why reuse matters:** These subsystems already emit or detect the moments that matter. The notification layer should **listen** to existing events instead of creating new ones.

---

## Proposed Architecture (Minimal New Patterns)

```mermaid
flowchart TB
    subgraph Client["Client Side"]
        Event["Existing Event Fires"]
        NS["NotificationService new"]
        DS["DataService"]
        UI["Notification Center UI new"]
    end

    subgraph Firestore["Firestore"]
        NCol["users/{uid}/notifications/{id}"]
        Prefs["users/{uid}/notificationPrefs"]
        Templates["notificationTemplates/{id} optional"]
    end

    subgraph Delivery["Delivery"]
        InApp["In-app inbox"]
        Email["Email digest optional"]
        Push["Push optional"]
    end

    Event --> NS
    NS --> DS
    DS --> NCol
    DS --> Prefs
    NCol --> UI
    UI --> InApp

    NCol -->|if email enabled| Email
    NCol -->|if push enabled| Push
```

### The Story: Keep It Client-First

The first iteration keeps notifications **in-app only** by default. Email or push are **optional extensions** and only add backend work if truly necessary.

---

## Data Model (Firestore)

```mermaid
erDiagram
    User {
        string id PK "Auth uid"
    }

    Notification {
        string id PK "Auto-generated"
        string userId FK "Auth uid"
        string type "lesson_complete"
        string type "streak"
        string type "admin_announcement"
        string title "Display title"
        string body "Plain text"
        string source "progress"
        string source "activity"
        string source "admin"
        string relatedId "lessonId"
        string relatedId "courseId"
        string relatedId "announcementId"
        boolean read "true or false"
        timestamp createdAt
        timestamp seenAt
        object metadata "extra fields"
    }

    NotificationPreference {
        string userId PK
        boolean inApp "default true"
        boolean email "default false"
        boolean push "default false"
        object frequency "instant"
        object frequency "daily"
        object frequency "weekly"
        object topics "progress"
        object topics "streaks"
        object topics "admin"
    }

    User ||--o{ Notification : receives
    User ||--|| NotificationPreference : configures
```

---

## Delivery Flow (In-App)

```mermaid
sequenceDiagram
    participant U as User
    participant PT as ProgressTracker
    participant NS as NotificationService
    participant DS as DataService
    participant FS as Firestore
    participant UI as Notification Center

    U->>PT: Completes lesson
    PT->>NS: notify("lesson_completed", data)
    NS->>DS: createNotification(payload)
    DS->>FS: users/{uid}/notifications/{id}.set()
    FS-->>DS: Saved
    DS-->>NS: { id }
    NS-->>UI: updateInbox()
    UI-->>U: Shows "Lesson complete"
```

---

## Delivery Flow (Email Digest - Optional)

```mermaid
sequenceDiagram
    participant NS as NotificationService
    participant FS as Firestore
    participant CF as Cloud Function optional
    participant EM as Email Provider

    NS->>FS: write notification
    CF->>FS: query unread notifications
    CF->>EM: send daily digest
```

**Why optional:** Email introduces infrastructure (background jobs, templates, deliverability). It is only justified once in-app usage proves value.

---

## Reuse Patterns vs New Patterns

| Area                         | Reuse                                | New (Only If Necessary)                   | Necessity Trigger                          |
| ---------------------------- | ------------------------------------ | ----------------------------------------- | ------------------------------------------ |
| **Data Access**              | `DataService` write/read conventions | `createNotification()` method             | Single gateway for Firestore writes        |
| **User Identity**            | `AuthService`                        | None                                      | Already required for user scoping          |
| **Event Sources**            | Progress/Activity trackers           | `NotificationService`                    | Glue layer to normalize events             |
| **UI Pattern**               | Dashboard card layouts               | Notification Center panel                 | Visibility and read/unread management      |
| **Delivery**                 | In-app Firestore reads               | Cloud Function for email/push             | Cross-device + scheduled delivery          |
| **Templates**                | Simple inline strings                | `notificationTemplates` collection        | Multi-channel formatting reuse             |

---

## Subsystem Integration Map

```mermaid
flowchart TB
    subgraph Learning["Learning Subsystem"]
        PT["ProgressTracker"]
        AT["ActivityTracker"]
    end

    subgraph Growth["Growth Subsystem"]
        ANA["AnalyticsService"]
        ST["Streak Engine derived from data"]
    end

    subgraph Admin["Admin Subsystem"]
        ANN["Announcements"]
        RB["RBAC"]
    end

    NS["NotificationService new"]
    DS["DataService"]
    FS[(Firestore)]

    PT --> NS
    AT --> NS
    ST --> NS
    ANN --> NS
    RB --> NS

    NS --> DS --> FS
```

---

## Firestore Structure (Reuse Pattern)

```mermaid
flowchart TB
    subgraph Users["users/{uid}"]
        N["notifications/{notificationId}"]
        P["notificationPrefs"]
        CP["courseProgress/{courseId}"]
        LP["lessonProgress/{lessonId}"]
    end

    style N fill:#7986cb,stroke:#3949ab,color:#fff
    style P fill:#7986cb,stroke:#3949ab,color:#fff
```

**Why this structure:** It mirrors existing `courseProgress` and `lessonProgress` patterns, keeping notifications co-located with user data.

---

## Notification Types (Initial Set)

| Type                    | Trigger Source         | Channel   | Example Message                       |
| ----------------------- | ---------------------- | --------- | ------------------------------------- |
| Lesson Complete         | ProgressTracker        | In-app    | "Lesson complete: Origins ✅"         |
| Chapter Milestone       | DataService aggregate  | In-app    | "2/7 chapters complete — keep going!" |
| Streak Achieved         | Analytics/Derived      | In-app    | "3-day streak! 🔥"                     |
| Admin Announcement      | Admin Docs/RBAC        | In-app    | "New cohort starts Monday"            |
| Partner Access Granted  | RBAC                   | In-app    | "Access approved for Partner Course"  |

---

## Implementation Phases

```mermaid
gantt
    title Notification System Phases
    dateFormat  YYYY-MM-DD
    section Phase 1: In-App Only
    NotificationService + DataService method  :a1, 2026-01-14, 3d
    Notification Center UI                    :a2, after a1, 3d
    Lesson + Activity triggers                :a3, after a2, 2d
    section Phase 2: Preferences + Topics
    Notification prefs model                  :b1, after a3, 2d
    Topic filtering + read state              :b2, after b1, 2d
    section Phase 3: Optional Channels
    Email digest (Cloud Function)             :c1, after b2, 3d
    Push notifications (if needed)            :c2, after c1, 3d
```

---

## Key Decisions ✅

| Decision                       | Choice                                  | Rationale                                               |
| ----------------------------- | --------------------------------------- | ------------------------------------------------------- |
| **Default Channel**           | In-app only                              | Zero new infra; fastest feedback loop                   |
| **Data Location**             | `users/{uid}/notifications`              | Matches existing user-scoped collections                |
| **Service Pattern**           | `NotificationService` + `DataService`    | Same layering as progress + activity tracking           |
| **Event Integration**         | Listen to existing trackers               | Avoids a new event bus                                  |
| **Email/Push**                | Optional via Cloud Functions             | Only add when requirements demand cross-device delivery |

---

## Next Steps

1. **Add `NotificationService`** to `courses/shared/js/` following existing service patterns.
2. **Extend `DataService`** with `createNotification()` and `getNotifications()`.
3. **Create Notification Center UI** on dashboard using existing card styles.
4. **Wire triggers** from ProgressTracker and ActivityTracker.
5. **Ship Phase 1** and measure usage before adding new channels.
