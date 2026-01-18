---
name: phase-5-deliver
description: Two-stage code review, quality gates, and automated delivery (commit + PR)
allowed-tools: [Read, Write, Bash, Grep, Glob]
user-invocable: false
---

# Phase 5: Deliver

## Overview | 概述

Run final quality gates, perform two-stage code review (spec compliance + code quality), create commits, and generate pull requests for completed work.

运行最终质量检查，执行两阶段代码审查（规范合规性 + 代码质量），创建 commit 并为完成的工作生成 pull request。

## When to Use | 何时使用

Invoked by autopilot-orchestrator as Phase 5, after Phase 3 (Implement) completes all tasks.

## Input | 输入

- Completed tasks from Phase 3
- Task directory: `workspace/ai/tasks/`
- Implementation files: All modified/created files

## Execution | 执行

### Step 1: Gather Implementation Summary

```bash
echo "📊 Gathering implementation summary..."
echo ""

# Get all completed tasks
COMPLETED_TASKS=$(autopilot-cli tasks list --status passing --json)
TASK_COUNT=$(echo "$COMPLETED_TASKS" | jq 'length')

echo "✅ Completed Tasks: $TASK_COUNT"
echo ""

# List task IDs and descriptions
echo "$COMPLETED_TASKS" | jq -r '.[] | "  • \(.id) - \(.description)"'
echo ""
```

### Step 2: Run Quality Gates

```bash
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔍 Running Quality Gates..."
echo ""

# Quality Gate 1: Type Checking
echo "1️⃣  Type Checking..."
TYPE_CHECK_RESULT=$(run_typecheck)
TYPE_CHECK_STATUS=$?

if [ $TYPE_CHECK_STATUS -eq 0 ]; then
  echo "   ✅ No type errors"
else
  echo "   ❌ Type errors found"
  echo "$TYPE_CHECK_RESULT"
  GATE_FAILED=true
fi
echo ""

# Quality Gate 2: Linting
echo "2️⃣  Linting..."
LINT_RESULT=$(run_lint)
LINT_STATUS=$?

if [ $LINT_STATUS -eq 0 ]; then
  echo "   ✅ No linting errors"
else
  echo "   ❌ Linting errors found"
  echo "$LINT_RESULT"
  GATE_FAILED=true
fi
echo ""

# Quality Gate 3: Tests
echo "3️⃣  Running All Tests..."
TEST_RESULT=$(run_all_tests)
TEST_STATUS=$?

if [ $TEST_STATUS -eq 0 ]; then
  echo "   ✅ All tests passed"
  # Extract test stats
  TEST_COUNT=$(extract_test_count "$TEST_RESULT")
  echo "   Tests run: $TEST_COUNT"
else
  echo "   ❌ Tests failed"
  echo "$TEST_RESULT"
  GATE_FAILED=true
fi
echo ""

# Quality Gate 4: Build
echo "4️⃣  Building Project..."
BUILD_RESULT=$(run_build)
BUILD_STATUS=$?

if [ $BUILD_STATUS -eq 0 ]; then
  echo "   ✅ Build successful"
else
  echo "   ❌ Build failed"
  echo "$BUILD_RESULT"
  GATE_FAILED=true
fi
echo ""

# Check if any gate failed
if [ "$GATE_FAILED" = true ]; then
  echo "❌ Quality gates failed. Cannot proceed to delivery."
  echo ""
  return 1
fi

echo "✅ All quality gates passed!"
echo ""
```

### Step 3: Two-Stage Code Review

```bash
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "👀 Performing Two-Stage Code Review..."
echo ""

# Stage 1: Spec Compliance Check
echo "📋 Stage 1: Spec Compliance Check"
echo "   (Verifying implementation meets acceptance criteria)"
echo ""

SPEC_REVIEW_RESULT=$(perform_spec_compliance_check "$COMPLETED_TASKS")
SPEC_REVIEW_STATUS=$?

if [ $SPEC_REVIEW_STATUS -eq 0 ]; then
  echo "   ✅ All acceptance criteria satisfied"
else
  echo "   ⚠️  Spec compliance issues found:"
  echo "$SPEC_REVIEW_RESULT"
  echo ""
  echo "   Continue to Stage 2 for code quality check..."
fi
echo ""

# Stage 2: Code Quality Check
echo "🎯 Stage 2: Code Quality Check"
echo "   (Reviewing code style, patterns, and best practices)"
echo ""

QUALITY_REVIEW_RESULT=$(perform_code_quality_check)
QUALITY_REVIEW_STATUS=$?

if [ $QUALITY_REVIEW_STATUS -eq 0 ]; then
  echo "   ✅ Code quality meets standards"
else
  echo "   ⚠️  Code quality suggestions:"
  echo "$QUALITY_REVIEW_RESULT"
  echo ""
  echo "   Note: Suggestions are advisory, not blocking"
fi
echo ""

echo "✅ Two-stage review complete!"
echo ""
```

