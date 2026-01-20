# Ralph-dev CLI

TypeScript command-line tool for Ralph-dev state and task management.

## Overview

The Ralph-dev CLI provides efficient operations for managing development workflow state, tasks, and language detection. It's designed to be called from Ralph-dev skills during autonomous development phases.

**Key capabilities:**
- State management across 5 workflow phases
- Task CRUD operations with dependency tracking
- Automatic language and framework detection
- JSON output for integration with bash scripts

## Installation

```bash
cd cli
npm install
npm run build
```

The CLI binary is located at `cli/bin/ralph-dev.js` and can be invoked via:
```bash
./bin/ralph-dev.js <command>
# or after build
npx ralph-dev <command>
```

## Commands

### State Management

Manage workflow state stored in `.ralph-dev/state.json`.

**Get current state:**
```bash
ralph-dev state get [--json]
```

**Set state:**
```bash
ralph-dev state set --phase <phase> [--task <taskId>]
# Example:
ralph-dev state set --phase implement --task auth.login.ui
```

**Update state fields:**
```bash
ralph-dev state update [--phase <phase>] [--task <taskId>] [--prd <prdJson>] [--add-error <errorJson>]
# Example:
ralph-dev state update --phase heal
ralph-dev state update --task auth.signup.api
```

**Clear state:**
```bash
ralph-dev state clear
```

**Supported phases:**
- `clarify` - Requirements clarification
- `breakdown` - Task decomposition
- `implement` - Implementation loop
- `heal` - Error recovery
- `deliver` - Quality gates and PR creation

### Task Management

Manage tasks in `.ralph-dev/tasks/` directory.

**Initialize task system:**
```bash
ralph-dev tasks init [--project-goal <goal>] [--language <language>] [--framework <framework>]
# Example:
ralph-dev tasks init --project-goal "User authentication system" --language typescript --framework nextjs
```

**Create a task:**
```bash
ralph-dev tasks create \
  --id <taskId> \
  --module <module> \
  --description <desc> \
  [--priority <1-10>] \
  [--estimated-minutes <minutes>] \
  [--criteria <criterion1> --criteria <criterion2>] \
  [--dependencies <dep1> --dependencies <dep2>] \
  [--test-pattern <pattern>]

# Example:
ralph-dev tasks create \
  --id auth.login.ui \
  --module auth \
  --description "Create login form component" \
  --priority 2 \
  --estimated-minutes 25 \
  --criteria "Form displays email and password fields" \
  --criteria "Submit button validates input" \
  --dependencies setup.scaffold \
  --test-pattern "**/*.test.ts"
```

**List tasks:**
```bash
ralph-dev tasks list [--status <status>] [--json]
# Examples:
ralph-dev tasks list --status pending
ralph-dev tasks list --json
```

**Get next task (with comprehensive context):**
```bash
ralph-dev tasks next [--json]
```

This command returns the highest-priority pending task with:
- Current directory and git information
- Workflow state and phase
- Progress statistics (completed/failed/pending)
- Recent activity from progress.log
- Dependency status
- Test requirements

**Get specific task:**
```bash
ralph-dev tasks get <taskId> [--json]
# Example:
ralph-dev tasks get auth.login.ui
```

**Mark task as in progress:**
```bash
ralph-dev tasks start <taskId>
# Example:
ralph-dev tasks start auth.login.ui
```

**Mark task as completed:**
```bash
ralph-dev tasks done <taskId> [--duration <duration>]
# Example:
ralph-dev tasks done auth.login.ui --duration "23m 15s"
```

**Mark task as failed:**
```bash
ralph-dev tasks fail <taskId> --reason <reason>
# Example:
ralph-dev tasks fail auth.login.ui --reason "Missing dependencies: react-hook-form"
```

### Language Detection

Detect project language and framework.

**Detect language:**
```bash
ralph-dev detect [--json]
```

Returns detected language configuration including:
- Primary language
- Framework (if applicable)
- Test framework
- Build tool
- Verification commands (type-check, lint, test, build)

**AI-powered detection:**
```bash
ralph-dev detect-ai [--json]
```

Uses AI agent to analyze project structure for more accurate detection.

## Usage in Skills

The CLI is designed to be called from bash skills. Here's a typical workflow:

