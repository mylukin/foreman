# Autopilot Quick Start Guide | 快速开始指南

This guide will get you up and running with Autopilot in 30 minutes.

本指南将在30分钟内让您开始使用 Autopilot。

## Overview | 概述

Autopilot transforms this:

```
User: "Build a task management app"
```

Into this:

```
✅ 15 tasks completed
✅ 124/124 tests passing
✅ PR #123 created
🎉 Production-ready code delivered in 47 minutes
```

**Zero manual intervention after initial clarification.**

**初始澄清后零人工干预。**

---

## Installation | 安装 (5 minutes)

### Step 1: Clone Repository

```bash
cd ~/Projects
git clone https://github.com/mylukin/autopilot
cd autopilot
```

### Step 2: Link to Claude Code

```bash
ln -s ~/Projects/autopilot ~/.claude/plugins/autopilot
```

### Step 3: Verify Installation

```bash
# In Claude Code
/plugins

# Should show:
# autopilot (1.0.0) - Autonomous development from requirement to delivery
```

---

## Your First Autonomous Project | 第一个自主项目 (25 minutes)

### Example: Todo App

Open Claude Code and start a conversation:

```
/autopilot "Build a simple todo app with add/delete/complete tasks"
```

### What Happens Next

#### Phase 1: Clarification (2 minutes)

Autopilot asks you 3-5 questions:

```
🤔 Question 1/5: What type of application?
   A) Web app (React/Vue/Angular)
   B) Mobile app (React Native/Flutter)
   C) API backend only
   D) Full-stack (frontend + backend)

Your choice:
```

**You type:** `A`

```
🤔 Question 2/5: Core features to include?
   A) User authentication
   B) Data CRUD operations
   C) Real-time updates
   D) File uploads

Your choices (comma-separated):
```

**You type:** `B`

Continue answering 3 more questions...

#### Phase 2: Task Breakdown (1 minute)

Autopilot shows you the plan:

```
📋 Task Plan (8 tasks, est. 2.1 hours)

1. setup.scaffold        - Initialize project structure (15 min)
2. setup.dependencies    - Install dependencies (10 min)
3. todos.list.ui         - Create todo list component (20 min)
4. todos.add.ui          - Create add todo form (15 min)
5. todos.delete.ui       - Add delete button (10 min)
6. todos.complete.ui     - Add complete checkbox (10 min)
7. todos.styling         - Style components (20 min)
8. todos.tests           - Write tests (25 min)

Approve? (yes/no/modify)
```

**You type:** `yes`

#### Phase 3-5: Autonomous Implementation (2+ hours → 47 minutes with autopilot)

Sit back and watch:

```
✅ setup.scaffold completed (1/8)
   Duration: 3m 12s
   Files: package.json, tsconfig.json, src/ (created)
   Next: setup.dependencies

✅ setup.dependencies completed (2/8)
   Duration: 2m 45s
   Tests: N/A
   Next: todos.list.ui

✅ todos.list.ui completed (3/8)
   Duration: 4m 32s
   Tests: 8/8 passed ✓
   Coverage: 87%
   Files:
     - src/components/TodoList.tsx (new)
     - tests/components/TodoList.test.tsx (new)
   Next: todos.add.ui

⚠️  Error in todos.add.ui
    Module '@testing-library/react' not found

🔧 Auto-healing...
   Searching: "npm @testing-library/react install"
   Solution: npm install @testing-library/react @testing-library/jest-dom
   Applying...
   Verifying: npm test

✅ Healed successfully (1m 12s)

✅ todos.add.ui completed (4/8)
   Duration: 5m 44s (including 1m 12s healing)
   Tests: 6/6 passed ✓
   Next: todos.delete.ui

... (continues for all tasks) ...

📊 Progress Summary (100% complete)

   ✅ Completed: 8/8 tasks
   ⏱️  Time elapsed: 47m 23s
   🔧 Auto-fixes: 2 errors healed

🎯 Pre-Delivery Checklist

✅ All tasks completed (8/8)
✅ All tests passing (42/42)
✅ Test coverage: 89%
✅ TypeScript check passed
✅ ESLint passed (0 errors)
✅ Build successful
✅ Code review passed (2-stage)

🚀 DELIVERY COMPLETE

┌──────────────────────────────────────────────┐
│ 📦 Deliverable                               │
├──────────────────────────────────────────────┤
│ Commit:      a1b2c3d "feat: Add todo app"   │
│ Branch:      feature/todo-app               │
│ PR:          #456 (ready for review)        │
│ URL:         github.com/mylukin/autopilot/pull/456  │
├──────────────────────────────────────────────┤
│ 📊 Statistics                                │
├──────────────────────────────────────────────┤
│ Tasks:       8/8 completed                   │
│ Tests:       42/42 passing                   │
│ Coverage:    89%                             │
│ Duration:    47 minutes                      │
│ Auto-fixes:  2 errors healed                 │
└──────────────────────────────────────────────┘

Next steps:
1. Review PR: github.com/mylukin/autopilot/pull/456
2. Merge when approved
3. Deploy to production

Thank you for using Autopilot! 🎉
```

