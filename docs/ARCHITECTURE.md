# Ralph-dev Architecture

> Autonomous end-to-end development system integrated with Claude Code. Transforms natural language requirements into production-ready, tested code through a 5-phase workflow.

## Overview

Ralph-dev is a TypeScript-based CLI tool that orchestrates AI agents through a structured development workflow. It enables autonomous code generation with TDD enforcement, automatic error recovery, and context-compression resilience.

**Key Features:**
- 5-phase development workflow (Clarify → Breakdown → Implement ⇄ Heal → Deliver)
- Test-Driven Development enforcement
- Circuit breaker pattern for error recovery
- Fresh agent context per task
- State persistence for session recovery
- Multi-language support (12+ languages/frameworks)

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              User Interface                                  │
│                                                                             │
│    /ralph-dev "requirement"  ───────────────────────────────────────────►   │
│                                                                             │
└────────────────────────────────────┬────────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         Claude Code Plugin Layer                             │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────────┐  │
│  │ commands/       │  │ .claude-plugin/ │  │ skills/                     │  │
│  │ ralph-dev.md    │  │ plugin.json     │  │ phase-1-clarify/SKILL.md   │  │
│  │ (entry point)   │  │ hooks/          │  │ phase-2-breakdown/SKILL.md │  │
│  └────────┬────────┘  │  ├─session-start│  │ phase-3-implement/SKILL.md │  │
│           │           │  ├─pre-compact  │  │ phase-4-heal/SKILL.md      │  │
│           │           │  └─stop-hook    │  │ phase-5-deliver/SKILL.md   │  │
│           │           └─────────────────┘  │ dev-orchestrator/SKILL.md  │  │
│           │                                └──────────────┬──────────────┘  │
└───────────┼───────────────────────────────────────────────┼─────────────────┘
            │                                               │
            │  ┌────────────────────────────────────────────┘
            │  │  source shared/bootstrap-cli.sh
            ▼  ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLI Layer (cli/)                                │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                      Commands (cli/src/commands/)                    │   │
│  │  state.ts │ tasks.ts │ status.ts │ detect.ts │ init.ts │ circuit-   │   │
│  │           │          │           │           │         │ breaker.ts │   │
│  └─────────────────────────────────┬───────────────────────────────────┘   │
│                                    │ service-factory.ts (DI)               │
│                                    ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                      Services (cli/src/services/)                    │   │
│  │  task-service.ts │ state-service.ts │ status-service.ts │           │   │
│  │  context-service.ts │ detection-service.ts │ healing-service.ts     │   │
│  └─────────────────────────────────┬───────────────────────────────────┘   │
│                                    ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                   Repositories (cli/src/repositories/)               │   │
│  │  task-repository.service.ts │ state-repository.service.ts │         │   │
│  │  index-repository.service.ts                                         │   │
│  └─────────────────────────────────┬───────────────────────────────────┘   │
│                                    ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                       Domain (cli/src/domain/)                       │   │
│  │         task-entity.ts │ state-entity.ts │ language-config.ts       │   │
│  └─────────────────────────────────┬───────────────────────────────────┘   │
│                                    ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                  Infrastructure (cli/src/infrastructure/)            │   │
│  │           file-system.service.ts │ logger.service.ts                 │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                        Core (cli/src/core/)                          │   │
│  │  circuit-breaker.ts │ task-parser.ts │ task-writer.ts │ retry.ts    │   │
│  │  exit-codes.ts │ response-wrapper.ts │ error-handler.ts             │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         Workspace (.ralph-dev/)                              │
│  ┌──────────────┐  ┌─────────────────────────────────┐  ┌───────────────┐   │
│  │ state.json   │  │ tasks/                          │  │ prd.md        │   │
│  │ (phase,task) │  │  ├─index.json                   │  │ (requirements)│   │
│  └──────────────┘  │  ├─{module}/                    │  └───────────────┘   │
│                    │  │  └─{task-id}.md              │                      │
│  ┌──────────────┐  └─────────────────────────────────┘  ┌───────────────┐   │
│  │language.json │                                       │ saga.log      │   │
│  │ (detection)  │                                       │ (audit trail) │   │
│  └──────────────┘                                       └───────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Workflow State Machine

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                           Phase State Machine                                 │
│                                                                              │
│   ┌─────────┐     ┌───────────┐     ┌───────────┐     ┌─────────┐           │
│   │ CLARIFY │ ──► │ BREAKDOWN │ ──► │ IMPLEMENT │ ──► │ DELIVER │           │
│   │         │     │           │     │           │     │         │           │
│   │ PRD gen │     │ Task gen  │     │   TDD     │     │ Commit  │           │
│   └─────────┘     └───────────┘     └─────┬─────┘     │   PR    │           │
│                                           │           └────┬────┘           │
│                                     error │                │                │
│                                           ▼                ▼                │
│                                     ┌─────────┐     ┌──────────┐           │
│                                     │  HEAL   │     │ COMPLETE │           │
│                                     │         │     │          │           │
│                                     │ Circuit │     │  (end)   │           │
│                                     │ Breaker │     └──────────┘           │
│                                     └────┬────┘                            │
│                                          │                                 │
│                                    fixed │                                 │
│                                          │                                 │
│                                          └──────────► IMPLEMENT            │
│                                                                            │
└──────────────────────────────────────────────────────────────────────────────┘

