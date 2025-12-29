# Brittany's Workspace 🧠⚡

Welcome to your personal learning space! This folder is where all your projects, explorations, and assignments live.

## Your Background

- **Education**: Computer Science @ Davenport University (Grand Rapids)
- **Languages**: C#, HTML, CSS, JavaScript
- **Gap**: 3-5 years since active programming
- **Goal**: AI-augmented systems thinker & architect

## How It Works

```
bparker/
├── README.md              ← You are here
├── ROADMAP.md             ← Your learning path
├── 01-mental-models/      ← First assignment folder
│   ├── lesson.md          ← Concepts & diagrams
│   ├── notes.md           ← Your observations
│   └── code/              ← Your implementation
├── 02-next-module/        ← Future module
│   └── ...
└── ...
```

## Your Learning Philosophy

This isn't about writing mountains of code. It's about:

1. **Understanding concepts** → Variables are memory. Functions are habits. Classes are identity.
2. **Reading code fluently** → Like reading a book, you skim for structure, then dive into details
3. **Diagramming systems** → Mermaid diagrams make the invisible visible
4. **Thinking in systems** → See the whole, then the parts, then how they connect

## Workflow

### 1. Starting a Module

When you get a new card/assignment:

```bash
# Make sure you're up to date
git pull origin main

# Create a branch for this assignment
git checkout -b bparker/01-mental-models

# Navigate to your folder
cd bparker

# The lesson folder may already exist with a lesson.md
# Read it first, then create your work
cd 01-mental-models
```

> ⚠️ **Each assignment gets its own branch.** Never work directly on `main`.

### 2. Working on Your Content

Each module typically involves:

- Reading the `lesson.md` (concepts, diagrams, prompts)
- Creating your own `notes.md` with observations
- Building the deliverable (code, diagrams, documentation)

```bash
# Create your notes
touch notes.md

# Create a folder for your code if needed
mkdir code
```

### 3. Saving Your Progress

Commit early, commit often:

```bash
# Stage your changes
git add .

# Commit with a meaningful message
git commit -m "Complete mental models lesson - added flowchart diagram"

# Push to your branch
git push origin bparker/01-mental-models
```

### 4. Submitting for Review

When your work is ready:

1. Push your final commits to your branch
2. Open a **Pull Request** (PR) from your branch to `main`
3. Link the PR to your assignment card/issue
4. Request a review

### 5. Code Review & Merge

1. Nathan will review your PR and leave feedback
2. Make any requested changes and push new commits
3. Once approved, your PR gets merged into `main`
4. Delete your branch and pull the latest `main`

```bash
# After merge, clean up
git checkout main
git pull origin main
git branch -d bparker/01-mental-models
```

## Tips

- **Concept first, code second** → Understand _why_ before _how_
- **Diagrams are your superpower** → Use Mermaid everywhere
- **Read more than you write** → Study existing codebases
- **Connect to life** → Programming mirrors how your brain already works
- **Use AI as a partner** → You direct, AI assists, you verify

---

_From knowing code to thinking in systems. Let's level up._
