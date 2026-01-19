---
name: phase-3-implement
description: Autonomous implementation loop with TDD, fresh agents per task, and self-healing
allowed-tools: [Read, Write, Bash, Task, Grep, Glob]
user-invocable: false
---

# Phase 3: Implementation Loop

## Overview

Autonomously implement all tasks using TDD workflow, spawning fresh agents for each task, with automatic error recovery through Phase 4 healing.

使用 TDD 工作流自主实现所有任务，为每个任务生成新的 agent，通过 Phase 4 自愈进行自动错误恢复。

## When to Use

Invoked by dev-orchestrator as Phase 3, after Phase 2 (Breakdown) completes and user approves task plan.

## Input

- Tasks directory: `.ralph-dev/tasks/`
- Task index: `.ralph-dev/tasks/index.json`
- Language config from index metadata

## Execution

### Step 0: Initialize CLI (Automatic)

**IMPORTANT:** This skill requires the Foreman CLI. It will build automatically on first use.

> **重要：**此技能需要 Foreman CLI。首次使用时将自动构建。

```bash
# Bootstrap CLI - runs automatically, builds if needed
source ${CLAUDE_PLUGIN_ROOT}/shared/bootstrap-cli.sh

# Verify CLI is ready
echo "✓ CLI initialized"
echo ""
```

### Step 1: Initialize Implementation Loop

**CRITICAL: Verify total task count BEFORE starting loop.**

```bash
# Get total task count from index
TOTAL_TASKS=$(ralph-dev tasks list --json

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🚀 Starting implementation of $TOTAL_TASKS tasks..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Verify tasks exist
if [ "$TOTAL_TASKS" -eq 0 ]; then
  echo "❌ ERROR: No tasks found in index!"
  echo "   Run Phase 2 (breakdown) first."
  exit 1
fi

# Initialize counters
COMPLETED_COUNT=0
FAILED_COUNT=0
HEALED_COUNT=0
LOOP_ITERATIONS=0
MAX_ITERATIONS=$((TOTAL_TASKS * 2))  # Safety: prevent infinite loops
```

### Step 2: Implementation Loop with Robust Verification

**CRITICAL: This loop MUST NOT exit until ALL tasks are accounted for.**

```bash
while true; do
  LOOP_ITERATIONS=$((LOOP_ITERATIONS + 1))

  # Safety check: prevent infinite loops
  if [ $LOOP_ITERATIONS -gt $MAX_ITERATIONS ]; then
    echo "❌ CRITICAL ERROR: Loop exceeded $MAX_ITERATIONS iterations!"
    echo "   Expected $TOTAL_TASKS tasks, but processed $LOOP_ITERATIONS times."
    echo "   This indicates a bug in task management. Aborting."
    exit 1
  fi

  # ═══════════════════════════════════════════
  # STEP 1: Get next pending task
  # ═══════════════════════════════════════════
  TASK_JSON=$(ralph-dev tasks next --json 2>/dev/null)

  # ═══════════════════════════════════════════
  # STEP 2: Check if loop should exit
  # ═══════════════════════════════════════════
  if [ -z "$TASK_JSON" ] || echo "$TASK_JSON"
    # No more tasks from CLI - VERIFY before exiting

    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "🔍 No more pending tasks. Verifying completion..."
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

    # Count tasks by status
    PENDING_COUNT=$(ralph-dev tasks list --status pending --json 2>/dev/null
    IN_PROGRESS_COUNT=$(ralph-dev tasks list --status in_progress --json 2>/dev/null
    ACTUAL_COMPLETED=$(ralph-dev tasks list --status completed --json 2>/dev/null
    ACTUAL_FAILED=$(ralph-dev tasks list --status failed --json 2>/dev/null

    # Calculate totals
    ACCOUNTED_FOR=$((ACTUAL_COMPLETED + ACTUAL_FAILED))

    echo "📊 Verification Results:"
    echo "   Total tasks:    $TOTAL_TASKS"
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

    if [ $ACCOUNTED_FOR -ne $TOTAL_TASKS ]; then
      echo "❌ CRITICAL ERROR: Task count mismatch!"
      echo "   Expected: $TOTAL_TASKS tasks"
      echo "   Got:      $ACCOUNTED_FOR tasks (completed + failed)"
      echo "   Missing:  $((TOTAL_TASKS - ACCOUNTED_FOR)) tasks"
      echo ""
      echo "CANNOT proceed to Phase 5. All tasks must be accounted for."
      exit 1
    fi

    # ✅ ALL CHECKS PASSED - Safe to exit
    echo "✅ Verification passed! All $TOTAL_TASKS tasks accounted for."
    echo "   Completed: $ACTUAL_COMPLETED"
    echo "   Failed:    $ACTUAL_FAILED"
    echo ""
    break
  fi

  # ═══════════════════════════════════════════
  # STEP 3: Process next task
  # ═══════════════════════════════════════════

  # Extract task details from enhanced next output
  TASK_ID=$(echo "$TASK_JSON"
  TASK_DESC=$(echo "$TASK_JSON"
  TASK_PRIORITY=$(echo "$TASK_JSON"
  TASK_EST_MIN=$(echo "$TASK_JSON"

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

  # For now, this is a placeholder showing the flow
  # The actual Task tool invocation is documented in Step 3

  # Simulating task completion for pseudocode flow
  # In real execution, you'll capture result from Task tool
  IMPLEMENTATION_SUCCESS=true  # Replace with actual Task tool result

  # Record end time
  END_TIME=$(date +%s)
  DURATION=$((END_TIME - START_TIME))
  DURATION_MIN=$((DURATION / 60))
  DURATION_SEC=$((DURATION % 60))
  DURATION_STR="${DURATION_MIN}m ${DURATION_SEC}s"

  # ═══════════════════════════════════════════
  # STEP 5: Handle result
  # ═══════════════════════════════════════════
  if [ "$IMPLEMENTATION_SUCCESS" = true ]; then
    # Task succeeded
    COMPLETED_COUNT=$((COMPLETED_COUNT + 1))
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
      # Healing succeeded
      COMPLETED_COUNT=$((COMPLETED_COUNT + 1))
      HEALED_COUNT=$((HEALED_COUNT + 1))
      ralph-dev tasks done "$TASK_ID" --duration "$DURATION_STR (healed)"

      echo "✅ Auto-healed successfully!"
      echo ""
    else
      # Healing failed - mark as failed and continue
      FAILED_COUNT=$((FAILED_COUNT + 1))
      ralph-dev tasks fail "$TASK_ID" --reason "Implementation and healing failed"

      echo "❌ Could not heal. Marked as failed."
      echo "   Will continue with remaining tasks."
      echo ""
    fi
  fi

  # ═══════════════════════════════════════════
  # STEP 6: Show progress
  # ═══════════════════════════════════════════
  TOTAL_PROCESSED=$((COMPLETED_COUNT + FAILED_COUNT))
  PROGRESS_PCT=$((TOTAL_PROCESSED * 100 / TOTAL_TASKS))

  echo "📊 Progress: $TOTAL_PROCESSED/$TOTAL_TASKS tasks ($PROGRESS_PCT%)"
  echo "   ✅ Completed: $COMPLETED_COUNT"
  echo "   ❌ Failed: $FAILED_COUNT"
  if [ $HEALED_COUNT -gt 0 ]; then
    echo "   🔧 Auto-healed: $HEALED_COUNT"
  fi
  echo ""

  # ═══════════════════════════════════════════
  # STEP 7: Safety check - verify we're making progress
  # ═══════════════════════════════════════════
  if [ $TOTAL_PROCESSED -ge $TOTAL_TASKS ]; then
    echo "✅ All $TOTAL_TASKS tasks processed. Exiting loop."
    break
  fi
done
```

