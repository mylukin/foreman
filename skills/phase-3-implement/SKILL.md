---
name: phase-3-implement
description: Autonomous implementation loop with TDD, fresh agents per task, and self-healing
allowed-tools: [Read, Write, Bash, Task, Grep, Glob]
user-invocable: false
---

# Phase 3: Implementation Loop

## Overview

Autonomously implement all tasks using TDD workflow, spawning fresh agents for each task, with automatic error recovery through Phase 4 healing.

## When to Use

Invoked by dev-orchestrator as Phase 3, after Phase 2 (Breakdown) completes and user approves task plan.

## Input

- Tasks directory: `.ralph-dev/tasks/`
- Task index: `.ralph-dev/tasks/index.json`
- Language config from index metadata

## Execution

### Step 0: Initialize CLI (Automatic)

**IMPORTANT:** This skill requires the Ralph-dev CLI. It will build automatically on first use.

```bash
# Bootstrap CLI - runs automatically, builds if needed
source ${CLAUDE_PLUGIN_ROOT}/shared/bootstrap-cli.sh

# Verify CLI is ready
echo "✓ CLI initialized"
echo ""
```

### Step 1: Verify Baseline Tests (Clean Starting Point)

**SAFETY CHECK:** Ensure all tests pass before starting implementation.

```bash
# Check if baseline verification is disabled via configuration
if [ "${RALPH_DEV_SKIP_BASELINE:-false}" = "true" ]; then
  echo "⏭️  Skipping baseline test verification (RALPH_DEV_SKIP_BASELINE=true)"
  echo ""
else
  echo "🧪 Verifying baseline tests..."
  echo ""

  # Detect test command from language configuration
  LANG_CONFIG=$(ralph-dev tasks list --json 2>/dev/null | jq -r '.metadata.languageConfig // empty')

if [ -z "$LANG_CONFIG" ]; then
  echo "⚠️  No language configuration found. Running detection..."
  DETECT_RESULT=$(ralph-dev detect --json 2>&1)

  if echo "$DETECT_RESULT" | jq -e '.success == true' > /dev/null 2>&1; then
    LANG_CONFIG=$(echo "$DETECT_RESULT" | jq -r '.data')
  else
    echo "❌ Language detection failed"
    echo "   Cannot determine test command automatically"
    echo ""
    echo "Skipping baseline test verification."
    echo "⚠️  WARNING: Starting implementation without verifying clean baseline"
    echo ""
  fi
fi

if [ -n "$LANG_CONFIG" ]; then
  # Extract test command from verify commands
  TEST_CMD=$(echo "$LANG_CONFIG" | jq -r '.verifyCommands[]? | select(contains("test"))' | head -1)

  if [ -z "$TEST_CMD" ]; then
    echo "⚠️  No test command configured for this language"
    echo "   Skipping baseline verification"
    echo ""
  else
    echo "📋 Detected test command: $TEST_CMD"
    echo ""
    echo "Running baseline tests..."
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

    # Run tests and capture output
    TEST_OUTPUT=$(eval "$TEST_CMD" 2>&1)
    TEST_STATUS=$?

    # Show full output
    echo "$TEST_OUTPUT"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""

    if [ $TEST_STATUS -eq 0 ]; then
      echo "✅ Baseline tests PASSED"
      echo "   All tests passing before implementation starts"
      echo "   Clean starting point verified"
    else
      echo "❌ Baseline tests FAILED"
      echo "   Exit code: $TEST_STATUS"
      echo ""
      echo "⚠️  WARNING: Tests are failing BEFORE implementation!"
      echo "   This indicates existing bugs in the codebase."
      echo ""
      echo "Options:"
      echo "  A) Fix failing tests first, then resume ralph-dev"
      echo "  B) Continue anyway (not recommended - hard to track new vs old failures)"
      echo "  C) Cancel ralph-dev"
      echo ""

      # Ask user what to do
      read -p "Choose option (A/B/C): " BASELINE_CHOICE

      case "$BASELINE_CHOICE" in
        A|a)
          echo ""
          echo "⏸️  Paused for fixing baseline tests"
          echo "   Fix the failing tests, then resume with: /ralph-dev resume"
          ralph-dev state update --phase implement --json > /dev/null
          exit 0
          ;;
        B|b)
          echo ""
          echo "⚠️  Continuing with failing baseline"
          echo "   This may make it difficult to distinguish new failures from old ones"
          echo ""
          ;;
        C|c)
          echo ""
          echo "❌ Ralph-dev cancelled by user"
          ralph-dev state clear --json > /dev/null
          exit 1
          ;;
        *)
          echo "Invalid choice. Cancelling for safety."
          exit 1
          ;;
      esac
    fi
  fi
fi
fi
echo ""
```

### Step 2: Initialize Implementation Loop (with JSON parsing)

**CRITICAL: Verify total task count BEFORE starting loop.**