Valid Transitions:
  clarify   → breakdown
  breakdown → implement
  implement → heal (on test failure)
  implement → deliver (all tasks done)
  heal      → implement (on fix)
  deliver   → complete
```

## Directory Structure

```
ralph-dev/
├── cli/                           # TypeScript CLI tool
│   ├── src/
│   │   ├── index.ts              # Entry point, command registration
│   │   ├── commands/             # CLI command handlers
│   │   │   ├── service-factory.ts   # Dependency injection
│   │   │   ├── state.ts             # State management
│   │   │   ├── tasks.ts             # Task CRUD operations
│   │   │   ├── status.ts            # Progress overview
│   │   │   ├── detect.ts            # Language detection
│   │   │   └── init.ts              # Workspace initialization
│   │   ├── services/             # Business logic layer
│   │   │   ├── task-service.ts      # Task operations
│   │   │   ├── state-service.ts     # Phase transitions
│   │   │   ├── status-service.ts    # Aggregated status
│   │   │   ├── context-service.ts   # Rich context for tasks
│   │   │   └── detection-service.ts # Framework detection
│   │   ├── repositories/         # Data access layer
│   │   │   ├── task-repository.service.ts
│   │   │   ├── state-repository.service.ts
│   │   │   └── index-repository.service.ts
│   │   ├── domain/               # Business entities
│   │   │   ├── task-entity.ts       # Task with state transitions
│   │   │   ├── state-entity.ts      # Phase state machine
│   │   │   └── language-config.ts   # Detection results
│   │   ├── infrastructure/       # External services
│   │   │   ├── file-system.service.ts  # File I/O with retry
│   │   │   └── logger.service.ts       # Logging
│   │   ├── core/                 # Utilities
│   │   │   ├── circuit-breaker.ts   # Failure protection
│   │   │   ├── task-parser.ts       # YAML frontmatter parsing
│   │   │   ├── exit-codes.ts        # Semantic exit codes
│   │   │   └── retry.ts             # Retry logic
│   │   ├── language/             # Language detection
│   │   │   └── detector.ts          # 12+ language support
│   │   └── test-utils/           # Test mocks
│   └── package.json
├── skills/                        # AI agent workflows
│   ├── detect-language/          # Phase 0: Language detection
│   ├── phase-1-clarify/          # Phase 1: Requirements → PRD
│   ├── phase-2-breakdown/        # Phase 2: PRD → Tasks
│   ├── phase-3-implement/        # Phase 3: TDD implementation
│   ├── phase-4-heal/             # Phase 4: Error recovery
│   ├── phase-5-deliver/          # Phase 5: Commit + PR
│   └── dev-orchestrator/         # Main orchestrator
├── commands/                      # Plugin command definitions
│   └── ralph-dev.md              # Main command handler
├── shared/                        # Shared scripts
│   ├── bootstrap-cli.sh          # CLI auto-build
│   └── cli-fallback.sh           # Bash fallback
├── .claude-plugin/               # Plugin configuration
│   ├── plugin.json               # Plugin manifest
│   └── hooks/                    # Lifecycle hooks
│       ├── session-start.sh
│       ├── pre-compact.sh
│       └── stop-hook.sh
└── .ralph-dev/                   # Runtime workspace (generated)
    ├── state.json
    ├── prd.md
    ├── language.json
    └── tasks/
        ├── index.json
        └── {module}/{id}.md