```bash
# Phase 3: Implementation loop
while true; do
  # Get next task
  TASK_JSON=$(ralph-dev tasks next --json)

  if echo "$TASK_JSON" | jq -e '.error' > /dev/null; then
    echo "No more tasks"
    break
  fi

  TASK_ID=$(echo "$TASK_JSON" | jq -r '.task.id')

  # Mark as in progress
  ralph-dev tasks start "$TASK_ID"

  # Update workflow state
  ralph-dev state update --task "$TASK_ID"

  # Implement task (spawn agent, run tests, etc.)
  # ... implementation logic ...

  if [ $? -eq 0 ]; then
    # Mark as completed
    ralph-dev tasks done "$TASK_ID"
  else
    # Mark as failed
    ralph-dev tasks fail "$TASK_ID" --reason "Tests failed"
    # Trigger Phase 4: HEAL
    break
  fi
done
```

## Data Structures

### State File (`.ralph-dev/state.json`)
```json
{
  "phase": "implement",
  "currentTask": "auth.login.ui",
  "prd": {},
  "errors": [],
  "startedAt": "2026-01-19T10:00:00Z",
  "updatedAt": "2026-01-19T10:15:00Z"
}
```

### Task File (`.ralph-dev/tasks/auth/login.ui.md`)
```markdown
---
id: auth.login.ui
module: auth
priority: 2
status: in_progress
estimatedMinutes: 25
dependencies:
  - setup.scaffold
testRequirements:
  unit:
    required: true
    pattern: "**/*.test.ts"
---

# Login UI Component

## Acceptance Criteria
1. Form displays email and password fields
2. Submit button validates email format
3. Error messages display on validation failure

## Notes
Using React Hook Form for validation.
```

### Task Index (`.ralph-dev/tasks/index.json`)
```json
{
  "metadata": {
    "projectGoal": "User authentication system",
    "languageConfig": {
      "language": "typescript",
      "framework": "nextjs"
    }
  },
  "tasks": {
    "auth.login.ui": {
      "module": "auth",
      "priority": 2,
      "status": "in_progress",
      "filePath": "auth/login.ui.md"
    }
  }
}
```

## Architecture

Ralph-dev CLI uses a **layered architecture** with clear separation of concerns:

```
┌─────────────────────────────────────────┐
│   Commands (CLI Interface)              │  ← Thin layer: parse args, format output
├─────────────────────────────────────────┤
│   Services (Business Logic)             │  ← Core logic: task management, state, healing
├─────────────────────────────────────────┤
│   Repositories (Data Access)            │  ← Abstract persistence: tasks, state
├─────────────────────────────────────────┤
│   Domain Models (Entities)              │  ← Rich entities with behavior
├─────────────────────────────────────────┤
│   Infrastructure (File System, Logger)  │  ← Technical services with retry logic
└─────────────────────────────────────────┘
```

**Key architectural features:**
- **Dependency Injection**: Services and repositories are injected via constructors for testability
- **Repository Pattern**: All data access abstracted behind interfaces
- **Rich Domain Models**: Entities enforce business rules and state transitions
- **Circuit Breaker**: Prevents cascade failures in healing phase (auto-stops after 5 failures)
- **Saga Pattern**: Ensures atomic multi-step operations with automatic rollback

**See [CLAUDE.md](CLAUDE.md) for detailed architecture documentation, design patterns, and development guidelines.**

## Development

**Run in watch mode:**
```bash
npm run dev
```

**Run tests:**
```bash
npm test
```

**Lint code:**
```bash
npm run lint
```

**Format code:**
```bash
npm run format
```

**Build for production:**
```bash
npm run build
```

## Requirements

- Node.js >= 18.0.0
- npm >= 9.0.0

## Dependencies

**Runtime:**
- `commander` - CLI framework
- `chalk` - Terminal colors
- `yaml` - YAML parsing
- `fs-extra` - Enhanced file system operations
- `zod` - Schema validation

**Development:**
- `typescript` - Type safety
- `vitest` - Testing framework
- `eslint` - Code linting
- `prettier` - Code formatting

## Integration with Ralph-dev

This CLI is bootstrapped automatically by `shared/bootstrap-cli.sh` when Ralph-dev skills are invoked. The bootstrap script:
1. Checks if CLI binary exists
2. Builds CLI on first use (npm install + tsc)
3. Exports `ralph-dev` function for use in skills
4. Subsequent runs use cached binary for instant execution

## License

MIT - Part of the Ralph-dev project

---

**Version:** 0.2.0
**Status:** Early development
**Repository:** https://github.com/mylukin/ralph-dev
