/**
 * Init Command - Initialize ralph-dev in a project
 *
 * Installs workflow rules and creates .ralph-dev directory structure.
 * This ensures workflow instructions persist across context compression.
 */

import { Command } from 'commander';
import chalk from 'chalk';
import * as path from 'path';
import * as fs from 'fs-extra';
import { ExitCode } from '../core/exit-codes';
import { handleError, Errors } from '../core/error-handler';
import { successResponse, outputResponse } from '../core/response-wrapper';

// Rules content - embedded to avoid dependency on plugin directory location
// These rules are designed to survive context compression by:
// 1. Front-loading critical recovery info
// 2. Using bullet points (compress better than prose)
// 3. Adding CRITICAL markers for important info
// 4. Including explicit skill invocations

const WORKFLOW_RULES = `# Ralph-dev Workflow Rules

## CRITICAL: Recovery After Context Compression

**If you're unsure of current state, ALWAYS do this FIRST:**

\`\`\`bash
# Step 1: Query current phase
ralph-dev state get --json

# Step 2: Check task progress
ralph-dev tasks list --json

# Step 3: Get next task (if in implement phase)
ralph-dev tasks next --json
\`\`\`

**Then resume based on phase:**
| Phase | Action |
|-------|--------|
| \`clarify\` | Use Skill tool: \`skill: "ralph-dev:phase-1-clarify"\` |
| \`breakdown\` | Use Skill tool: \`skill: "ralph-dev:phase-2-breakdown"\` |
| \`implement\` | Use Skill tool: \`skill: "ralph-dev:phase-3-implement"\` |
| \`heal\` | Use Skill tool: \`skill: "ralph-dev:phase-4-heal"\` |
| \`deliver\` | Use Skill tool: \`skill: "ralph-dev:phase-5-deliver"\` |
| \`none\` | Initialize: \`ralph-dev state set --phase clarify\` |

---

## Phase State Machine

\`\`\`
CLARIFY → BREAKDOWN → IMPLEMENT ⇄ HEAL → DELIVER → COMPLETE
\`\`\`

**Valid Transitions:**
- \`clarify\` → \`breakdown\`
- \`breakdown\` → \`implement\`
- \`implement\` → \`heal\` (on error)
- \`implement\` → \`deliver\` (all tasks done)
- \`heal\` → \`implement\` (fixed)
- \`deliver\` → \`complete\`

---

## Phase 1: CLARIFY

- **Skill:** \`ralph-dev:phase-1-clarify\`
- **Goal:** Generate PRD from user requirements
- **Input:** Natural language requirement
- **Output:** \`.ralph-dev/prd.md\`
- **Transition:** \`ralph-dev state set --phase breakdown\`

---

## Phase 2: BREAKDOWN

- **Skill:** \`ralph-dev:phase-2-breakdown\`
- **Goal:** Decompose PRD into atomic tasks (<30 min each)
- **Input:** \`.ralph-dev/prd.md\`
- **Output:** \`.ralph-dev/tasks/*.md\` + \`index.json\`
- **Create tasks via CLI:**
  \`\`\`bash
  ralph-dev tasks create --id <id> --module <mod> --priority <n> --description "..."
  \`\`\`
- **REQUIRES:** User approval before transition
- **Transition:** \`ralph-dev state set --phase implement\`

---

## Phase 3: IMPLEMENT

- **Skill:** \`ralph-dev:phase-3-implement\`
- **Goal:** Implement all tasks with TDD
- **Loop (CRITICAL):**
  1. \`ralph-dev tasks next --json\` → Get next task
  2. \`ralph-dev tasks start <id>\` → Mark as started
  3. Write failing test first (TDD)
  4. Implement minimal code to pass
  5. \`ralph-dev tasks done <id>\` → On success
  6. Invoke Phase 4 (heal) → On failure
  7. Repeat until no pending tasks
- **Fresh context:** Each task uses fresh agent (Task tool)
- **Transition:** \`ralph-dev state set --phase deliver\`

---

## Phase 4: HEAL

- **Skill:** \`ralph-dev:phase-4-heal\`
- **Goal:** Fix implementation errors
- **Trigger:** Invoked by Phase 3 when tests fail
- **Circuit breaker:** Max 5 consecutive failures
- **On fix:** Return to Phase 3
- **On circuit open:** \`ralph-dev tasks fail <id>\`, continue with next

---

## Phase 5: DELIVER

- **Skill:** \`ralph-dev:phase-5-deliver\`
- **Goal:** Create commit and PR
- **Steps:**
  1. Run quality gates: \`ralph-dev detect --json\` → get verify commands
  2. Execute: test, lint, typecheck, build
  3. Create git commit
  4. Create pull request
- **Transition:** \`ralph-dev state set --phase complete\`

---

## Error Handling

| Situation | Action |
|-----------|--------|
| Tests fail | Invoke \`ralph-dev:phase-4-heal\` skill |
| Heal fails 5x | \`ralph-dev tasks fail <id>\`, continue |
| No tasks left | Transition to deliver phase |
| State not found | \`ralph-dev state set --phase clarify\` |
| Unknown phase | Query CLI: \`ralph-dev state get --json\` |
`;