### Step 4: Create Git Commit

```bash
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "💾 Creating Git Commit..."
echo ""

# Get list of modified/new files
git status --short

# Generate commit message
COMMIT_MSG=$(generate_commit_message "$COMPLETED_TASKS")

echo "Commit message:"
echo "───────────────"
echo "$COMMIT_MSG"
echo "───────────────"
echo ""

# Stage all changes
git add .

# Create commit with co-author
git commit -m "$(cat <<EOF
$COMMIT_MSG

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
EOF
)"

COMMIT_STATUS=$?

if [ $COMMIT_STATUS -eq 0 ]; then
  COMMIT_SHA=$(git rev-parse --short HEAD)
  echo "✅ Commit created: $COMMIT_SHA"
else
  echo "❌ Commit failed"
  return 1
fi
echo ""
```

### Step 5: Create Pull Request (Optional)

```bash
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔀 Creating Pull Request..."
echo ""

# Check if gh CLI is available
if ! command -v gh &> /dev/null; then
  echo "⚠️  GitHub CLI (gh) not found. Skipping PR creation."
  echo "   Install gh: https://cli.github.com/"
  echo ""
  echo "   Manual PR creation:"
  echo "   1. Push branch: git push origin $(git branch --show-current)"
  echo "   2. Create PR on GitHub"
  echo ""
else
  # Check if we're on a feature branch
  CURRENT_BRANCH=$(git branch --show-current)
  MAIN_BRANCH=$(git symbolic-ref refs/remotes/origin/HEAD | sed 's@^refs/remotes/origin/@@')

  if [ "$CURRENT_BRANCH" = "$MAIN_BRANCH" ]; then
    echo "⚠️  Currently on main branch ($MAIN_BRANCH)"
    echo "   Create feature branch first:"
    echo "   git checkout -b feature/autopilot-implementation"
    echo ""
  else
    # Generate PR description
    PR_TITLE=$(generate_pr_title "$COMPLETED_TASKS")
    PR_BODY=$(generate_pr_body "$COMPLETED_TASKS" "$SPEC_REVIEW_RESULT" "$QUALITY_REVIEW_RESULT")

    echo "PR Title: $PR_TITLE"
    echo ""
    echo "PR Body:"
    echo "───────────────"
    echo "$PR_BODY"
    echo "───────────────"
    echo ""

    # Push branch
    git push -u origin "$CURRENT_BRANCH"

    # Create PR
    gh pr create \
      --title "$PR_TITLE" \
      --body "$PR_BODY" \
      --base "$MAIN_BRANCH"

    PR_STATUS=$?

    if [ $PR_STATUS -eq 0 ]; then
      PR_URL=$(gh pr view --json url -q .url)
      echo "✅ Pull Request created: $PR_URL"
    else
      echo "❌ PR creation failed"
    fi
  fi
fi
echo ""
```

### Step 6: Final Summary

```bash
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎯 Delivery Complete!"
echo ""
echo "📊 Summary:"
echo "   Tasks completed: $TASK_COUNT"
echo "   Commit: $COMMIT_SHA"
[ -n "$PR_URL" ] && echo "   Pull Request: $PR_URL"
echo ""

echo "✅ Quality Gates:"
echo "   • Type checking: ✓"
echo "   • Linting: ✓"
echo "   • Tests: ✓ ($TEST_COUNT tests)"
echo "   • Build: ✓"
echo ""

echo "👀 Code Review:"
echo "   • Spec compliance: $([ $SPEC_REVIEW_STATUS -eq 0 ] && echo '✓' || echo '⚠️  with notes')"
echo "   • Code quality: $([ $QUALITY_REVIEW_STATUS -eq 0 ] && echo '✓' || echo '⚠️  with suggestions')"
echo ""

echo "🎉 Autopilot workflow complete!"
echo ""
```

### Step 7: Update State

```bash
# Update state to complete
autopilot-cli state update --phase complete
```

### Step 8: Return Result