**Total user interactions: 7**
- 1 initial command
- 5 question answers
- 1 plan approval

**Total time saved: ~1.5 hours** (vs manual implementation)

---

## Commands Reference | 命令参考

### Start New Project

```bash
/autopilot "<your requirement>"

# Examples:
/autopilot "Build a blog with markdown support"
/autopilot "Create a REST API for user management"
/autopilot "Add dark mode to my app"
```

### Check Status

```bash
/autopilot status

# Output:
# Phase: IMPLEMENT (3/5)
# Progress: 7/15 tasks (47%)
# Current: auth.logout
# Elapsed: 23m 45s
# Estimated remaining: 27m
```

### Resume After Interruption

```bash
/autopilot resume

# Continues from where you left off
```

### Cancel Session

```bash
/autopilot cancel

# Cleans up and archives session
```

---

## Interruption & Resume | 中断与恢复

Autopilot saves state continuously. You can interrupt at ANY time:

**Press Ctrl+C or close Claude Code:**

```
⚠️  Session interrupted

Progress saved:
- Phase: IMPLEMENT
- Completed: 7/15 tasks
- Current: auth.logout

To resume:
  /autopilot resume
```

**Next session:**

```bash
/autopilot resume

# Output:
┌────────────────────────────────────┐
│ 🚀 AUTOPILOT SESSION RESUMED       │
├────────────────────────────────────┤
│ Phase:    IMPLEMENT                │
│ Progress: 7/15 tasks               │
│ Current:  auth.logout              │
├────────────────────────────────────┤
│ Resuming from task 8/15...         │
└────────────────────────────────────┘

✅ auth.logout completed (8/15)
...
```

---

## Configuration | 配置

### Custom Question Templates

Create custom questions for your domain:

```bash
# Create custom template
cat > .claude/autopilot/templates/questions-ecommerce.yml <<'EOF'
domain: ecommerce
questions:
  - id: payment_gateway
    text: "Which payment provider?"
    options:
      - A) Stripe
      - B) PayPal
      - C) Square
      - D) Custom integration

  - id: inventory_management
    text: "Inventory tracking?"
    options:
      - A) Yes, with low-stock alerts
      - B) Yes, basic tracking only
      - C) No inventory tracking
EOF

# Use in autopilot command
/autopilot "Build an ecommerce store" --template ecommerce
```

### TDD Mode

Control test-driven development enforcement:

```bash
# Strict TDD (tests required, enforced)
echo '{"metadata": {"tddMode": "strict"}}' > .claude/autopilot/config.json

# Recommended TDD (tests suggested, not enforced)
echo '{"metadata": {"tddMode": "recommended"}}' > .claude/autopilot/config.json

# Disabled TDD (no test requirements)
echo '{"metadata": {"tddMode": "disabled"}}' > .claude/autopilot/config.json
```

### Auto-Heal Settings

Configure error recovery:

```bash
cat > .claude/autopilot/config.json <<'EOF'
{
  "autoHeal": {
    "enabled": true,
    "maxRetries": 3,
    "webSearchEnabled": true,
    "escalateAfterFailures": true
  }
}
EOF
```

---

## Troubleshooting | 故障排除

### Issue: Autopilot command not found

**Solution:**

