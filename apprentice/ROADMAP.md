# The AutoNateAI Apprentice's Path 🌟

_A 6-week quest to unlock the secrets of code._

---

## Prologue: You Have Been Chosen

Something inside you knows there's more.

You've used apps. You've played games. You've watched videos load and buttons click and magic happen on screens. But you've always wondered: **How does it actually work?**

Here's a secret most people never learn: computers aren't smart. They're incredibly fast and incredibly obedient — but they only do _exactly_ what someone tells them to do. That someone could be you.

The people who know how to speak to computers? They're called **coders**. And the best coders don't just write instructions — they **design entire worlds**.

You're about to become one of them.

This is your origin story.

---

## The Three Forces ⚡🪨🧲

Before you can code, you need to understand three forces that power every program ever made:

```
┌─────────────────────────────────────────────────────────┐
│                    THE THREE FORCES                      │
├─────────────────────────────────────────────────────────┤
│                                                          │
│   🪨 STONE         ⚡ LIGHTNING       🧲 MAGNETISM       │
│   Memory           Action             Connection         │
│                                                          │
│   Things that      Things that        Things that        │
│   REMEMBER         HAPPEN             CONNECT            │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

**🪨 Stone** is memory. When you save a game, that's Stone. When a website remembers your username, that's Stone. Variables in code? Stone.

**⚡ Lightning** is action. When you press a button and something happens, that's Lightning. Loops, functions, decisions — all Lightning.

**🧲 Magnetism** is connection. When your phone talks to the internet, that's Magnetism. When one part of your code uses another part, that's Magnetism.

Every program — every app, every game, every website — is just Stone, Lightning, and Magnetism working together.

Let's learn to control them.

---

## Your Quest Map

```
    WEEK 1          WEEK 2          WEEK 3
   🏔️ STONE    →   ⚡ LIGHTNING  →  🧲 MAGNETISM
   Variables        Loops &          Functions &
   & Data           Decisions        Connections
      │                │                  │
      ▼                ▼                  ▼
   [Secret          [Number           [Quiz
    Encoder]         Guesser]          Game]
                                          │
    ┌─────────────────────────────────────┘
    │
    ▼
 WEEK 4              WEEK 5           WEEK 6
 🏛️ ARCHITECTS  →   🔥 CAPSTONE I → 🌟 CAPSTONE II
 Diagrams &          Build a          Build with
 Big Picture         Story Game       AI Powers!
    │                   │                 │
    ▼                   ▼                 ▼
 [Dream App         [Adventure       [AI Chat
  Blueprint]         Game]            Helper]
```

---

## Chapter 1: The Stone Remembers 🪨

_Week 1_

> _"Before you can do anything, you must be able to remember something. The stone never forgets."_

### The Story

Imagine your brain had no memory. Every second, you'd forget everything — your name, where you are, what you were doing. You couldn't think at all!

Computers are the same. Before they can do anything useful, they need a way to **remember things**. In Python, we use **variables** to give the computer memory.

A variable is like a labeled box. You put something in the box, give it a name, and later you can ask "Hey, what's in the box called `score`?" and the computer remembers.

### The Concepts

**Variables** — Boxes with names that hold values

```python
# Creating variables (putting things in boxes)
player_name = "Alex"
score = 0
is_playing = True

# Using variables (looking in the boxes)
print("Welcome, " + player_name)
print("Your score is", score)
```

**Data Types** — Different kinds of things that fit in boxes

| Type             | What It Holds   | Example         |
| ---------------- | --------------- | --------------- |
| `str` (string)   | Text/words      | `"Hello World"` |
| `int` (integer)  | Whole numbers   | `42`            |
| `float`          | Decimal numbers | `3.14`          |
| `bool` (boolean) | True or False   | `True`          |

**Input** — Asking the user for information

```python
name = input("What is your name? ")
print("Hello, " + name + "!")
```

### 📝 The Trial

Answer these questions in your notes:

1. What is a variable?
2. What's the difference between `"42"` and `42`?
3. Why do we need different data types?
4. What does the `input()` function do?

### 🔨 Mini-Project: The Secret Encoder

**Your quest:** Build a program that encodes secret messages!

When you run it:

```
╔═══════════════════════════════════╗
║      🔐 SECRET ENCODER 🔐         ║
╠═══════════════════════════════════╣
║  1. Encode a message              ║
║  2. Decode a message              ║
║  3. Exit                          ║
╚═══════════════════════════════════╝