```bash
# Get total task count from index using JSON output
TASKS_RESULT=$(ralph-dev tasks list --json)

# Parse JSON response and check success
if ! echo "$TASKS_RESULT" | jq -e '.success == true' > /dev/null 2>&1; then
  echo "❌ ERROR: Failed to get task list"
  ERROR_MSG=$(echo "$TASKS_RESULT" | jq -r '.error.message' 2>&1 || echo "Unknown error")
  echo "   Error: $ERROR_MSG"
  exit 1
fi

# Extract total tasks from JSON (for initial display only)
TOTAL_TASKS_INITIAL=$(echo "$TASKS_RESULT" | jq -r '.data.total')

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🚀 Starting implementation of $TOTAL_TASKS_INITIAL tasks..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Verify tasks exist
if [ "$TOTAL_TASKS_INITIAL" -eq 0 ]; then
  echo "❌ ERROR: No tasks found in index!"
  echo "   Run Phase 2 (breakdown) first."
  exit 1
fi

# Initialize iteration counter (for infinite loop protection)
# NOTE: Memory counters (COMPLETED_COUNT, etc.) removed for context-compression safety
# All progress tracking now queries CLI directly
LOOP_ITERATIONS=0
LOOP_START_TIME=$(date +%s)
MAX_LOOP_DURATION=$((24 * 3600))  # Safety: 24 hours max (prevents infinite loops)
```

### Step 2: Implementation Loop with Robust Verification

**CRITICAL: This loop MUST NOT exit until ALL tasks are accounted for.**