const PRINCIPLES_RULES = `# Ralph-dev Core Principles

## CRITICAL: State-Driven Execution

**NEVER assume state from memory. ALWAYS query CLI first:**

\`\`\`bash
ralph-dev state get --json      # Current phase
ralph-dev tasks next --json     # Next task to work on
ralph-dev tasks list --json     # All tasks status
\`\`\`

**This is MANDATORY after context compression or session resume.**

---

## Principle 1: TDD Enforcement

Every task MUST follow Test-Driven Development:
1. **Write failing test first** - Define expected behavior
2. **Implement minimal code** - Just enough to pass
3. **Refactor** - Keep tests green
4. **Verify** - Run project's test command

**NEVER skip tests. Tests are the source of truth.**

---

## Principle 2: Fresh Agent Context

Each task implementation uses fresh agent context:
- **Why:** Prevents context pollution between tasks
- **How:** Use \`Task\` tool to spawn subagent
- **Benefit:** Consistent starting point for each task

---

## Principle 3: Circuit Breaker for Healing

Healing attempts are limited to prevent infinite loops:
- **Threshold:** 5 consecutive failures → circuit OPEN
- **On OPEN:** Mark task failed, move to next task
- **Reset:** After 60 seconds of no failures

**NEVER retry infinitely. Failed tasks should be logged and skipped.**

---

## Principle 4: Saga Pattern for Atomicity

Multi-step operations must be atomic:
- Each step has \`execute()\` and \`compensate()\` (rollback)
- On failure: Automatically rollback all completed steps
- Audit trail: \`.ralph-dev/saga.log\`

---

## Principle 5: Layered Architecture

\`\`\`
Commands → Services → Repositories → Domain → Infrastructure
\`\`\`

| Layer | Responsibility |
|-------|----------------|
| Commands | Parse args, format output only |
| Services | Business logic and validation |
| Repositories | Data access abstraction |
| Domain | Rich entities with behavior |
| Infrastructure | File I/O, logging, Git |

**NEVER put business logic in commands. NEVER access files directly from commands.**

---

## Principle 6: User Interaction

**In main session:** Use \`AskUserQuestion\` tool
- Phase 1: Requirement clarification
- Phase 2: Task approval
- Phase 5: Delivery confirmation

**In subagents:** Use bash with env config (60s timeout limit)

---

## Principle 7: Progress Tracking

**After EVERY task:**
\`\`\`bash
ralph-dev tasks done <id>              # Success
ralph-dev tasks fail <id> --reason "..." # Failure
\`\`\`

**Update current task:**
\`\`\`bash
ralph-dev state update --task <next_task_id>
\`\`\`

---

## Principle 8: Quality Gates

Before delivery (Phase 5), ALL must pass:
\`\`\`bash
ralph-dev detect --json  # Get verify commands
\`\`\`

Then execute:
- \`test\` - All tests pass
- \`lint\` - No lint errors
- \`typecheck\` - No type errors
- \`build\` - Build succeeds

**NEVER commit with failing gates.**

---

## Quick Reference: When X, Do Y

| Situation | Action |
|-----------|--------|
| Start new task | \`ralph-dev tasks start <id>\` |
| Task succeeded | \`ralph-dev tasks done <id>\` |
| Task failed | \`ralph-dev tasks fail <id> --reason "..."\` |
| Tests fail | Invoke heal skill, max 5 attempts |
| Heal fails 5x | Mark failed, move to next task |
| All tasks done | Transition to deliver phase |
| Context compressed | Query CLI for state, resume |
`;