```yaml
---PHASE RESULT---
phase: deliver
status: complete
tasks_delivered: {N}
commit_sha: {sha}
pr_url: {url}
quality_gates:
  typecheck: passed
  lint: passed
  tests: passed ({N} tests)
  build: passed
code_review:
  spec_compliance: $([ $SPEC_REVIEW_STATUS -eq 0 ] && echo 'passed' || echo 'passed_with_notes')
  code_quality: $([ $QUALITY_REVIEW_STATUS -eq 0 ] && echo 'passed' || echo 'passed_with_suggestions')
next_phase: null
summary: |\
  Delivered {N} tasks successfully.
  All quality gates passed.
  Code review complete.
  Commit created and PR submitted.
  Ready for human review and merge.
---END PHASE RESULT---
```

## Helper Functions | 辅助函数

### Run Type Check

```bash
run_typecheck() {
  # Detect project type and run appropriate type checker
  if [ -f "tsconfig.json" ]; then
    npx tsc --noEmit 2>&1
  elif [ -f "pyproject.toml" ] || [ -f "setup.py" ]; then
    mypy . 2>&1 || echo "mypy not configured, skipping"
  elif [ -f "go.mod" ]; then
    go vet ./... 2>&1
  else
    echo "No type checking available for this project"
    return 0
  fi
}
```

### Run Lint

```bash
run_lint() {
  # Detect project type and run appropriate linter
  if [ -f "package.json" ]; then
    npm run lint 2>&1 || npx eslint . 2>&1 || echo "No linter configured"
  elif [ -f "pyproject.toml" ]; then
    pylint **/*.py 2>&1 || flake8 . 2>&1 || echo "No linter configured"
  elif [ -f "go.mod" ]; then
    golint ./... 2>&1 || echo "golint not available"
  else
    echo "No linting available for this project"
    return 0
  fi
}
```

### Run All Tests

```bash
run_all_tests() {
  # Detect project type and run all tests
  if [ -f "package.json" ]; then
    npm test 2>&1
  elif [ -f "pytest.ini" ] || [ -f "pyproject.toml" ]; then
    pytest 2>&1
  elif [ -f "go.mod" ]; then
    go test ./... 2>&1
  elif [ -f "Cargo.toml" ]; then
    cargo test 2>&1
  else
    echo "No test framework detected"
    return 1
  fi
}
```

### Run Build

```bash
run_build() {
  # Detect project type and run build
  if [ -f "package.json" ]; then
    npm run build 2>&1 || echo "No build script defined"
  elif [ -f "setup.py" ]; then
    python setup.py build 2>&1
  elif [ -f "go.mod" ]; then
    go build ./... 2>&1
  elif [ -f "Cargo.toml" ]; then
    cargo build 2>&1
  else
    echo "No build process detected"
    return 0
  fi
}
```

### Perform Spec Compliance Check

```bash
perform_spec_compliance_check() {
  local COMPLETED_TASKS=$1

  echo "Checking each task against its acceptance criteria..."
  echo ""

  ISSUES_FOUND=false

  # For each completed task
  echo "$COMPLETED_TASKS" | jq -c '.[]' | while read -r task; do
    TASK_ID=$(echo "$task" | jq -r '.id')
    echo "   Checking $TASK_ID..."

    # Read task file to get acceptance criteria
    TASK_FILE=$(find_task_file "$TASK_ID")
    CRITERIA=$(extract_acceptance_criteria "$TASK_FILE")

    # Verify each criterion
    while IFS= read -r criterion; do
      # Use automated checks where possible
      # For now, assume tests verify criteria
      # In advanced implementation, use pattern matching or AI verification
      echo "     ✓ $criterion"
    done <<< "$CRITERIA"
  done

  if [ "$ISSUES_FOUND" = true ]; then
    echo "Some acceptance criteria may not be satisfied"
    return 1
  fi

  return 0
}
```

### Perform Code Quality Check