```bash
while true; do
  LOOP_ITERATIONS=$((LOOP_ITERATIONS + 1))

  # ═══════════════════════════════════════════
  # SAFETY CHECK: Prevent infinite loops (context-compression safe)
  # ═══════════════════════════════════════════
  CURRENT_TIME=$(date +%s)
  ELAPSED_TIME=$((CURRENT_TIME - LOOP_START_TIME))

  if [ $ELAPSED_TIME -gt $MAX_LOOP_DURATION ]; then
    echo "❌ CRITICAL ERROR: Loop exceeded $MAX_LOOP_DURATION seconds ($(($MAX_LOOP_DURATION / 3600)) hours)!"
    echo "   Elapsed time: $(($ELAPSED_TIME / 3600)) hours $(($ELAPSED_TIME % 3600 / 60)) minutes"
    echo "   This indicates a bug in task management or stuck task. Aborting."
    echo ""
    echo "Current state:"
    ralph-dev tasks list --json | jq -r '.data | "Total: \(.total), Completed: \(.completed), Failed: \(.failed), Pending: \(.pending)"'
    exit 1
  fi

  # ═══════════════════════════════════════════
  # STEP 1: Get next pending task with JSON parsing
  # ═══════════════════════════════════════════
  TASK_RESULT=$(ralph-dev tasks next --json 2>/dev/null)

  # ═══════════════════════════════════════════
  # STEP 2: Check if loop should exit
  # ═══════════════════════════════════════════
  # Check if command succeeded and returned a task
  if ! echo "$TASK_RESULT" | jq -e '.success == true and .data.task != null' > /dev/null 2>&1; then
    # No more tasks from CLI - VERIFY before exiting

    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "🔍 No more pending tasks. Verifying completion..."
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

    # ═══════════════════════════════════════════
    # RE-QUERY all state from CLI (context-compression safe)
    # ═══════════════════════════════════════════
    # Get fresh total task count (don't rely on memory variable)
    TOTAL_TASKS_ACTUAL=$(ralph-dev tasks list --json | jq -r '.data.total // 0')

    # Count tasks by status using JSON output
    PENDING_RESULT=$(ralph-dev tasks list --status pending --json)
    IN_PROGRESS_RESULT=$(ralph-dev tasks list --status in_progress --json)
    COMPLETED_RESULT=$(ralph-dev tasks list --status completed --json)
    FAILED_RESULT=$(ralph-dev tasks list --status failed --json)

    # Parse JSON responses
    PENDING_COUNT=$(echo "$PENDING_RESULT" | jq -r '.data.total // 0')
    IN_PROGRESS_COUNT=$(echo "$IN_PROGRESS_RESULT" | jq -r '.data.total // 0')
    ACTUAL_COMPLETED=$(echo "$COMPLETED_RESULT" | jq -r '.data.total // 0')
    ACTUAL_FAILED=$(echo "$FAILED_RESULT" | jq -r '.data.total // 0')

    # Calculate totals
    ACCOUNTED_FOR=$((ACTUAL_COMPLETED + ACTUAL_FAILED))

    echo "📊 Verification Results:"
    echo "   Total tasks:    $TOTAL_TASKS_ACTUAL"
    echo "   Completed:      $ACTUAL_COMPLETED"
    echo "   Failed:         $ACTUAL_FAILED"
    echo "   Pending:        $PENDING_COUNT"
    echo "   In Progress:    $IN_PROGRESS_COUNT"
    echo "   Accounted for:  $ACCOUNTED_FOR"
    echo ""

    # ═══════════════════════════════════════════
    # VERIFICATION: All tasks must be accounted for
    # ═══════════════════════════════════════════
    if [ $PENDING_COUNT -gt 0 ]; then
      echo "❌ CRITICAL ERROR: Still have $PENDING_COUNT pending tasks!"
      echo "   But CLI returned no next task. This is a bug."
      echo ""
      echo "Pending tasks:"
      ralph-dev tasks list --status pending
      echo ""
      echo "CANNOT proceed to Phase 5. Fix required."
      exit 1
    fi

    if [ $IN_PROGRESS_COUNT -gt 0 ]; then
      echo "❌ CRITICAL ERROR: Still have $IN_PROGRESS_COUNT tasks in_progress!"
      echo "   These tasks are stuck. This is a bug."
      echo ""
      echo "In-progress tasks:"
      ralph-dev tasks list --status in_progress
      echo ""
      echo "CANNOT proceed to Phase 5. Fix required."
      exit 1
    fi

    if [ $ACCOUNTED_FOR -ne $TOTAL_TASKS_ACTUAL ]; then
      echo "❌ CRITICAL ERROR: Task count mismatch!"
      echo "   Expected: $TOTAL_TASKS_ACTUAL tasks"
      echo "   Got:      $ACCOUNTED_FOR tasks (completed + failed)"
      echo "   Missing:  $((TOTAL_TASKS_ACTUAL - ACCOUNTED_FOR)) tasks"
      echo ""
      echo "CANNOT proceed to Phase 5. All tasks must be accounted for."
      exit 1
    fi

    # ✅ ALL CHECKS PASSED - Safe to exit
    echo "✅ Verification passed! All $TOTAL_TASKS_ACTUAL tasks accounted for."
    echo "   Completed: $ACTUAL_COMPLETED"
    echo "   Failed:    $ACTUAL_FAILED"
    echo ""
    break
  fi

  # ═══════════════════════════════════════════
  # STEP 3: Process next task
  # ═══════════════════════════════════════════

  # Extract task details from enhanced next output
  TASK_ID=$(echo "$TASK_JSON" | jq -r '.data.task.id // .data.id // "unknown"')
  TASK_DESC=$(echo "$TASK_JSON" | jq -r '.data.task.description // .data.description // "No description"')
  TASK_PRIORITY=$(echo "$TASK_JSON" | jq -r '.data.task.priority // .data.priority // 0')
  TASK_EST_MIN=$(echo "$TASK_JSON" | jq -r '.data.task.estimatedMinutes // .data.estimatedMinutes // 30')

  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "📝 Task: $TASK_ID (Priority P$TASK_PRIORITY)"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "📋 Description: $TASK_DESC"
  echo "⏱️  Estimated: ${TASK_EST_MIN} min"
  echo ""

  # Mark task as started
  ralph-dev tasks start "$TASK_ID"

  # Record start time
  START_TIME=$(date +%s)

  # ═══════════════════════════════════════════
  # STEP 4: Implement task using Task tool
  # ═══════════════════════════════════════════
  # See Step 3 for actual implementation (spawns subagent)
  # This is where you call: Use Task tool with subagent_type="general-purpose"

  echo "🤖 Spawning implementer subagent..."

  # Build full implementer prompt from template in Step 3
  # Then invoke Task tool (see Step 3 instructions)

  # IMPORTANT: Capture the full agent output
  # Example: Use Task tool and capture result in AGENT_OUTPUT variable
  # AGENT_OUTPUT will contain the agent's full response including structured result block

  # ═══════════════════════════════════════════
  # STEP 4.1: Parse structured result from agent output
  # ═══════════════════════════════════════════

  echo "📊 Parsing implementation result..."

  # Extract structured result block from agent output
  # Look for lines between ---IMPLEMENTATION RESULT--- and ---END IMPLEMENTATION RESULT---
  RESULT_BLOCK=$(echo "$AGENT_OUTPUT" | sed -n '/^---IMPLEMENTATION RESULT---$/,/^---END IMPLEMENTATION RESULT---$/p')

  # Parse individual fields from result block
  TASK_STATUS=$(echo "$RESULT_BLOCK" | grep "^status:" | cut -d: -f2 | tr -d ' ')
  VERIFICATION_PASSED=$(echo "$RESULT_BLOCK" | grep "^verification_passed:" | cut -d: -f2 | tr -d ' ')
  FILES_MODIFIED=$(echo "$RESULT_BLOCK" | grep "^files_modified:" | cut -d: -f2-)
  AGENT_NOTES=$(echo "$RESULT_BLOCK" | grep "^notes:" | cut -d: -f2-)

  # Validate result block exists
  if [ -z "$TASK_STATUS" ]; then
    echo "❌ CRITICAL ERROR: Agent did not return structured result!"
    echo "   This indicates the agent stopped unexpectedly."
    echo "   Common causes:"
    echo "   - Agent asked a question (violating autonomous decision-making rule)"
    echo "   - Agent encountered error and exited without result block"
    echo "   - Agent output format was incorrect"
    echo ""
    echo "Last 50 lines of agent output:"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "$AGENT_OUTPUT" | tail -50
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "Marking task as failed and continuing with next task..."
    ralph-dev tasks fail "$TASK_ID" --reason "Agent terminated without structured result (possible question or crash)"
    IMPLEMENTATION_SUCCESS=false
  elif [ "$TASK_STATUS" = "success" ] && [ "$VERIFICATION_PASSED" = "true" ]; then
    # Task succeeded
    IMPLEMENTATION_SUCCESS=true
    echo "✅ Agent reported success"
    if [ -n "$AGENT_NOTES" ]; then
      echo "   Notes: $AGENT_NOTES"
    fi
  else
    # Task failed - will attempt healing
    IMPLEMENTATION_SUCCESS=false
    echo "⚠️  Agent reported failure or verification did not pass"
    echo "   Status: $TASK_STATUS"
    echo "   Verification passed: $VERIFICATION_PASSED"
    if [ -n "$AGENT_NOTES" ]; then
      echo "   Notes: $AGENT_NOTES"
    fi
  fi

  echo ""

  # Record end time
  END_TIME=$(date +%s)
  DURATION=$((END_TIME - START_TIME))
  DURATION_MIN=$((DURATION / 60))
  DURATION_SEC=$((DURATION % 60))
  DURATION_STR="${DURATION_MIN}m ${DURATION_SEC}s"

  # ═══════════════════════════════════════════
  # STEP 5: Handle result (based on structured output)
  # ═══════════════════════════════════════════
  if [ "$IMPLEMENTATION_SUCCESS" = true ]; then
    # Task succeeded - persist to CLI
    ralph-dev tasks done "$TASK_ID" --duration "$DURATION_STR"

    echo "✅ $TASK_ID completed"
    echo "   Duration: $DURATION_STR"
    echo ""
  else
    # Task failed - attempt auto-healing
    echo "⚠️  Implementation failed for $TASK_ID"
    echo ""

    echo "🔧 Attempting auto-heal..."
    # Invoke phase-4-heal (see Step 4 for details)
    # Use Skill tool to invoke "phase-4-heal"

    HEAL_SUCCESS=false  # Replace with actual heal result

    if [ "$HEAL_SUCCESS" = true ]; then
      # Healing succeeded - persist to CLI
      ralph-dev tasks done "$TASK_ID" --duration "$DURATION_STR (healed)"

      echo "✅ Auto-healed successfully!"
      echo ""
    else
      # Healing failed - mark as failed and continue
      ralph-dev tasks fail "$TASK_ID" --reason "Implementation and healing failed"

      echo "❌ Could not heal. Marked as failed."
      echo "   Will continue with remaining tasks."
      echo ""
    fi
  fi

  # ═══════════════════════════════════════════
  # STEP 6: Show progress (query CLI, context-compression safe)
  # ═══════════════════════════════════════════
  # Query actual counts from CLI (don't rely on memory variables)
  PROGRESS_TOTAL=$(ralph-dev tasks list --json | jq -r '.data.total // 0')
  PROGRESS_COMPLETED=$(ralph-dev tasks list --status completed --json | jq -r '.data.total // 0')
  PROGRESS_FAILED=$(ralph-dev tasks list --status failed --json | jq -r '.data.total // 0')
  PROGRESS_PROCESSED=$((PROGRESS_COMPLETED + PROGRESS_FAILED))

  # Calculate progress percentage safely
  if [ "$PROGRESS_TOTAL" -gt 0 ]; then
    PROGRESS_PCT=$((PROGRESS_PROCESSED * 100 / PROGRESS_TOTAL))
  else
    PROGRESS_PCT=0
  fi

  echo "📊 Progress: $PROGRESS_PROCESSED/$PROGRESS_TOTAL tasks ($PROGRESS_PCT%)"
  echo "   ✅ Completed: $PROGRESS_COMPLETED"
  echo "   ❌ Failed: $PROGRESS_FAILED"
  echo ""

  # ═══════════════════════════════════════════
  # STEP 7: Continue to next task
  # ═══════════════════════════════════════════
  # Loop continues automatically to process next task
  # Exit condition is handled in STEP 2 (when CLI returns no more tasks)
  #
  # Note: We removed the old "TOTAL_PROCESSED >= TOTAL_TASKS" check here
  # because it relied on memory variables that are lost during context compression.
  # The proper exit logic is in STEP 2 where we verify all tasks from CLI.

  # ═══════════════════════════════════════════
  # STEP 8: Continue loop (EXPLICIT INSTRUCTION)
  # ═══════════════════════════════════════════
  # Go to next iteration (NOT step 1, go back to while loop start)
  # Continue to STEP 1 in loop (get next pending task)
  #
  # DO NOT stop the loop for:
  #   - Agent errors (caught by result parsing)
  #   - Verification failures (will attempt healing)
  #   - Missing dependencies (agent handles autonomously)
  #   - Any unexpected agent output (caught by result validation)
  #   - Agent asking questions (caught as missing result block)
  #
  # ONLY stop the loop when:
  #   - All tasks accounted for: completed + failed == total tasks
  #   - OR infinite loop safety limit reached
  #
  # Continue to next task now...
done
```