const COMMANDS_RULES = `# Ralph-dev CLI Commands

## CRITICAL: Most Used Commands

\`\`\`bash
# Query state (DO THIS FIRST after compression)
ralph-dev state get --json

# Get next task to work on
ralph-dev tasks next --json

# List all tasks with status
ralph-dev tasks list --json
\`\`\`

---

## State Management

\`\`\`bash
# Get current state
ralph-dev state get --json
# → {"phase":"implement","currentTask":"auth.login","startedAt":"...","updatedAt":"..."}

# Set phase (initialize or transition)
ralph-dev state set --phase clarify
ralph-dev state set --phase breakdown
ralph-dev state set --phase implement
ralph-dev state set --phase deliver
ralph-dev state set --phase complete

# Update specific field
ralph-dev state update --phase <phase>
ralph-dev state update --task <taskId>

# Clear state (end session)
ralph-dev state clear
\`\`\`

---

## Task Management

\`\`\`bash
# Create task
ralph-dev tasks create <taskId> \\
  --module <moduleName> \\
  --priority <1-5> \\
  --description "Task description" \\
  --dependencies "dep1,dep2" \\
  --estimated-minutes 30

# List tasks
ralph-dev tasks list --json                    # All tasks
ralph-dev tasks list --status pending          # Filter by status
ralph-dev tasks list --status completed
ralph-dev tasks list --status in_progress
ralph-dev tasks list --status failed
ralph-dev tasks list --module auth             # Filter by module

# Get next pending task (respects dependencies)
ralph-dev tasks next --json
# → {"success":true,"task":{"id":"auth.login","status":"pending",...}}
# → {"success":true,"task":null} when no more tasks

# Get specific task
ralph-dev tasks get <taskId> --json

# Task lifecycle
ralph-dev tasks start <taskId>                 # Mark as in_progress
ralph-dev tasks done <taskId>                  # Mark as completed
ralph-dev tasks done <taskId> --duration "5m"  # With duration
ralph-dev tasks fail <taskId> --reason "..."   # Mark as failed
\`\`\`

---

## Language Detection

\`\`\`bash
# Detect language and framework
ralph-dev detect --json
ralph-dev detect --save    # Save to .ralph-dev/language.json

# Output structure:
# {
#   "language": "typescript",
#   "framework": "node",
#   "testFramework": "vitest",
#   "verifyCommands": {
#     "test": "npm test",
#     "lint": "npm run lint",
#     "typecheck": "npx tsc --noEmit",
#     "build": "npm run build"
#   }
# }
\`\`\`

---

## Status Overview

\`\`\`bash
ralph-dev status --json
# → {
#     "phase": "implement",
#     "tasks": {
#       "total": 10,
#       "completed": 5,
#       "pending": 3,
#       "in_progress": 1,
#       "failed": 1
#     }
#   }
\`\`\`

---

## Initialize Project

\`\`\`bash
# Install workflow rules to project
ralph-dev init
ralph-dev init --force    # Overwrite existing rules
ralph-dev init --json     # JSON output

# Creates:
# - .claude/rules/ralph-dev-workflow.md
# - .claude/rules/ralph-dev-principles.md
# - .claude/rules/ralph-dev-commands.md
# - .ralph-dev/ directory
\`\`\`

---

## Common Patterns

### Implementation Loop
\`\`\`bash
while true; do
  NEXT=$(ralph-dev tasks next --json)
  TASK=$(echo "$NEXT" | jq -r '.task')

  if [ "$TASK" = "null" ]; then
    break  # No more tasks
  fi

  TASK_ID=$(echo "$NEXT" | jq -r '.task.id')
  ralph-dev tasks start "$TASK_ID"

  # ... implement task ...

  ralph-dev tasks done "$TASK_ID"
done
\`\`\`

### Phase Transition
\`\`\`bash
ralph-dev state set --phase <next_phase>
\`\`\`

### Error Recovery
\`\`\`bash
ralph-dev state get --json
ralph-dev tasks list --status in_progress --json
\`\`\`

---

## Exit Codes

| Code | Meaning | Example |
|------|---------|---------|
| 0 | Success | Operation completed |
| 1 | General error | Unexpected error |
| 2 | Not found | Task/state not found |
| 3 | Invalid input | Bad arguments |
| 4 | Conflict | Duplicate task ID |
| 5 | System error | File system error |

---

## Environment Variables

| Variable | Purpose |
|----------|---------|
| \`RALPH_DEV_WORKSPACE\` | Override workspace directory |
| \`CI\` | Set to \`true\` for CI mode |
`;

