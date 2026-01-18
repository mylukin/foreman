---
name: autopilot
description: Start autonomous end-to-end development from requirement to production-ready code
usage: /autopilot "<requirement>" [--mode=<new|resume|status|cancel>]
examples:
  - /autopilot "Build a task management app with user authentication"
  - /autopilot "Add dark mode toggle to the application"
  - /autopilot --mode=resume
  - /autopilot --mode=status
---

# /autopilot Command

## Description | 描述

Start the Autopilot autonomous development system. Transforms a single requirement into production-ready, tested code through a 5-phase workflow with zero manual intervention.

启动 Autopilot 自主开发系统。通过 5 阶段工作流将单个需求转化为生产就绪的、经过测试的代码，零人工干预。

---

## Usage | 使用方法

### Start New Session | 开始新会话

```bash
/autopilot "<requirement>"
```

**Examples:**
```bash
/autopilot "Build a task management app with user authentication"
/autopilot "Add user profile page with avatar upload"
/autopilot "Implement password reset via email"
/autopilot "Create REST API for product catalog"
```

### Resume Session | 恢复会话

```bash
/autopilot --mode=resume
# or
/autopilot resume
```

Resumes the last autopilot session from where it stopped.

### Check Status | 检查状态

```bash
/autopilot --mode=status
# or
/autopilot status
```

Shows current autopilot session status and progress.

### Cancel Session | 取消会话

```bash
/autopilot --mode=cancel
# or
/autopilot cancel
```

Cancels the current autopilot session and archives the workspace.

---

## Parameters | 参数

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `requirement` | string | Yes (for new) | User requirement description |
| `--mode` | string | No | Mode: `new` (default), `resume`, `status`, `cancel` |

---

## Workflow | 工作流程

When you run `/autopilot "<requirement>"`, the system executes 5 phases:

### Phase 1: CLARIFY (Interactive) | 澄清阶段（交互式）

🤔 **Asks 3-5 structured questions** to understand requirements:

```
Question 1/5: What type of application?
   A) Web app (React/Vue/Angular)
   B) Mobile app (React Native/Flutter)
   C) API backend only
   D) Full-stack (frontend + backend)

Your choice: _
```

After all questions answered → Generates **Product Requirements Document (PRD)**

### Phase 2: BREAKDOWN (Autonomous) | 分解阶段（自主）

📋 **Breaks down into atomic tasks** (max 30 min each):

```
📋 Task Plan (15 tasks, est. 2.5 hours)

1. setup.scaffold        - Initialize project (15 min)
2. setup.dependencies    - Install deps (10 min)
3. auth.login.ui         - Login form (25 min)
4. auth.login.api        - Login endpoint (30 min)
...

Approve? (yes/no/modify)
```

**User approves** → Proceeds to implementation

### Phase 3: IMPLEMENT (Autonomous Loop) | 实现阶段（自主循环）

⚡ **Implements each task with TDD**:

```
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

### Phase 4: HEAL (On-Demand) | 修复阶段（按需）

🔧 **Auto-fixes errors** using WebSearch:

- Searches for error solutions
- Applies fix automatically
- Reruns tests
- Continues if successful
- Max 3 retry attempts

### Phase 5: DELIVER (Final Verification) | 交付阶段（最终验证）

🚀 **Quality gates and delivery**:

```
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
   URL: github.com/mylukin/autopilot/pull/123
```

---

## Expected Output | 预期输出

### Successful Completion

```markdown
🚀 DELIVERY COMPLETE

┌──────────────────────────────────────────────┐
│ 📦 Deliverable                               │
├──────────────────────────────────────────────┤
│ Commit:      abc123f "feat: Add feature"    │
│ Branch:      feature/task-management        │
│ PR:          #456 (ready for review)        │
│ URL:         github.com/mylukin/autopilot/pull/456  │
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
1. Review PR: github.com/mylukin/autopilot/pull/456
2. Merge when approved
3. Deploy to production

Thank you for using Autopilot! 🎉
```

### Status Output

```markdown
📊 Autopilot Status

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

## Implementation | 实现

This command delegates to the `autopilot-orchestrator` skill:

```markdown
Use Skill tool to invoke:
  skill: "autopilot-orchestrator"
  args: "<user-requirement>"
```

The orchestrator skill handles:
1. State initialization
2. Language detection (if needed)
3. Sequential phase execution
4. Error handling and recovery
5. Progress reporting
6. Session persistence

---

## Files Created | 创建的文件

During execution, Autopilot creates these files in `workspace/ai/`:

```
workspace/ai/
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

## Error Handling | 错误处理

| Situation | Behavior |
|-----------|----------|
| User cancels during clarify | Save state, show resume command |
| User rejects task plan | Exit gracefully, state saved |
| Implementation error | Auto-heal (max 3 attempts) → Mark failed if can't fix |
| All tasks failed | Show summary, keep state for resume |
| Verification fails | Show errors, keep state for manual fix |

---

## Configuration | 配置

Autopilot respects these settings in `workspace/ai/tasks/index.json`:

```json
{
  "metadata": {
    "tddMode": "strict",
    "languageConfig": {
      "language": "typescript",
      "verifyCommands": [...]
    }
  }
}
```

---

## Tips | 提示

### Writing Good Requirements

✅ **Good:**
- "Build a task management app with user authentication"
- "Add dark mode toggle to the settings page"
- "Implement password reset via email with 24-hour expiry"

❌ **Bad:**
- "Make it better" (too vague)
- "Fix the bug" (use debugging tools, not autopilot)
- "Refactor everything" (too broad, specify what to refactor)

### When to Use Autopilot

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
/autopilot resume
```

Autopilot will continue from the last saved state.

---

## See Also | 相关命令

- `/detect-language` - AI language detection
- `/systematic-debugging` - Debug existing code
- `/code-review` - Review code quality
- `/tdd-enforcer` - Enforce TDD workflow

---

## Examples | 示例

### Example 1: New Web App

```bash
User: /autopilot "Build a blog platform with markdown support and comments"

Autopilot:
🚀 Starting Autopilot...
Phase 1/5: Clarifying requirements...

Question 1/5: What type of frontend?
   A) React with Next.js
   B) Vue with Nuxt
   C) Vanilla JS
   D) Static HTML

User: A

[... 4 more questions ...]

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
User: /autopilot "Add user profile page with avatar upload and bio editing"

Autopilot:
🚀 Starting Autopilot...

Phase 0/5: Detecting project configuration...
✅ Detected: TypeScript + React + Vite

Phase 1/5: Clarifying requirements...
[... questions about profile page details ...]
```

### Example 3: Resume Interrupted Session

```bash
User: /autopilot resume

Autopilot:
┌────────────────────────────────────┐
│ 🚀 AUTOPILOT SESSION RESUMED       │
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

---

**Built with ❤️ for the Claude Code community**