**IMPORTANT NOTES:**

1. **Loop MUST NOT exit** until `completed + failed == total tasks`
2. **Verification is mandatory** before breaking loop
3. **If tasks are stuck** in pending/in_progress, loop will error (not silently fail)
4. **Infinite loop protection** prevents runaway execution
5. **Each task MUST use Task tool** to spawn subagent (see Step 3)
6. **Agent questions are caught** by result parsing - loop continues automatically

### Step 3: Implement Single Task

**For EACH task, you MUST spawn a fresh implementer agent using the Task tool.**

**CRITICAL:** Do NOT implement tasks yourself in the main session. ALWAYS use Task tool to spawn subagents.

**Implementation Flow:**

1. **Get task details from CLI:**
   ```bash
   TASK_JSON=$(ralph-dev tasks next --json)
   TASK_ID=$(echo "$TASK_JSON" | jq -r '.data.task.id // .data.id')
   ```

2. **Build implementer prompt:**
   Read the full task file content and create a comprehensive prompt that includes:
   - Task ID, description, module
   - Full acceptance criteria
   - Test requirements and patterns
   - Dependencies
   - TDD workflow instructions (see template below)

3. **Spawn fresh implementer subagent using Task tool:**

   **MANDATORY: Use the Task tool with these parameters:**

   ```
   Tool: Task
   Parameters:
     subagent_type: "general-purpose"
     description: "Implement task: {task.id}"
     prompt: "{full_implementer_prompt_from_template_below}"
     run_in_background: false  (blocking - wait for completion)
   ```

   **DO NOT skip this step. DO NOT implement in main session.**