```bash
# Verify plugin is linked
ls -la ~/.claude/plugins/autopilot

# Should show symlink to ~/Projects/autopilot

# If not, re-link:
ln -s ~/Projects/autopilot ~/.claude/plugins/autopilot

# Restart Claude Code
```

### Issue: State file corrupted

**Solution:**

```bash
# Reset state
rm -rf .claude/autopilot/state.json

# Copy fresh template
cp ~/Projects/autopilot/workspace/.claude/autopilot/templates/state.json .claude/autopilot/

# Resume will start from scratch
```

### Issue: Task estimation way off

**Cause:** Task is too large (>30 min estimated).

**Solution:** Autopilot will automatically split it. If you see tasks taking >30 min, file an issue.

### Issue: Auto-healing fails repeatedly

**Cause:** Unknown error pattern or environment issue.

**Solution:**

1. Check `.claude/autopilot/debug.log` for details
2. Run the failed command manually to understand the error
3. Add the error pattern to `skills/phase-4-heal/error-patterns.yml`

Example:

```yaml
# skills/phase-4-heal/error-patterns.yml
NEW_ERROR_TYPE:
  pattern: "Your error regex here"
  severity: recoverable
  handler: your_handler_function
```

### Issue: Tests failing after implementation

**Cause:** Implementation doesn't match acceptance criteria.

**Solution:** Autopilot will mark task as failed. Check:

```bash
# View failed task details
jq '.failed' .claude/autopilot/state.json

# Read failure reason
cat .claude/autopilot/progress.log | grep -A 5 "task_id: failed.task"
```

Fix manually or adjust acceptance criteria in `tasks.json` and resume.

---

## Examples | 示例

### Example 1: Simple Counter App

```bash
/autopilot "Build a counter with increment and decrement buttons"

# Questions:
# 1. Web app (React)
# 2. No features needed
# 3. TypeScript + Node.js
# 4. Unit tests only
# 5. Local development

# Result: 4 tasks, 18 minutes, 12/12 tests passing
```

### Example 2: REST API

```bash
/autopilot "Create a REST API for blog posts with CRUD operations"

# Questions:
# 1. API backend only
# 2. CRUD operations
# 3. TypeScript + Node.js + PostgreSQL
# 4. Unit + integration tests
# 5. Docker containers

# Result: 12 tasks, 53 minutes, 48/48 tests passing
```

### Example 3: Full-Stack App

```bash
/autopilot "Build a task manager with user auth and real-time updates"

# Questions:
# 1. Full-stack (React + Node.js)
# 2. Authentication + CRUD + Real-time
# 3. TypeScript + Node.js + PostgreSQL
# 4. TDD strict mode
# 5. Cloud platform (AWS)

# Result: 28 tasks, 2h 15m, 156/156 tests passing
```

---

## Best Practices | 最佳实践

### 1. Be Specific in Requirements

❌ **Bad:** "Build an app"
✅ **Good:** "Build a todo app with add/delete/complete tasks"

❌ **Bad:** "Make it better"
✅ **Good:** "Add user authentication with JWT tokens"

### 2. Review the Task Plan

Always review the task breakdown before approving. Check:
- Are tasks atomic? (Each <30 min)
- Are dependencies correct?
- Is anything missing?

### 3. Let Autopilot Heal

Don't interrupt when you see errors. Autopilot will auto-heal:

```
⚠️  Error: Module 'bcrypt' not found
🔧 Auto-healing...

# Wait for healing to complete
# Success rate: ~86%
```

### 4. Review the PR

Even though code is auto-generated and reviewed:
- Check the PR description
- Review key implementation files
- Test locally before merging

### 5. Provide Feedback

If something goes wrong:
1. Check `.claude/autopilot/progress.log` for details
2. File an issue with the log excerpt
3. Help improve Autopilot for everyone!

---

## Next Steps | 后续步骤

1. ✅ Try the quick start example above
2. ✅ Experiment with different project types
3. ✅ Customize question templates for your domain
4. ✅ Read [IMPLEMENTATION_GUIDE.md](IMPLEMENTATION_GUIDE.md) to understand internals
5. ✅ Contribute improvements back to the project

---

**Happy autonomous coding! 🚀**

**愉快的自主编码！🚀**