Enter your choice: 1
Enter your message: hello
Your secret code is: khoor
```

**How it works:**

- Each letter shifts forward by 3 (A→D, B→E, etc.)
- This is called a "Caesar Cipher" — Julius Caesar used it!

**Starter Code:**

```python
# Secret Encoder - Starter Code

def encode_message(message):
    """Shift each letter forward by 3"""
    encoded = ""
    for letter in message:
        if letter.isalpha():  # if it's a letter
            # Your code here: shift the letter
            pass
        else:
            encoded += letter  # keep spaces and symbols
    return encoded

def decode_message(message):
    """Shift each letter backward by 3"""
    # Your code here
    pass

# Main program
print("🔐 SECRET ENCODER 🔐")
# Your code here: make a menu and let user encode/decode
```

**Deliverables:**

- Working code in `your-folder/ch1-stone/encoder.py`
- Test it with a friend — can they decode your message?

---

## Chapter 2: Lightning Paths ⚡

_Week 2_

> _"Lightning doesn't think. It just DOES. It follows the path and strikes. Your code must learn to act."_

### The Story

You've taught the computer to remember. But a brain that only remembers is useless — it needs to **think** and **act**.

Lightning is about **action**:

- Making decisions ("if this, then that")
- Repeating things ("do this 10 times")
- Responding to what happens ("when the user clicks, do this")

This is where your code comes alive.

### The Concepts

**If Statements** — Making decisions

```python
age = int(input("How old are you? "))

if age >= 13:
    print("You can make an account!")
else:
    print("Sorry, you're too young.")
```

**Comparison Operators** — Asking questions

| Operator | Meaning          | Example           |
| -------- | ---------------- | ----------------- |
| `==`     | equals           | `score == 100`    |
| `!=`     | not equals       | `name != "admin"` |
| `>`      | greater than     | `age > 18`        |
| `<`      | less than        | `tries < 3`       |
| `>=`     | greater or equal | `points >= 50`    |
| `<=`     | less or equal    | `health <= 0`     |

**While Loops** — Repeating until something changes

```python
secret_number = 7
guess = 0

while guess != secret_number:
    guess = int(input("Guess the number: "))
    if guess < secret_number:
        print("Too low!")
    elif guess > secret_number:
        print("Too high!")

print("You got it! 🎉")
```

**For Loops** — Repeating a specific number of times

```python
# Count from 1 to 5
for i in range(1, 6):
    print(i)

# Loop through a list
colors = ["red", "green", "blue"]
for color in colors:
    print("I like " + color)
```

### 📝 The Trial

1. What's the difference between `=` and `==`?
2. When would you use a `while` loop vs a `for` loop?
3. What does `elif` mean?
4. What happens if your `while` condition is always True?

### 🔨 Mini-Project: The Number Guesser

**Your quest:** Build a number guessing game!

When you run it:

```
🎲 NUMBER GUESSER 🎲

I'm thinking of a number between 1 and 100...

Guess #1: 50
📉 Too low! Try higher.

Guess #2: 75
📈 Too high! Try lower.

Guess #3: 62
📉 Too low! Try higher.

Guess #4: 68
🎉 YOU GOT IT in 4 guesses!

Play again? (yes/no): yes
```

**Requirements:**

- Computer picks a random number (1-100)
- Player guesses until they get it
- Tell them "too high" or "too low"
- Count their guesses
- Ask if they want to play again

**Hint:** Use `import random` and `random.randint(1, 100)`

**Deliverables:**

- Working code in `your-folder/ch2-lightning/guesser.py`
- Can you add difficulty levels? (Easy: 1-10, Hard: 1-1000)

---

## Chapter 3: The Pull Between 🧲

_Week 3_

> _"Nothing exists alone. The magnet knows: power comes from connection."_

### The Story

You've got memory (Stone) and action (Lightning). But imagine if every time you wanted to do something, you had to write all the code from scratch. That would be exhausting!

Magnetism is about **connection** — pieces of code that work together. We call these pieces **functions**.

A function is like a machine: you put something in, it does its job, and something comes out. Once you build the machine, you can use it over and over.

### The Concepts

**Functions** — Reusable code machines

```python
# Creating a function (building the machine)
def greet(name):
    """Say hello to someone"""
    return "Hello, " + name + "!"