4. **Wait for subagent to complete:**
   - The subagent will follow TDD workflow
   - Write tests first (RED phase)
   - Implement code (GREEN phase)
   - Refactor (REFACTOR phase)
   - Verify all tests pass
   - Report results

5. **Check subagent result:**
   - If successful → Mark task as done using CLI
   - If failed → Invoke Phase 4 (heal) for auto-recovery
   - Update progress and continue to next task

**Implementer Agent Prompt Template:**

Use this exact template when spawning implementer agents:

```markdown
You are an autonomous implementer agent for a single task in an ralph-dev workflow.

## TASK INFORMATION

**Task ID:** {task.id}
**Module:** {task.module}
**Priority:** P{task.priority}
**Estimated:** {task.estimatedMinutes} minutes

**Description:**
{task.description}

**Acceptance Criteria:**
{list each criterion with checkboxes}
- [ ] {criterion 1}
- [ ] {criterion 2}
...

**Dependencies:** {list or "None"}
**Test Pattern:** {task.testRequirements.unit.pattern}
**Test Required:** {task.testRequirements.unit.required}

---

## TDD IRON LAW (MANDATORY - NO EXCEPTIONS)

```
NO PRODUCTION CODE WITHOUT A FAILING TEST FIRST
```

**If you wrote code before the test → DELETE it completely. Start over.**

This is non-negotiable. No "reference", no "adaptation", no "keeping it".
DELETE means DELETE.

## WORKFLOW (TDD)

### 1. RED Phase - Write Failing Tests

- Create test file: {test_pattern}
- Write ONE minimal test for FIRST acceptance criterion
- Run test → MUST show failure (not error, actual test failure)
- Verify failure message is expected (feature missing, not typo)
- **If test passes immediately → You're testing existing code, fix the test**
- **If test errors → Fix error first, then verify it fails correctly**

### 2. GREEN Phase - Implement Minimum Code

- Write SMALLEST amount of code to pass the ONE test
- No extra features beyond what the test requires
- No premature optimization
- No refactoring of other code
- Run tests → they MUST pass
- **If test still fails → Fix code, NOT test**

### 3. REFACTOR Phase - Clean Code (ONLY after GREEN)

- Improve naming, structure
- Remove duplication
- Apply design patterns if appropriate
- Run tests after EACH change → must stay passing
- **If tests fail during refactor → Revert change immediately**

### 4. REPEAT - Next Test

- Go back to RED for next acceptance criterion
- One test at a time, one feature at a time
- Complete RED-GREEN-REFACTOR cycle for each

### 5. VERIFY - Final Check

Before marking complete, verify:
- [ ] All tests pass ✓
- [ ] Coverage >80% ✓
- [ ] All acceptance criteria satisfied ✓
- [ ] No linting errors ✓
- [ ] Output pristine (no warnings, no console.log) ✓

## VERIFICATION CHECKLIST (MANDATORY)

Before marking task complete, verify EVERY item:

- [ ] Every new function/method has a test
- [ ] Watched each test fail BEFORE implementing (saw RED)
- [ ] Each test failed for expected reason (feature missing, not typo)
- [ ] Wrote minimal code to pass each test (no over-engineering)
- [ ] All tests pass (run full test suite)
- [ ] No test was written after the code (all tests-first)
- [ ] Tests use real code, not mocks (unless unavoidable)
- [ ] Edge cases and errors covered
- [ ] No production code exists without a corresponding test

**Cannot check all boxes? → Start over with TDD. No exceptions.**

## RED FLAGS - STOP IMMEDIATELY

If you catch yourself:
- Writing code before test
- Test passes on first run (didn't see it fail)
- Adding multiple tests before any implementation
- Implementing features not required by current test
- "I'll add tests after to verify it works"
- "This is too simple to test"
- "I already manually tested it"
- Keeping code written before tests "as reference"

**ALL of these mean: DELETE CODE. Start over with TDD.**

## CONSTRAINTS

- Only implement what's specified in acceptance criteria
- Follow TDD Iron Law strictly (tests ALWAYS first, no exceptions)
- Use project's language/framework conventions
- Keep code clean and simple
- One test → One minimal implementation → Refactor → Repeat

## AUTONOMOUS DECISION MAKING (MANDATORY)

**You MUST make decisions autonomously. NEVER ask the user questions during implementation.**

| Situation | Autonomous Action |
|-----------|-------------------|
| Ambiguous requirement | Make a reasonable interpretation, document in code comments, proceed |
| Missing file or dependency | Create it with sensible defaults, proceed |
| Multiple implementation options | Choose the simplest approach that satisfies acceptance criteria, proceed |
| Unclear acceptance criteria | Interpret literally based on PRD context, proceed |
| Test failure | Debug and fix, proceed (healing phase will help if needed) |
| Verification failure | Return result with notes, let orchestrator decide |
| Any unexpected error | Log it in output notes, proceed with best effort |

### Forbidden Phrases (NEVER output these)

❌ "Should I...?"
❌ "Do you want me to...?"
❌ "Which approach would you prefer?"
❌ "I need clarification on..."
❌ "Before I proceed, could you..."
❌ "Can you confirm..."
❌ "What should I do about..."

**Why:** Questions stop your execution. The orchestrator will handle escalation if truly blocked.
Make reasonable decisions, document them, and proceed. The code review phase will catch issues.

## OUTPUT REQUIREMENTS (MANDATORY)

**You MUST output results in this EXACT format at the end of your response:**

```yaml
---IMPLEMENTATION RESULT---
task_id: {task.id}
status: success|failed
verification_passed: true|false
tests_passing: {number passing}/{total tests}
coverage: {percentage}%
files_modified: {comma-separated list}
duration: {actual time}
acceptance_criteria_met: {X/Y criteria satisfied}
notes: {brief summary of what was done, decisions made, or issues encountered}
---END IMPLEMENTATION RESULT---
```

**Status definitions:**
- `success`: All acceptance criteria met, all tests pass
- `failed`: Could not complete due to blocking issue, tests fail

**Notes field:** Use this to document:
- Decisions you made autonomously
- Alternative approaches you considered
- Any assumptions made from ambiguous requirements
- Issues that need review (but didn't block you)

**CRITICAL:** Always output the result block at the end of your response, even if you encounter errors.
This tells the orchestrator what happened and allows it to continue.

**Additional reporting:**
When done, also report in natural language:
1. **Files created/modified** (list all)
2. **Test results** (X/Y tests passed, Z% coverage)
3. **Duration** (actual time spent)
4. **Issues encountered** (if any)
5. **All acceptance criteria met** (confirm with checkboxes)

Start with RED phase now.
```