```

## Layered Architecture

The CLI follows a strict layered architecture with unidirectional dependencies:

```
┌────────────────────────────────────────────────────────────────────────────┐
│                               COMMANDS                                      │
│  Purpose: Parse CLI arguments, format output                               │
│  Rules: NO business logic, NO direct file access                           │
│  Example: state.ts, tasks.ts, status.ts                                    │
└────────────────────────────────────┬───────────────────────────────────────┘
                                     │ calls
                                     ▼
┌────────────────────────────────────────────────────────────────────────────┐
│                               SERVICES                                      │
│  Purpose: Business logic, validation, orchestration                        │
│  Rules: NO direct file I/O, uses repositories only                         │
│  Example: TaskService, StateService, StatusService                         │
└────────────────────────────────────┬───────────────────────────────────────┘
                                     │ calls
                                     ▼
┌────────────────────────────────────────────────────────────────────────────┐
│                             REPOSITORIES                                    │
│  Purpose: Data access abstraction, persistence                             │
│  Rules: Maintain index.json, hide file paths from services                 │
│  Example: FileSystemTaskRepository, FileSystemStateRepository              │
└────────────────────────────────────┬───────────────────────────────────────┘
                                     │ uses
                                     ▼
┌────────────────────────────────────────────────────────────────────────────┐
│                                DOMAIN                                       │
│  Purpose: Rich entities with behavior, enforce invariants                  │
│  Rules: NO external dependencies, self-validating                          │
│  Example: Task (canStart, complete, fail), State (canTransitionTo)         │
└────────────────────────────────────────────────────────────────────────────┘
                                     │
                                     ▼