# Using the function (running the machine)
message = greet("Alex")
print(message)  # "Hello, Alex!"

message = greet("Jordan")
print(message)  # "Hello, Jordan!"
```

**Parameters & Return Values**

```python
def add(a, b):
    """Add two numbers together"""
    result = a + b
    return result

# Use it
total = add(5, 3)  # total is 8
```

**Lists** — Collections of things

```python
# A list of items
inventory = ["sword", "shield", "potion"]

# Add to the list
inventory.append("helmet")

# Get something from the list
first_item = inventory[0]  # "sword"

# How many items?
count = len(inventory)  # 4
```

**Dictionaries** — Labeled collections

```python
# A dictionary (like a mini-database)
player = {
    "name": "Alex",
    "health": 100,
    "level": 5
}

# Get a value
print(player["name"])  # "Alex"

# Change a value
player["health"] = 80
```

### 📝 The Trial

1. Why are functions useful?
2. What's the difference between a list and a dictionary?
3. What does `return` do in a function?
4. How do you get the 3rd item from a list?

### 🔨 Mini-Project: The Quiz Game

**Your quest:** Build a quiz game with multiple questions and scoring!

When you run it:

```
🧠 QUIZ MASTER 🧠

Category: Science

Question 1 of 5:
What planet is closest to the sun?
A) Venus
B) Mercury
C) Mars
D) Earth

Your answer: B
✅ Correct! +10 points

Question 2 of 5:
What gas do plants breathe in?
A) Oxygen
B) Nitrogen
C) Carbon Dioxide
D) Helium

Your answer: A
❌ Wrong! The answer was C) Carbon Dioxide

... (more questions) ...

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🏆 FINAL SCORE: 40/50 points
   Grade: B (80%)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**Requirements:**

- At least 5 questions
- Multiple choice (A, B, C, D)
- Track score
- Show final results with percentage
- Use functions! (e.g., `ask_question()`, `calculate_grade()`)

**Challenge:** Store questions in a list of dictionaries!

```python
questions = [
    {
        "question": "What planet is closest to the sun?",
        "options": ["Venus", "Mercury", "Mars", "Earth"],
        "answer": "B"
    },
    # more questions...
]
```

**Deliverables:**

- Working code in `your-folder/ch3-magnetism/quiz.py`
- At least 5 questions on a topic you like

---

## Chapter 4: The Age of Architects 🏛️

_Week 4_

> _"Builders lay bricks. Architects design cities. Which will you be?"_

### The Story

Here's a secret that will change everything:

**You don't have to write all your code anymore.**

There are now AI tools — like having a super-smart assistant — that can write code for you. Sounds like cheating? It's not. It's the future.

But here's the catch: AI can write code, but it can't **think**. It doesn't know what you're trying to build or why. That's YOUR job.

The people who just type code? They're being replaced by AI.

The people who can **design systems** and **tell AI what to build**? They're more powerful than ever.

You're not training to be a code typist. You're training to be an **architect**.

### The New Skills

```
OLD WAY                    NEW WAY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Memorize syntax        →   Understand concepts
Type code fast         →   Communicate clearly
Write everything       →   Direct AI to write
Fix bugs alone         →   Review AI's work
```

### Diagrams: How Architects Communicate

Architects don't write code first. They draw **blueprints**.

In our world, blueprints are called **diagrams**. When you can draw what you want to build, you can:

1. Think more clearly about your project
2. Explain it to other people
3. Tell AI exactly what to create

**The Box-and-Arrow Diagram**

This is the simplest kind. Boxes are _things_. Arrows show _how they connect_.

```
┌─────────────┐         ┌─────────────┐
│    USER     │ ──────► │    GAME     │
│  (player)   │         │  (your app) │
└─────────────┘         └─────────────┘
                              │
                              ▼
                        ┌─────────────┐
                        │   SCORE     │
                        │  (storage)  │
                        └─────────────┘
```

**The Flowchart**

Shows steps and decisions.