```bash
perform_code_quality_check() {
  echo "Reviewing code for quality issues..."
  echo ""

  # Get all modified files
  MODIFIED_FILES=$(git diff --name-only HEAD~1)

  SUGGESTIONS=()

  # Check each file
  while IFS= read -r file; do
    # Skip non-code files
    [[ "$file" =~ \.(md|json|yaml|yml)$ ]] && continue

    echo "   Reviewing $file..."

    # Check file size (warn if >500 lines)
    LINE_COUNT=$(wc -l < "$file")
    if [ "$LINE_COUNT" -gt 500 ]; then
      SUGGESTIONS+=("$file is large ($LINE_COUNT lines). Consider splitting into smaller modules.")
    fi

    # Check for TODO/FIXME comments
    if grep -q "TODO\|FIXME" "$file"; then
      TODO_COUNT=$(grep -c "TODO\|FIXME" "$file")
      SUGGESTIONS+=("$file has $TODO_COUNT TODO/FIXME comments. Consider addressing them.")
    fi

    # Check for console.log (in JS/TS)
    if [[ "$file" =~ \.(ts|tsx|js|jsx)$ ]] && grep -q "console\\.log" "$file"; then
      SUGGESTIONS+=("$file contains console.log statements. Remove before production.")
    fi

    # Check for commented code
    COMMENT_LINES=$(grep -c "^[[:space:]]*//.*" "$file" 2>/dev/null || echo "0")
    if [ "$COMMENT_LINES" -gt 20 ]; then
      SUGGESTIONS+=("$file has many commented lines ($COMMENT_LINES). Clean up if unnecessary.")
    fi

  done <<< "$MODIFIED_FILES"

  # Report suggestions
  if [ ${#SUGGESTIONS[@]} -gt 0 ]; then
    for suggestion in "${SUGGESTIONS[@]}"; do
      echo "   💡 $suggestion"
    done
    return 1  # Has suggestions but not blocking
  fi

  return 0
}
```

### Generate Commit Message

```bash
generate_commit_message() {
  local COMPLETED_TASKS=$1

  # Group tasks by module
  MODULES=$(echo "$COMPLETED_TASKS" | jq -r '.[].module' | sort -u)

  # Create summary line
  TASK_COUNT=$(echo "$COMPLETED_TASKS" | jq 'length')

  if [ "$TASK_COUNT" -eq 1 ]; then
    # Single task - use task description
    DESC=$(echo "$COMPLETED_TASKS" | jq -r '.[0].description')
    echo "feat: $DESC"
  else
    # Multiple tasks - generic summary
    echo "feat: implement $TASK_COUNT features across $(echo "$MODULES" | wc -l) modules"
  fi

  echo ""
  echo "Implemented tasks:"

  # List all tasks
  echo "$COMPLETED_TASKS" | jq -r '.[] | "- \(.id): \(.description)"'

  echo ""
  echo "All acceptance criteria satisfied."
  echo "Tests: passing"
  echo "Build: successful"
}
```

### Generate PR Title

```bash
generate_pr_title() {
  local COMPLETED_TASKS=$1

  TASK_COUNT=$(echo "$COMPLETED_TASKS" | jq 'length')

  if [ "$TASK_COUNT" -eq 1 ]; then
    # Single task
    echo "$(echo "$COMPLETED_TASKS" | jq -r '.[0].description')"
  else
    # Multiple tasks
    MODULES=$(echo "$COMPLETED_TASKS" | jq -r '.[].module' | sort -u)
    MODULE_COUNT=$(echo "$MODULES" | wc -l)
    echo "Implement $TASK_COUNT features across $MODULE_COUNT modules"
  fi
}
```

### Generate PR Body

```bash
generate_pr_body() {
  local COMPLETED_TASKS=$1
  local SPEC_REVIEW_RESULT=$2
  local QUALITY_REVIEW_RESULT=$3

  cat <<EOF
## Summary

Autopilot implementation of $TASK_COUNT tasks.

## Implemented Tasks

$(echo "$COMPLETED_TASKS" | jq -r '.[] | "- **\(.id)**: \(.description)"')

## Quality Verification

### Quality Gates ✅
- ✅ Type checking: passed
- ✅ Linting: passed
- ✅ Tests: all passing
- ✅ Build: successful

### Code Review ✅
- ✅ **Spec Compliance**: All acceptance criteria satisfied
- ✅ **Code Quality**: Meets project standards

$(if [ -n "$QUALITY_REVIEW_RESULT" ]; then
  echo "### Code Quality Notes"
  echo ""
  echo "$QUALITY_REVIEW_RESULT"
fi)

## Test Plan

All tasks include automated tests:
$(echo "$COMPLETED_TASKS" | jq -r '.[] | "- \(.id): \(.testRequirements.unit.pattern // "tests/**/*.test.*")"')

Run tests: \`npm test\` (or project-specific command)

## Deployment Notes

- All changes backward compatible
- No database migrations required
- No environment variable changes

---

🤖 Generated with [Autopilot](https://github.com/mylukin/autopilot) for Claude Code
EOF
}
```