┌────────────────────────────────────────────────────────────────────────────┐
│                            INFRASTRUCTURE                                   │
│  Purpose: File I/O, logging, retry logic                                   │
│  Rules: NO business logic, provides primitives only                        │
│  Example: FileSystemService (with retry), ConsoleLogger                    │
└────────────────────────────────────────────────────────────────────────────┘
```

## Data Flow

### End-to-End Development Flow

```
User Input: /ralph-dev "Build user authentication API"
│
▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ PHASE 1: CLARIFY                                                            │
│                                                                             │
│   Skill: phase-1-clarify/SKILL.md                                          │
│   Input: User requirement string                                            │
│   Process:                                                                  │
│     1. Detect project language (ralph-dev detect --save)                   │
│     2. Ask structured questions (AskUserQuestion tool)                      │
│     3. Generate PRD from answers                                           │
│   Output: .ralph-dev/prd.md                                                │
│   Transition: ralph-dev state set --phase breakdown                        │
└────────────────────────────────────┬────────────────────────────────────────┘
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ PHASE 2: BREAKDOWN                                                          │
│                                                                             │
│   Skill: phase-2-breakdown/SKILL.md                                        │
│   Input: .ralph-dev/prd.md                                                 │
│   Process:                                                                  │
│     1. Parse PRD into atomic tasks (<30 min each)                          │
│     2. Create task files (ralph-dev tasks create)                          │
│     3. Build dependency graph                                              │
│     4. Get user approval                                                   │
│   Output: .ralph-dev/tasks/{module}/{id}.md + index.json                   │
│   Transition: ralph-dev state set --phase implement                        │
└────────────────────────────────────┬────────────────────────────────────────┘
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ PHASE 3: IMPLEMENT                                                          │
│                                                                             │
│   Skill: phase-3-implement/SKILL.md                                        │
│   Loop:                                                                     │
│     ┌──────────────────────────────────────────────────────────────────┐   │
│     │ 1. ralph-dev tasks next --json                                   │   │
│     │ 2. ralph-dev tasks start <id>                                    │   │
│     │ 3. Spawn fresh subagent (Task tool)                              │   │
│     │ 4. Write failing test (TDD)                                      │   │
│     │ 5. Implement minimal code to pass                                │   │
│     │ 6. ralph-dev tasks done <id> (success)                           │   │
│     │    OR invoke Phase 4 (failure)                                   │   │
│     │ 7. Repeat until no pending tasks                                 │   │
│     └──────────────────────────────────────────────────────────────────┘   │
│   Transition: ralph-dev state set --phase deliver                          │
└────────────────────────────────────┬────────────────────────────────────────┘
                                     │
              ┌──────────────────────┴──────────────────────┐
              │ error                                       │ all done
              ▼                                             ▼
┌─────────────────────────────────────┐   ┌───────────────────────────────────┐
│ PHASE 4: HEAL                       │   │ PHASE 5: DELIVER                  │
│                                     │   │                                   │
│   Skill: phase-4-heal/SKILL.md     │   │   Skill: phase-5-deliver/SKILL.md │
│   Process:                          │   │   Process:                        │
│     1. Analyze test failure         │   │     1. Run quality gates:         │
│     2. Search for solutions         │   │        - ralph-dev detect --json  │
│     3. Apply fix                    │   │        - npm test                 │
│     4. Re-run tests                 │   │        - npm run lint             │
│     5. Circuit breaker (max 5)      │   │        - npx tsc --noEmit        │
│   On success: Return to Phase 3    │   │        - npm run build            │
│   On circuit open: Mark failed,     │   │     2. Create git commit          │
│                    continue         │   │     3. Create pull request        │
└─────────────────────────────────────┘   │   Output: PR URL                  │
                                          │   Transition: phase complete       │
                                          └───────────────────────────────────┘