```
        ┌─────────────┐
        │    START    │
        └──────┬──────┘
               │
               ▼
        ┌─────────────┐
        │ Ask question│
        └──────┬──────┘
               │
               ▼
          ┌────────┐
         ╱ Answer   ╲    YES    ┌──────────┐
        ▕  correct?  ▏ ───────► │ Add point│
         ╲          ╱           └────┬─────┘
          └────┬───┘                 │
               │ NO                  │
               ▼                     │
        ┌─────────────┐             │
        │ Show answer │◄────────────┘
        └──────┬──────┘
               │
               ▼
          ┌────────┐
         ╱  More    ╲    YES
        ▕ questions? ▏ ───────► (back to "Ask question")
         ╲          ╱
          └────┬───┘
               │ NO
               ▼
        ┌─────────────┐
        │ Show score  │
        └─────────────┘
```

### 📝 The Trial

1. Why is designing more important than typing code?
2. What's the difference between a builder and an architect?
3. How can a diagram help you before you start coding?
4. What job does AI do? What job do YOU do?

### 🔨 Mini-Project: The System Canvas

**Your quest:** Design your dream app — WITHOUT writing any code yet!

**Step 1: Choose Your Dream App**

What would you build if you could build anything?

- A game you've always wanted
- An app to solve a problem
- Something to help your family or friends
- A tool for your hobby

**Step 2: Draw Three Diagrams**

On paper or digitally, create:

1. **The User Journey** (flowchart)

   - What does someone do when they use your app?
   - Draw every screen and decision

2. **The Parts** (box diagram)

   - What are the main pieces of your app?
   - How do they connect?

3. **The Data** (what needs to be remembered)
   - What information does your app store?
   - Where does it come from?

**Step 3: Write a Description**

In 1 page, explain:

- What does your app do?
- Who would use it?
- Why is it useful?
- What are the main features?

**Step 4: Ask AI for Help**

Take ONE small feature from your app. Describe it clearly to an AI tool and ask it to help you code it. Notice:

- How clear did you have to be?
- What did it get right?
- What did you have to fix?

**Deliverables:**

- Your 3 diagrams (photos or digital)
- Your 1-page description
- A small code snippet AI helped you write

---

## Capstone I: The Adventure Game 🔥

_Week 5_

> _"All forces unite. Stone holds the world. Lightning drives the action. Magnetism binds it together. Now... CREATE."_

### The Quest

Build a **text-based adventure game** where the player makes choices and the story changes based on their decisions.

```
═══════════════════════════════════════════════════════
             🏰 THE CURSED CASTLE 🏰
═══════════════════════════════════════════════════════

You stand at the entrance of an ancient castle.
The wooden doors creak in the wind.
A strange mist swirls around your feet.

What do you do?
  1. Push open the doors and enter
  2. Walk around to find another entrance
  3. Call out to see if anyone is there

> 1

You push open the heavy doors...
They groan loudly, echoing through the halls.
Inside, you see two passages: one lit by torches,
one dark and cold.

What do you do?
  1. Take the lit passage
  2. Take the dark passage
  3. Search the entrance hall first

> _
```

### Requirements

**Stone (Memory):**

- Track player stats (health, inventory, score)
- Remember choices they've made
- Save/load game progress (BONUS)

**Lightning (Action):**

- At least 3 different endings
- Random events (dice rolls, chance encounters)
- Combat or challenges with win/lose outcomes

**Magnetism (Connection):**

- Functions for each room/scene
- A clear structure connecting scenes
- Reusable code for common actions

### Your Story

Create your OWN story! Ideas:

- A haunted house escape
- A space exploration mission
- A mystery to solve
- A journey through a magical forest
- A superhero origin story

### Starter Structure

```python
# Adventure Game Structure

def show_intro():
    """Display the game introduction"""
    print("=" * 50)
    print("       YOUR GAME TITLE HERE")
    print("=" * 50)
    # Your intro text...

def scene_start(player):
    """The first scene of your game"""
    print("\nYou are at the beginning...")
    print("What do you do?")
    print("  1. Option A")
    print("  2. Option B")

    choice = input("> ")

    if choice == "1":
        return scene_a(player)
    elif choice == "2":
        return scene_b(player)
    else:
        print("Invalid choice. Try again.")
        return scene_start(player)

def scene_a(player):
    """Scene A of your game"""
    # Your code here
    pass

def scene_b(player):
    """Scene B of your game"""
    # Your code here
    pass

# Main game
player = {
    "name": "",
    "health": 100,
    "inventory": [],
    "score": 0
}

player["name"] = input("Enter your name, adventurer: ")
show_intro()
scene_start(player)
```

### Deliverables

```
your-folder/capstone-1-adventure/
├── game.py              # Your main game code
├── README.md            # How to play + your story outline
└── FLOWCHART.md         # Diagram of your story branches
```