### Step 4: Invoke Healing (When Implementer Fails)

**When a task implementation fails, invoke Phase 4 (Heal) for automatic error recovery.**

**Auto-Healing Flow:**

1. **Capture error details:**
   - Extract error message from implementer agent output
   - Identify error type (dependency missing, syntax error, test failure, etc.)
   - Note which acceptance criteria failed

2. **Invoke phase-4-heal skill:**

   **Use Skill tool to invoke healing:**

   ```
   Tool: Skill
   Parameters:
     skill: "phase-4-heal"
     args: "--task-id {task.id} --error '{error_message}'"
   ```

   The heal skill will:
   - WebSearch for error solution
   - Apply fix automatically
   - Re-run tests
   - Return structured result with success/failure status

3. **Parse healing result:**

   **CRITICAL:** Extract structured result from heal skill output:

   ```bash
   # Capture heal skill output
   HEAL_OUTPUT="<captured from Skill tool result>"

   # Extract structured result block
   HEAL_RESULT_BLOCK=$(echo "$HEAL_OUTPUT" | sed -n '/^---HEALING RESULT---$/,/^---END HEALING RESULT---$/p')

   # Parse fields
   HEAL_STATUS=$(echo "$HEAL_RESULT_BLOCK" | grep "^status:" | cut -d: -f2 | tr -d ' ')
   HEAL_VERIFICATION=$(echo "$HEAL_RESULT_BLOCK" | grep "^verification_passed:" | cut -d: -f2 | tr -d ' ')
   HEAL_ATTEMPTS=$(echo "$HEAL_RESULT_BLOCK" | grep "^attempts:" | cut -d: -f2 | tr -d ' ')
   HEAL_NOTES=$(echo "$HEAL_RESULT_BLOCK" | grep "^notes:" | cut -d: -f2-)

   # Validate and handle result
   if [ -z "$HEAL_STATUS" ]; then
     echo "❌ ERROR: Heal skill did not return structured result"
     echo "   Marking task as failed..."
     HEAL_SUCCESS=false
   elif [ "$HEAL_STATUS" = "success" ] && [ "$HEAL_VERIFICATION" = "true" ]; then
     echo "✅ Healing succeeded after $HEAL_ATTEMPTS attempt(s)"
     if [ -n "$HEAL_NOTES" ]; then
       echo "   Notes: $HEAL_NOTES"
     fi
     HEAL_SUCCESS=true
   else
     echo "❌ Healing failed"
     echo "   Status: $HEAL_STATUS"
     echo "   Attempts: $HEAL_ATTEMPTS"
     if [ -n "$HEAL_NOTES" ]; then
       echo "   Notes: $HEAL_NOTES"
     fi
     HEAL_SUCCESS=false
   fi
   ```