```

### Task Lifecycle

```
┌────────────────────────────────────────────────────────────────────────────┐
│                            Task State Machine                               │
│                                                                            │
│                        ┌──────────────────────────────────────┐            │
│                        │                                      │            │
│                        ▼                                      │            │
│   ┌─────────────┐   start   ┌───────────────┐   done   ┌───────────┐      │
│   │   PENDING   │ ────────► │  IN_PROGRESS  │ ───────► │ COMPLETED │      │
│   │             │           │               │          │           │      │
│   │ canStart()  │           │               │          │ terminal  │      │
│   └─────────────┘           └───────┬───────┘          └───────────┘      │
│                                     │                                      │
│                               fail  │                                      │
│                                     ▼                                      │
│                             ┌─────────────┐                                │
│                             │   FAILED    │                                │
│                             │             │                                │
│                             │  terminal   │                                │
│                             └─────────────┘                                │
│                                                                            │
│   Domain Entity Methods:                                                   │
│   - task.canStart(): boolean (checks dependencies)                         │
│   - task.start(): void (pending → in_progress)                            │
│   - task.complete(): void (in_progress → completed)                        │
│   - task.fail(reason): void (in_progress → failed)                        │
│   - task.isBlocked(completedIds): boolean                                  │
│   - task.isTerminal(): boolean                                             │
│                                                                            │
└────────────────────────────────────────────────────────────────────────────┘
```

## Key Design Patterns

### 1. Circuit Breaker (Healing)

Prevents infinite retry loops during error recovery:

```
┌────────────────────────────────────────────────────────────────────────────┐
│                          Circuit Breaker States                             │
│                                                                            │
│   ┌──────────┐      failure      ┌──────────┐      timeout     ┌─────────┐│
│   │  CLOSED  │ ───────────────►  │   OPEN   │ ───────────────► │HALF_OPEN││
│   │ (normal) │  (5 consecutive)  │(fail-fast)│    (60 sec)     │ (test)  ││
│   └────┬─────┘                   └──────────┘                  └────┬────┘│
│        │                                                            │      │
│        │ success                                            success │      │
│        │◄───────────────────────────────────────────────────────────┘      │
│                                                                            │
│   Config: failureThreshold=5, timeout=60s, successThreshold=2              │
│                                                                            │
└────────────────────────────────────────────────────────────────────────────┘
```

### 2. Dependency Injection (Service Factory)

All services created via `cli/src/commands/service-factory.ts`:

```typescript
// Factory creates all dependencies
export function createTaskService(workspaceDir: string): TaskService {
  const fileSystem = new FileSystemService();
  const taskRepo = new FileSystemTaskRepository(fileSystem, workspaceDir);
  const indexRepo = new FileSystemIndexRepository(fileSystem, workspaceDir);
  const logger = new ConsoleLogger();
  return new TaskService(taskRepo, indexRepo, logger);
}
```

### 3. Rich Domain Entities

Entities contain behavior, not just data:

```typescript
// Task entity with state transitions
class Task {
  canStart(): boolean {
    return this.status === 'pending';
  }

  start(): void {
    if (!this.canStart()) throw new Error('Cannot start');
    this._status = 'in_progress';
    this._startedAt = new Date();
  }

  complete(): void {
    if (this.status !== 'in_progress') throw new Error('Cannot complete');
    this._status = 'completed';
    this._completedAt = new Date();
  }
}
```

### 4. Fresh Agent Context

Each task implementation spawns a fresh subagent to prevent context pollution:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         Fresh Context Pattern                                │
│                                                                             │
│   Main Agent (dev-orchestrator)                                             │
│        │                                                                    │
│        ├──► Task Tool ──► Subagent (Task 1) ──► Complete ──► Return        │
│        │                                                                    │
│        ├──► Task Tool ──► Subagent (Task 2) ──► Complete ──► Return        │
│        │                                                                    │
│        └──► Task Tool ──► Subagent (Task 3) ──► Complete ──► Return        │
│                                                                             │
│   Benefits:                                                                 │
│   - Clean context per task (no pollution)                                   │
│   - Consistent starting point                                               │
│   - Better error isolation                                                  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 5. State Persistence for Recovery

State persisted to JSON enables recovery after context compression:

```json
// .ralph-dev/state.json
{
  "phase": "implement",
  "currentTask": "auth.login",
  "startedAt": "2026-01-20T10:00:00Z",
  "updatedAt": "2026-01-20T10:30:00Z"
}
```

Recovery process:
1. `ralph-dev state get --json` → Get current phase
2. `ralph-dev tasks list --json` → Get all task status
3. `ralph-dev tasks next --json` → Resume with next task

## Plugin Hooks

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            Plugin Lifecycle                                  │
│                                                                             │
│   SessionStart                                                              │
│   └─► hooks/session-start.sh                                               │
│       └─► Initialize .ralph-dev/ if needed                                 │
│                                                                             │
│   PreCompact (before context compression)                                   │
│   └─► hooks/pre-compact.sh                                                 │
│       └─► Save current state to disk                                       │
│                                                                             │
│   Stop (on each response - ralph-loop pattern)                              │
│   └─► hooks/stop-hook.sh                                                   │
│       └─► If phase != "complete": Block exit, prompt to resume workflow    │
│       └─► If phase == "complete" or no session: Allow exit                 │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Task File Format

Tasks are stored as markdown files with YAML frontmatter:

```markdown
---
id: auth.login
module: auth
priority: 2
status: pending
estimatedMinutes: 25
dependencies:
  - setup.scaffold