export function registerInitCommand(program: Command, workspaceDir: string): void {
  program
    .command('init')
    .description('Initialize ralph-dev in current project (installs workflow rules)')
    .option('--force', 'Overwrite existing rules')
    .option('--json', 'Output as JSON')
    .action(async (options) => {
      try {
        const rulesDir = path.join(workspaceDir, '.claude', 'rules');
        const ralphDevDir = path.join(workspaceDir, '.ralph-dev');

        // Create directories
        await fs.ensureDir(rulesDir);
        await fs.ensureDir(ralphDevDir);

        const installedFiles: string[] = [];
        const skippedFiles: string[] = [];

        // Define rules to install
        const rules = [
          { name: 'ralph-dev-workflow.md', content: WORKFLOW_RULES },
          { name: 'ralph-dev-principles.md', content: PRINCIPLES_RULES },
          { name: 'ralph-dev-commands.md', content: COMMANDS_RULES },
        ];

        // Install each rule file
        for (const rule of rules) {
          const filePath = path.join(rulesDir, rule.name);
          const exists = await fs.pathExists(filePath);

          if (exists && !options.force) {
            skippedFiles.push(rule.name);
          } else {
            await fs.writeFile(filePath, rule.content, 'utf-8');
            installedFiles.push(rule.name);
          }
        }

        const response = successResponse(
          {
            rulesDir,
            ralphDevDir,
            installedFiles,
            skippedFiles,
          },
          { operation: 'init' }
        );

        outputResponse(response, options.json, (data) => {
          console.log(chalk.green('✓ Ralph-dev initialized'));
          console.log();
          console.log(chalk.bold('Rules directory:'), data.rulesDir);
          console.log(chalk.bold('Workspace directory:'), data.ralphDevDir);
          console.log();

          if (data.installedFiles.length > 0) {
            console.log(chalk.bold('Installed rules:'));
            data.installedFiles.forEach((file: string) => {
              console.log(chalk.cyan(`  + ${file}`));
            });
          }

          if (data.skippedFiles.length > 0) {
            console.log();
            console.log(chalk.yellow('Skipped (already exist):'));
            data.skippedFiles.forEach((file: string) => {
              console.log(chalk.yellow(`  - ${file} (use --force to overwrite)`));
            });
          }

          console.log();
          console.log(chalk.dim('These rules help Claude Code maintain workflow context'));
          console.log(chalk.dim('even after context compression.'));
        });

        process.exit(ExitCode.SUCCESS);
      } catch (error) {
        handleError(Errors.fileSystemError('Failed to initialize ralph-dev', error), options.json);
      }
    });
}