4. **Handle healing result:**
   - If healed successfully (HEAL_SUCCESS=true):
     * Mark task as completed (persisted to CLI)
     * Log to debug.log
     * Continue to next task

   - If healing failed (HEAL_SUCCESS=false):
     * Mark task as failed (persisted to CLI)
     * Log detailed error to debug.log
     * Continue to next task (don't block entire workflow)

**IMPORTANT:** Auto-healing should be attempted ONCE per task failure. If healing fails, mark task as failed and move on. Do NOT retry indefinitely.

**Note:** Progress tracking is handled automatically in STEP 6, which queries CLI for actual counts instead of using memory counters.

### Step 5: Final Summary

```bash
# Query final statistics from CLI (context-compression safe)
FINAL_TOTAL=$(ralph-dev tasks list --json | jq -r '.data.total // 0')
FINAL_COMPLETED=$(ralph-dev tasks list --status completed --json | jq -r '.data.total // 0')
FINAL_FAILED=$(ralph-dev tasks list --status failed --json | jq -r '.data.total // 0')

# Calculate success rate safely
if [ "$FINAL_TOTAL" -gt 0 ]; then
  SUCCESS_RATE=$((FINAL_COMPLETED * 100 / FINAL_TOTAL))
else
  SUCCESS_RATE=0
fi

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎯 Implementation Complete!"
echo ""
echo "📊 Final Statistics:"
echo "   Total tasks: $FINAL_TOTAL"
echo "   ✅ Completed: $FINAL_COMPLETED"
echo "   ❌ Failed: $FINAL_FAILED"
echo "   Success rate: ${SUCCESS_RATE}%"
echo ""

if [ "$FINAL_FAILED" -gt 0 ]; then
  echo "⚠️  Some tasks failed. They are marked with status='failed'."
  echo "   Review failed tasks in .ralph-dev/tasks/"
  echo ""
fi

echo "▶️  Next: Phase 5 (Deliver) - Quality gates and PR creation"
```

### Step 6: Update State

```bash
# Update state to deliver phase
ralph-dev state update --phase deliver
```

### Step 7: Return Result

```yaml
---PHASE RESULT---
phase: implement
status: complete
completed: {N}
failed: {M}
auto_healed: {K}
success_rate: {X}%
next_phase: deliver
summary: |
  Implemented {N}/{total} tasks successfully.
  Auto-healed {K} errors.
  {M} tasks failed and need manual attention.
  Ready for quality verification and delivery.
---END PHASE RESULT---
```

## Progress Updates

Show progress after each task:

```
✅ auth.signup.ui completed (3/35)
   Duration: 4m 32s
   Tests: 8/8 passed ✓
   Coverage: 87%
   Files:
     - src/components/SignupForm.tsx (new)
     - tests/components/SignupForm.test.tsx (new)
   Next: auth.signup.validation
```

For errors with healing:

```
⚠️  Error in auth.signup.api
    Module 'bcrypt' not found
🔧 Auto-healing...
   Step 1: WebSearch "npm bcrypt install"
   Step 2: npm install bcrypt@5.1.0
   Step 3: Verify - npm test (✅ 24/24 passed)
✅ Healed successfully (1m 12s)
```

## Implementer Agent Template

When spawning implementer agents, use this prompt template:

```markdown
You are an autonomous implementer agent for a single task.

TASK: {task.id}
DESCRIPTION: {task.description}

ACCEPTANCE CRITERIA:
{criteria-list}

TEST REQUIREMENTS:
- Pattern: {test-pattern}
- Required: {yes/no}
- Min coverage: 80%

## TDD IRON LAW (MANDATORY - NO EXCEPTIONS)

```
NO PRODUCTION CODE WITHOUT A FAILING TEST FIRST
```

**If you wrote code before the test → DELETE it completely. Start over.**

This is non-negotiable. No "reference", no "adaptation", no "keeping it".
DELETE means DELETE.

WORKFLOW (TDD):

1. RED Phase - Write Failing Tests:
   - Create test file: {test-pattern}
   - Write ONE minimal test for FIRST acceptance criterion
   - Run test → MUST show failure (not error, actual test failure)
   - Verify failure message is expected (feature missing, not typo)
   - **If test passes immediately → You're testing existing code, fix the test**
   - **If test errors → Fix error first, then verify it fails correctly**

2. GREEN Phase - Implement Minimum Code:
   - Write SMALLEST amount of code to pass the ONE test
   - No extra features beyond what the test requires
   - No premature optimization
   - No refactoring of other code
   - Run tests → they MUST pass
   - **If test still fails → Fix code, NOT test**

3. REFACTOR Phase - Clean Code (ONLY after GREEN):
   - Improve naming, structure
   - Remove duplication
   - Apply design patterns if appropriate
   - Run tests after EACH change → must stay passing
   - **If tests fail during refactor → Revert change immediately**

4. REPEAT - Next Test:
   - Go back to RED for next acceptance criterion
   - One test at a time, one feature at a time
   - Complete RED-GREEN-REFACTOR cycle for each

5. VERIFY - Final Check:
   - All tests pass ✓
   - Coverage >80% ✓
   - All acceptance criteria satisfied ✓
   - No linting errors ✓
   - Output pristine (no warnings, no console.log) ✓

## VERIFICATION CHECKLIST (MANDATORY)

Before marking task complete, verify EVERY item:

- [ ] Every new function/method has a test
- [ ] Watched each test fail BEFORE implementing (saw RED)
- [ ] Each test failed for expected reason (feature missing, not typo)
- [ ] Wrote minimal code to pass each test (no over-engineering)
- [ ] All tests pass (run full test suite)
- [ ] No test was written after the code (all tests-first)
- [ ] Tests use real code, not mocks (unless unavoidable)
- [ ] Edge cases and errors covered
- [ ] No production code exists without a corresponding test

**Cannot check all boxes? → Start over with TDD. No exceptions.**

## RED FLAGS - STOP IMMEDIATELY

If you catch yourself:
- Writing code before test
- Test passes on first run (didn't see it fail)
- Adding multiple tests before any implementation
- Implementing features not required by current test
- "I'll add tests after to verify it works"
- "This is too simple to test"
- "I already manually tested it"
- Keeping code written before tests "as reference"

**ALL of these mean: DELETE CODE. Start over with TDD.**

CONSTRAINTS:
- Only implement what's specified in acceptance criteria
- Follow TDD Iron Law strictly (tests ALWAYS first, no exceptions)
- Use project's language/framework conventions
- Keep code clean and simple
- One test → One minimal implementation → Refactor → Repeat

OUTPUT:
When done, report:
- Files created/modified
- Test results (pass count, coverage %)
- Duration
- Any issues encountered
```

## Error Handling

| Error | Action |
|-------|--------|
| No tasks found | Prompt to run Phase 2 |
| Task implementation fails | Invoke Phase 4 (heal) |
| Healing fails (max 3 attempts) | Mark task as failed, continue |
| All tasks fail | Continue to Phase 5, report failures |
| User interrupts | Save state, allow resume |

## Example Flow

```
🚀 Starting implementation of 35 tasks...

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📝 Task: setup.scaffold (Priority 1)
📋 Description: Initialize project structure
⏱️  Estimated: 15min

🤖 Spawning implementer agent...
✅ setup.scaffold completed (1/35)
   Duration: 3m 47s

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📝 Task: auth.signup.ui (Priority 5)
📋 Description: Create signup form component
⏱️  Estimated: 20min

🤖 Spawning implementer agent...
⚠️  Error: Module 'react-hook-form' not found
🔧 Invoking auto-heal...
✅ Healed successfully! (1m 23s)
✅ auth.signup.ui completed (5/35)
   Duration: 6m 12s (healed)

📊 Progress: 5/35 tasks (14%)
   ✅ Completed: 5
   ❌ Failed: 0
   🔧 Auto-healed: 1

[... continues for all 35 tasks ...]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎯 Implementation Complete!

📊 Final Statistics:
   Total tasks: 35
   ✅ Completed: 33
   ❌ Failed: 2
   🔧 Auto-healed: 4
   Success rate: 94%

▶️  Next: Phase 5 (Deliver)
```

## Rules

1. **Fresh agent per task** - Prevent context pollution
2. **TDD workflow mandatory** - Tests before implementation
3. **Auto-heal on first error** - Try to fix automatically
4. **Mark failed after heal attempts** - Continue to next task
5. **Show progress regularly** - After each task and every 3 tasks
6. **Never skip tasks** - Process in priority order
7. **Save state continuously** - Can resume anytime

## Notes

- Implementation quality depends on clear acceptance criteria
- Fresh agents ensure no context bleed between tasks
- Auto-healing uses Phase 4 (WebSearch-powered)
- Failed tasks can be manually fixed and re-run later
- Progress is persisted in task files and state.json