---

# Login Implementation

## Acceptance Criteria
1. User can login with email/password
2. Returns JWT token on success
3. Returns error on invalid credentials

## Notes
- Use bcrypt for password hashing
```

## CLI Commands Reference

| Command | Description |
|---------|-------------|
| `ralph-dev state get --json` | Get current phase and task |
| `ralph-dev state set --phase <phase>` | Set workflow phase |
| `ralph-dev tasks create --id <id>` | Create new task |
| `ralph-dev tasks list --json` | List all tasks |
| `ralph-dev tasks next --json` | Get next pending task |
| `ralph-dev tasks start <id>` | Mark task as in_progress |
| `ralph-dev tasks done <id>` | Mark task as completed |
| `ralph-dev tasks fail <id>` | Mark task as failed |
| `ralph-dev detect --json` | Detect language/framework |
| `ralph-dev status --json` | Get overall progress |

## Exit Codes

| Code | Meaning |
|------|---------|
| 0 | SUCCESS |
| 1 | GENERAL_ERROR |
| 2 | NOT_FOUND |
| 3 | INVALID_INPUT |
| 4 | CONFLICT |
| 5 | SYSTEM_ERROR |

## Dependencies

**Production:**
- commander (11.1.0) - CLI framework
- chalk (5.3.0) - Terminal colors
- fs-extra (11.2.0) - Enhanced file system
- yaml (2.3.4) - YAML parsing
- zod (3.22.4) - Schema validation

**Development:**
- TypeScript 5.3.3
- Vitest 1.1.0
- ESLint 8.56.0
- Prettier 3.1.1

## Environment Variables

### Core Variables

| Variable | Purpose | Default |
|----------|---------|---------|
| `CI` | Enable CI mode for tests (non-interactive) | - |
| `RALPH_DEV_WORKSPACE` | Override workspace directory | `process.cwd()` |

### Bootstrap Variables

| Variable | Purpose | Default |
|----------|---------|---------|
| `SKIP_BOOTSTRAP` | Skip automatic CLI bootstrap | `0` |
| `FORCE_REBUILD` | Force local CLI rebuild | `0` |

### CI/CD Variables

| Variable | Purpose | Default |
|----------|---------|---------|
| `RALPH_DEV_CI_MODE` | Enable CI mode | `false` |
| `RALPH_DEV_AUTO_APPROVE` | Auto-approve task breakdown | `false` |
| `SLACK_WEBHOOK_URL` | Slack notifications webhook | - |

### Claude Code Variables (System-provided)

| Variable | Purpose |
|----------|---------|
| `CLAUDE_PLUGIN_ROOT` | Plugin installation directory |
| `CLAUDE_PROJECT_DIR` | Current project directory |
| `CLAUDE_ENV_FILE` | Environment file for persistence |

## CI/CD Configuration

For CI/CD automation, create `.ralph-dev/ci-config.yml`:

```yaml
ci_mode:
  enabled: true
  auto_approve_breakdown: true

  # Pre-defined answers for Phase 1 (no interactive questions)
  clarify_answers:
    project_type: "Web application"
    tech_stack: "TypeScript"
    scale: "Production"

  # Resource limits
  limits:
    max_tasks: 50
    max_healing_time: "30m"
    max_total_time: "4h"

  # Notifications
  notifications:
    slack_webhook: "https://hooks.slack.com/..."
    on_success: true
    on_failure: true

  # Git configuration
  git:
    author: "CI Bot <[email protected]>"
    branch_prefix: "ralph-dev/"

  # PR configuration
  pr:
    labels: ["auto-generated", "ralph-dev"]
    reviewers: ["team-lead"]
    auto_merge_on_success: false
```

---

*Last Updated: 2026-01-20*