**IMPORTANT NOTES:**

1. **Loop MUST NOT exit** until `completed + failed == total tasks`
2. **Verification is mandatory** before breaking loop
3. **If tasks are stuck** in pending/in_progress, loop will error (not silently fail)
4. **Infinite loop protection** prevents runaway execution
5. **Each task MUST use Task tool** to spawn subagent (see Step 3)

### Step 3: Implement Single Task

**For EACH task, you MUST spawn a fresh implementer agent using the Task tool.**

**CRITICAL:** Do NOT implement tasks yourself in the main session. ALWAYS use Task tool to spawn subagents.

**Implementation Flow:**

1. **Get task details from CLI:**
   ```bash
   TASK_JSON=$(ralph-dev tasks next --json)
   TASK_ID=$(echo "$TASK_JSON"
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

## OUTPUT REQUIREMENTS

When done, report:
1. **Files created/modified** (list all)
2. **Test results** (X/Y tests passed, Z% coverage)
3. **Duration** (actual time spent)
4. **Issues encountered** (if any)
5. **All acceptance criteria met** (confirm with checkboxes)

**CRITICAL:** Do NOT exit until ALL acceptance criteria are satisfied and ALL tests pass.

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
   - Return success/failure

3. **Check healing result:**
   - If healed successfully (tests pass):
     * Mark task as completed
     * Increment auto-healed counter
     * Log to debug.log
     * Continue to next task

   - If healing failed (still errors after 3 attempts):
     * Mark task as failed
     * Log detailed error to debug.log
     * Continue to next task (don't block entire workflow)

4. **Update progress:**
   ```bash
   echo "🔧 Auto-healed: $HEALED_COUNT errors"
   ```

**IMPORTANT:** Auto-healing should be attempted ONCE per task failure. If healing fails, mark task as failed and move on. Do NOT retry indefinitely.

### Step 5: Final Summary

```bash
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎯 Implementation Complete!"
echo ""
echo "📊 Final Statistics:"
echo "   Total tasks: $TASK_COUNT"
echo "   ✅ Completed: $COMPLETED"
echo "   ❌ Failed: $FAILED"
echo "   🔧 Auto-healed: $HEALED"
echo "   Success rate: $((COMPLETED * 100 / TASK_COUNT))%"
echo ""

if [ $FAILED -gt 0 ]; then
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
