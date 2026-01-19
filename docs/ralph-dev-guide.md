# Ralph-dev User Guide

Complete guide for using the `/ralph-dev` command - the autonomous end-to-end development system.

## Table of Contents

- [Overview](#overview)
- [Quick Start](#quick-start)
- [Usage](#usage)
- [Workflow](#workflow)
- [Expected Output](#expected-output)
- [Files Created](#files-created)
- [Configuration](#configuration)
- [Tips & Best Practices](#tips--best-practices)
- [Error Handling](#error-handling)
- [Examples](#examples)
- [See Also](#see-also)

---

## Overview

Ralph-dev transforms a single requirement into production-ready, tested code through a 5-phase workflow with zero manual intervention.

**Key Features:**

- **Autonomous**: Minimal user intervention after initial clarification
- **Test-Driven**: Enforces TDD workflow for all implementations
- **Self-Healing**: Automatically fixes errors using WebSearch
- **Resumable**: Continue from where you left off after interruptions
- **Production-Ready**: Includes tests, type checking, linting, and code review

---

## Quick Start

### Start a New Development Session

```bash
/ralph-dev "Build a task management app with user authentication"
```

### Resume After Interruption

```bash
/ralph-dev resume
```

### Check Current Status

```bash
/ralph-dev status
```

### Cancel Active Session

```bash
/ralph-dev cancel
```

---

## Usage

### Command Syntax

```bash
/ralph-dev "<requirement>" [--mode=<new|resume|status|cancel>]
```

### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `<requirement>` | string | Yes (for new) | User requirement description |
| `--mode` | string | No | Mode: `new` (default), `resume`, `status`, `cancel` |

### Alternative Syntax

You can omit `--mode=` and just use the mode name:

```bash
/ralph-dev resume
/ralph-dev status
/ralph-dev cancel
```

---

## Workflow

When you run `/ralph-dev "<requirement>"`, the system executes 5 phases:

### Phase 1: CLARIFY (Interactive)

🤔 **Asks 3-5 structured questions** to understand requirements:

**Example Question:**

```text
┌─────────────────────────────────────────────────────────┐
│ Question 1/5: What type of application do you want to   │
│               build?                                     │
├─────────────────────────────────────────────────────────┤
│ [App Type]                                              │
│                                                          │
│  ○ Web app (Recommended)                                │
│    React/Vue/Angular frontend with responsive design    │
│                                                          │
│  ○ Mobile app                                           │
│    React Native or Flutter for iOS and Android          │
│                                                          │
│  ○ API backend                                          │
│    REST or GraphQL API without frontend interface       │
│                                                          │
│  ○ Full-stack                                           │
│    Integrated frontend and backend in single project    │
│                                                          │
│  ○ Other (specify)                                      │
└─────────────────────────────────────────────────────────┘
```

After all questions answered → Generates **Product Requirements Document (PRD)**

### Phase 2: BREAKDOWN (Autonomous)

📋 **Breaks down into atomic tasks** (max 30 min each):

```text
📋 Task Plan (15 tasks, est. 2.5 hours)

1. setup.scaffold        - Initialize project (15 min)
2. setup.dependencies    - Install deps (10 min)
3. auth.login.ui         - Login form (25 min)
4. auth.login.api        - Login endpoint (30 min)
...

Approve? (yes/no/modify)
```

**User approves** → Proceeds to implementation

### Phase 3: IMPLEMENT (Autonomous Loop)

⚡ **Implements each task with TDD**:

```text
✅ auth.login.ui completed (3/15)
   Duration: 4m 32s
   Tests: 8/8 passed ✓
   Coverage: 87%
   Next: auth.login.api

⚠️  Error in auth.login.api
    Module 'bcrypt' not found
🔧 Auto-healing...
✅ Healed successfully (1m 12s)

📊 Progress (60% complete)
   ✅ Completed: 9/15 tasks
   ⏱️  Remaining: ~45m
   🔧 Auto-fixes: 3 errors healed
```

### Phase 4: HEAL (On-Demand)

🔧 **Auto-fixes errors** using WebSearch:

- Searches for error solutions
- Applies fix automatically
- Reruns tests
- Continues if successful
- Max 3 retry attempts

### Phase 5: DELIVER (Final Verification)

🚀 **Quality gates and delivery**:

```text
🎯 Pre-Delivery Checklist

✅ All tasks completed (15/15)
✅ All tests passing (124/124)
✅ TypeScript check passed
✅ ESLint passed (0 errors)
✅ Build successful
✅ Code review passed

🚀 DELIVERY COMPLETE
   Commit: abc123f "feat: Add task management"
   PR: #123 (ready for review)
   URL: github.com/user/repo/pull/123
```

---

## Expected Output

### Successful Completion

```markdown
🚀 DELIVERY COMPLETE

┌──────────────────────────────────────────────┐
│ 📦 Deliverable                               │
├──────────────────────────────────────────────┤
│ Commit:      abc123f "feat: Add feature"    │
│ Branch:      feature/task-management        │
│ PR:          #456 (ready for review)        │
│ URL:         github.com/user/repo/pull/456  │
├──────────────────────────────────────────────┤
│ 📊 Statistics                                │
├──────────────────────────────────────────────┤
│ Tasks:       15/15 completed                 │
│ Tests:       124/124 passing                 │
│ Coverage:    87%                             │
│ Duration:    47 minutes                      │
│ Auto-fixes:  2 errors healed                 │
└──────────────────────────────────────────────┘

Next steps:
1. Review PR: github.com/user/repo/pull/456
2. Merge when approved
3. Deploy to production

Thank you for using Ralph-dev! 🎉
```

### Status Output

```markdown
📊 Ralph-dev Status

Phase:    implement (3/5)
Progress: 9/15 tasks completed (60%)
Current:  auth.password-reset
Elapsed:  28 minutes
Estimated remaining: ~20 minutes

Recent completed:
  ✅ auth.login.ui
  ✅ auth.login.api
  ✅ auth.logout

Auto-fixes: 3 errors healed
```

---

## Files Created

During execution, Ralph-dev creates these files in `.ralph-dev/`:

```text
.ralph-dev/
├── state.json              # Current phase and progress
├── prd.md                  # Product Requirements Document
├── tasks/                  # Modular task storage
│   ├── index.json         # Task index
│   ├── setup/
│   │   └── scaffold.md    # Task: setup.scaffold
│   └── auth/
│       ├── login.ui.md    # Task: auth.login.ui
│       └── login.api.md   # Task: auth.login.api
└── progress.log            # Audit trail
```

---

## Configuration

Ralph-dev respects these settings in `.ralph-dev/tasks/index.json`:

```json
{
  "metadata": {
    "tddMode": "strict",
    "languageConfig": {
      "language": "typescript",
      "verifyCommands": [
        "npm run type-check",
        "npm run lint",
        "npm test",
        "npm run build"
      ]
    }
  }
}
```

**Configuration Options:**

- `tddMode`: `"strict"` (write tests first) or `"flexible"` (tests after implementation)
- `languageConfig.language`: Detected or manually specified language/framework
- `languageConfig.verifyCommands`: Commands to run for quality checks

---

## Tips & Best Practices

### Writing Good Requirements

✅ **Good:**

- "Build a task management app with user authentication"
- "Add dark mode toggle to the settings page"
- "Implement password reset via email with 24-hour expiry"

❌ **Bad:**

- "Make it better" (too vague)
- "Fix the bug" (use debugging tools, not ralph-dev)
- "Refactor everything" (too broad, specify what to refactor)

### When to Use Ralph-dev

✅ **Use when:**

- Building new features
- Adding complete functionality
- Creating new projects
- Implementing well-defined requirements

❌ **Don't use when:**

- Debugging existing code (use systematic-debugging)
- Small fixes (<30 min work)
- Exploring/researching
- Requirements are unclear (clarify first manually)

### Resume After Interruption

If interrupted (network issue, timeout, etc.), simply run:

```bash
/ralph-dev resume
```

Ralph-dev will continue from the last saved state.

### Monitoring Progress

Use the status command to check progress without interrupting execution:

```bash
/ralph-dev status
```

---

## Error Handling

| Situation | Behavior |
|-----------|----------|
| User cancels during clarify | Save state, show resume command |
| User rejects task plan | Exit gracefully, state saved |
| Implementation error | Auto-heal (max 3 attempts) → Mark failed if can't fix |
| All tasks failed | Show summary, keep state for resume |
| Verification fails | Show errors, keep state for manual fix |

**Auto-Healing Process:**

1. Error detected during implementation
2. Search for solution using WebSearch
3. Apply fix automatically
4. Rerun tests/verification
5. If successful: Continue to next task
6. If failed after 3 attempts: Mark task as failed, continue to next

---

## Examples

### Example 1: New Web App

```bash
User: /ralph-dev "Build a blog platform with markdown support and comments"

Ralph-dev:
🚀 Starting Ralph-dev...
Phase 1/5: Clarifying requirements...

┌─────────────────────────────────────────────────────────┐
│ Question 1/5: What type of application do you want to   │
│               build?                                     │
├─────────────────────────────────────────────────────────┤
│ [App Type]                                              │
│  ● Web app (Recommended) ✓ Selected                    │
└─────────────────────────────────────────────────────────┘

[... 4 more questions answered ...]

✅ PRD generated
Phase 2/5: Breaking down into tasks...
[... shows 23 tasks ...]

User: yes

Phase 3/5: Implementing tasks...
✅ setup.nextjs completed (1/23)
✅ setup.markdown completed (2/23)
[...]
```

### Example 2: Add Feature to Existing Project

```bash
User: /ralph-dev "Add user profile page with avatar upload and bio editing"

Ralph-dev:
🚀 Starting Ralph-dev...

Phase 0/5: Detecting project configuration...
✅ Detected: TypeScript + React + Vite

Phase 1/5: Clarifying requirements...
[... questions about profile page details ...]
```

### Example 3: Resume Interrupted Session

```bash
User: /ralph-dev resume

Ralph-dev:
┌────────────────────────────────────┐
│ 🚀 RALPH-DEV SESSION RESUMED       │
├────────────────────────────────────┤
│ Phase:    implement (3/5)          │
│ Progress: 9/15 tasks               │
│ Current:  auth.password-reset      │
├────────────────────────────────────┤
│ Resuming...                        │
└────────────────────────────────────┘

Continuing implementation...
✅ auth.password-reset completed (10/15)
[...]
```

### Example 4: Check Status

```bash
User: /ralph-dev status

Ralph-dev:
📊 Ralph-dev Status

Session ID:   ralph-20260119-142301
Phase:        implement (3/5)
Progress:     9/15 tasks completed (60%)
Current Task: auth.password-reset.api
Started:      14:23:01
Elapsed:      28 minutes
Est. Remaining: ~20 minutes

Recently Completed:
  ✅ auth.login.ui (4m 32s)
  ✅ auth.login.api (6m 45s)
  ✅ auth.logout (2m 18s)

Auto-Healing:
  🔧 3 errors fixed automatically

Next Tasks:
  ⏳ auth.profile.ui
  ⏳ auth.profile.api
  ⏳ dashboard.setup
```

### Example 5: Cancel Session

```bash
User: /ralph-dev cancel

Ralph-dev:
🛑 Cancelling Ralph-dev session...

Session archived to: .ralph-dev/archive/2026-01-19-142301/

Summary:
  Phase:     implement (3/5)
  Completed: 9/15 tasks
  Duration:  28 minutes

Completed tasks have been preserved.
You can review the work in the archive directory.

To start a new session, run:
  /ralph-dev "<new-requirement>"
```

---

## See Also

- `/detect-language` - AI language detection
- `/systematic-debugging` - Debug existing code
- `/code-review` - Review code quality
- `/tdd-enforcer` - Enforce TDD workflow

---

## Advanced Usage

### Custom Verification Commands

Edit `.ralph-dev/tasks/index.json` to customize verification:

```json
{
  "metadata": {
    "languageConfig": {
      "language": "python",
      "verifyCommands": [
        "pytest --cov",
        "mypy .",
        "black --check .",
        "pylint src/"
      ]
    }
  }
}
```

### Integration with CI/CD

Ralph-dev generated code includes:

- All tests passing locally
- Type checking passed
- Linting passed
- Build successful

This ensures CI/CD pipelines are likely to pass on first try.

---

## Troubleshooting

### "No active session" Error

**Problem:** Trying to resume/status/cancel when no session exists

**Solution:** Start a new session with `/ralph-dev "<requirement>"`

### Session State Corrupted

**Problem:** `.ralph-dev/state.json` is corrupted

**Solution:**

```bash
# Backup current state
mv .ralph-dev .ralph-dev.backup

# Start fresh session
/ralph-dev "<requirement>"
```

### Auto-Healing Not Working

**Problem:** Errors not being fixed automatically

**Possible Causes:**

- WebSearch rate limited
- Error too complex for auto-fix
- Network connectivity issues

**Solution:** Let ralph-dev mark task as failed, then manually review and fix

---

**Built with ❤️ for the Claude Code community**

For issues or feedback, visit: [ralph-dev repository](https://github.com/mylukin/ralph-dev)