**Present your game to the class! Let others play it.**

---

## Capstone II: The AI Helper 🌟

_Week 6_

> _"The ancient ones could only dream of this power. You will wield it."_

### The Quest

Build a program that uses **AI** to help with something real.

This is the final test: Can you combine everything you've learned AND work with AI as your partner?

### Choose Your Helper

**Option A: Homework Helper**

- User enters a topic they're studying
- AI explains it simply
- AI generates practice questions
- Tracks what topics they've studied

**Option B: Story Writer**

- User gives a prompt (characters, setting, genre)
- AI generates a short story
- User can ask for changes
- Save favorite stories

**Option C: Code Explainer**

- User pastes code they don't understand
- AI explains what it does line by line
- AI suggests improvements
- Keep a history of explained code

**Option D: Your Idea**

- Propose your own AI helper
- Must take input, use AI, give useful output
- Get approval first!

### How to Use AI in Python

You'll use an API (a way for your code to talk to AI):

```python
# Example structure (simplified)

def ask_ai(question):
    """Send a question to AI and get an answer"""
    # This is where we connect to AI
    # Your instructor will show you how to set this up
    pass

def main():
    print("🤖 AI HELPER 🤖")
    print("What do you need help with?")

    user_question = input("> ")

    print("\nThinking...")
    answer = ask_ai(user_question)

    print("\nAI says:")
    print(answer)

main()
```

### Requirements

**Stone:**

- Save conversation history
- Remember user preferences
- Store useful responses

**Lightning:**

- Clear menu system
- Handle errors (what if AI doesn't respond?)
- Let users continue chatting

**Magnetism:**

- Connect to AI API
- Clean functions for each feature
- User-friendly interface

### Deliverables

```
your-folder/capstone-2-ai-helper/
├── helper.py            # Your main program
├── README.md            # What it does + how to use it
└── REFLECTION.md        # What you learned about AI
```

**Present:** Show your AI helper to the class. Explain what it does and how you built it.

---

## Epilogue: You Are No Longer an Apprentice

Six weeks ago, you knew nothing about code.

Now look at what you've built:

- A secret message encoder
- A number guessing game
- A quiz game
- The blueprint for your dream app
- A complete adventure game
- An AI-powered helper

You understand Stone, Lightning, and Magnetism. You know how to design before you build. You know how to work WITH AI, not just watch it work.

You're not an apprentice anymore.

You're a **Coder**. An **Architect-in-Training**. A **Builder of Digital Worlds**.

The question isn't "can I code?" anymore.

The question is: **"What will I create next?"**

---

## Progress Tracker

| Week | Chapter               | Project        | Status |
| ---- | --------------------- | -------------- | ------ |
| 1    | The Stone Remembers   | Secret Encoder | ⬜     |
| 2    | Lightning Paths       | Number Guesser | ⬜     |
| 3    | The Pull Between      | Quiz Game      | ⬜     |
| 4    | The Age of Architects | System Canvas  | ⬜     |
| 5    | **Capstone I**        | Adventure Game | ⬜     |
| 6    | **Capstone II**       | AI Helper      | ⬜     |

---

## Quick Reference

### Python Cheat Sheet

```python
# VARIABLES (Stone)
name = "Alex"           # string (text)
age = 12                # integer (whole number)
height = 5.2            # float (decimal)
is_student = True       # boolean (true/false)

# INPUT/OUTPUT
name = input("What's your name? ")
print("Hello,", name)

# IF STATEMENTS (Lightning)
if score >= 90:
    print("A")
elif score >= 80:
    print("B")
else:
    print("Keep trying!")

# LOOPS (Lightning)
for i in range(5):      # 0, 1, 2, 3, 4
    print(i)

while playing:
    # keep going until playing is False
    pass

# FUNCTIONS (Magnetism)
def greet(name):
    return "Hello, " + name

message = greet("Alex")

# LISTS (Magnetism)
fruits = ["apple", "banana", "cherry"]
fruits.append("date")   # add item
first = fruits[0]       # get item
count = len(fruits)     # count items

# DICTIONARIES (Magnetism)
person = {"name": "Alex", "age": 12}
print(person["name"])   # get value
person["age"] = 13      # change value
```

---

_The stone remembers. The lightning strikes. The magnetism connects. And you... you CREATE._