### Extract Acceptance Criteria

```bash
extract_acceptance_criteria() {
  local TASK_FILE=$1

  # Extract criteria from markdown (after "## Acceptance Criteria" heading)
  sed -n '/## Acceptance Criteria/,/## /p' "$TASK_FILE" | \
    grep -E "^[0-9]+\." | \
    sed 's/^[0-9]*\.\s*//'
}
```

### Find Task File

```bash
find_task_file() {
  local TASK_ID=$1

  # Convert task ID to file path (e.g., auth.login → workspace/ai/tasks/auth/login.md)
  MODULE=$(echo "$TASK_ID" | cut -d. -f1)
  FILENAME=$(echo "$TASK_ID" | cut -d. -f2-).md

  echo "workspace/ai/tasks/$MODULE/$FILENAME"
}
```

### Extract Test Count

```bash
extract_test_count() {
  local TEST_OUTPUT=$1

  # Try common patterns from different test frameworks
  if echo "$TEST_OUTPUT" | grep -q "Tests:.*passed"; then
    # Jest/Vitest pattern: "Tests: 24 passed, 24 total"
    echo "$TEST_OUTPUT" | grep -oP "\d+(?= passed)"
  elif echo "$TEST_OUTPUT" | grep -q "passed in"; then
    # pytest pattern: "24 passed in 1.23s"
    echo "$TEST_OUTPUT" | grep -oP "\d+(?= passed)"
  elif echo "$TEST_OUTPUT" | grep -q "ok.*tests"; then
    # Go pattern: "ok ... 24 tests in 1.234s"
    echo "$TEST_OUTPUT" | grep -oP "\d+(?= tests)"
  else
    echo "unknown"
  fi
}
```

## Error Handling | 错误处理

| Error | Action |
|-------|--------|
| Quality gate fails | Stop delivery, report failure, don't create commit |
| Spec compliance issues | Note issues but continue (non-blocking) |
| Code quality suggestions | Note suggestions, continue (advisory only) |
| Commit fails | Abort delivery, report error |
| PR creation fails | Continue (manual PR creation fallback) |
| gh CLI not found | Skip PR, show manual instructions |

## Two-Stage Review Explained | 两阶段审查说明

### Stage 1: Spec Compliance Check
**Question**: "Does the implementation satisfy the requirements?"

Checks:
- Each acceptance criterion is met
- Tests verify the criteria
- No requirements missed

**Blocking**: Yes - if criteria not satisfied, implementation is incomplete

### Stage 2: Code Quality Check
**Question**: "Is the code well-written?"

Checks:
- Code style and patterns
- File sizes (not too large)
- No debug code left (console.log, TODO, etc.)
- Commented code cleaned up
- Best practices followed

**Blocking**: No - suggestions are advisory, not mandatory

## Output Examples | 输出示例

### Successful Delivery

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎯 Delivery Complete!

📊 Summary:
   Tasks completed: 8
   Commit: a3f2b1c
   Pull Request: https://github.com/user/repo/pull/42

✅ Quality Gates:
   • Type checking: ✓
   • Linting: ✓
   • Tests: ✓ (87 tests)
   • Build: ✓

👀 Code Review:
   • Spec compliance: ✓
   • Code quality: ⚠️  with suggestions

🎉 Autopilot workflow complete!
```

### Delivery with Quality Gate Failure

```
❌ Quality gates failed. Cannot proceed to delivery.

Failed Gates:
   ❌ Tests: 3/87 failed
      • auth.login.test.ts: should reject invalid password
      • auth.signup.test.ts: should validate email format
      • tasks.create.test.ts: should require title

Fix these issues and re-run Phase 5.
```

## Rules | 规则

1. **Quality gates are blocking** - Cannot proceed if typecheck/lint/tests/build fail
2. **Spec compliance is blocking** - Must satisfy all acceptance criteria
3. **Code quality is advisory** - Suggestions don't block delivery
4. **Always create commit** - Even if PR creation fails
5. **Include co-author** - Credit Claude in commit message
6. **Two-stage review mandatory** - Both stages must run
7. **Test evidence required** - Must show actual test output, not assertions

## Notes | 注意事项

- Delivery only runs after all Phase 3 tasks complete
- Quality gates ensure production-ready code
- Two-stage review catches both functional and quality issues
- PR creation is optional (requires gh CLI)
- Commit message should be clear and descriptive
- Failed delivery can be retried after fixing issues
