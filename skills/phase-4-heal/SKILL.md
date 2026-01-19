---
name: phase-4-heal
description: Systematic error recovery using root cause investigation before fixes
allowed-tools: [Read, Write, Bash, WebSearch, Grep, Glob]
user-invocable: false
---

# Phase 4: Systematic Healing

## Overview

Systematically investigate and fix implementation errors using root cause analysis. NO FIXES WITHOUT INVESTIGATION FIRST.

使用根本原因分析系统地调查和修复实现错误。未经调查不得进行修复。

## When to Use

Invoked by phase-3-implement when a task implementation fails.

## The Iron Law

```
NO FIXES WITHOUT ROOT CAUSE INVESTIGATION FIRST
```

If you haven't completed Phase 1 (Root Cause Investigation), you CANNOT propose fixes.

> 如果你没有完成第 1 阶段（根本原因调查），你不能提出修复方案。

## Input

- Task ID: `{task_id}`
- Error message: `{error_msg}`
- Error context: Stack trace, test output, or build logs

## The Four Phases

**MANDATORY**: Must complete each phase before proceeding to next.

> **强制性**：必须完成每个阶段才能进入下一个阶段。

### Phase 1: Root Cause Investigation (MANDATORY)

```bash
echo "🔍 Phase 1: Root Cause Investigation"
echo ""

# Get task details
TASK_JSON=$(ralph-dev tasks get "$TASK_ID" --json)
TASK_DESC=$(echo "$TASK_JSON"

echo "Task: $TASK_ID"
echo "Description: $TASK_DESC"
echo ""
echo "Error: $ERROR_MSG"
echo ""

# STEP 1: Read Error Message COMPLETELY
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "STEP 1: Read Error Message Completely"
echo ""

# Display full error with stack trace
echo "$ERROR_FULL_OUTPUT"
echo ""

# Extract key information
echo "Line number: $(extract_line_number "$ERROR_MSG")"
echo "File: $(extract_file_path "$ERROR_MSG")"
echo "Error code: $(extract_error_code "$ERROR_MSG")"
echo ""

# STEP 2: Reproduce Consistently
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "STEP 2: Reproduce Consistently"
echo ""

# Determine test command from task
TEST_PATTERN=$(echo "$TASK_JSON"
echo "Running: npm test -- $TEST_PATTERN"
echo ""

REPRO_OUTPUT=$(npm test -- "$TEST_PATTERN" 2>&1)
REPRO_STATUS=$?

echo "$REPRO_OUTPUT"
echo ""

if [ $REPRO_STATUS -ne 0 ]; then
  echo "✓ Error reproduced consistently"
else
  echo "⚠️  Error not reproducible - may be intermittent"
  echo "Gathering more data before proceeding..."
fi
echo ""

# STEP 3: Check Recent Changes
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "STEP 3: Check Recent Changes"
echo ""

echo "Recent commits:"
git log --oneline -5
echo ""

echo "Files changed in last commit:"
git diff --name-only HEAD~1
echo ""

echo "Recent dependency changes:"
git diff HEAD~1 package.json 2>/dev/null || echo "No package.json changes"
echo ""

# STEP 4: Trace Data Flow (if applicable)
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "STEP 4: Trace Data Flow"
echo ""

# Analyze error location
ERROR_FILE=$(extract_file_path "$ERROR_MSG")
ERROR_LINE=$(extract_line_number "$ERROR_MSG")

if [ -n "$ERROR_FILE" ] && [ -n "$ERROR_LINE" ]; then
  echo "Error location: $ERROR_FILE:$ERROR_LINE"
  echo ""
  echo "Code context:"
  sed -n "$((ERROR_LINE - 5)),$((ERROR_LINE + 5))p" "$ERROR_FILE"
  echo ""

  # Trace backward
  echo "Tracing backward from error:"
  echo "1. What called this function?"
  echo "2. Where does the bad value originate?"
  echo "3. What are the upstream dependencies?"
  echo ""
fi

echo "✓ Phase 1 Complete: Root cause investigation finished"
echo ""
```

### Phase 2: Pattern Analysis

```bash
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔎 Phase 2: Pattern Analysis"
echo ""

# STEP 1: Find Working Examples
echo "STEP 1: Finding working examples in codebase..."
echo ""

# Search for similar working patterns
SEARCH_PATTERN=$(extract_relevant_pattern "$ERROR_MSG")
echo "Searching for: $SEARCH_PATTERN"
echo ""

WORKING_EXAMPLES=$(grep -r "$SEARCH_PATTERN" src/ --include="*.ts" --include="*.tsx" -l 2>/dev/null || echo "No examples found")
echo "Working examples found:"
echo "$WORKING_EXAMPLES"
echo ""

# STEP 2: Compare Working vs Broken
if [ -n "$WORKING_EXAMPLES" ]; then
  echo "STEP 2: Comparing working vs broken code..."
  echo ""

  FIRST_EXAMPLE=$(echo "$WORKING_EXAMPLES"
  echo "Working example: $FIRST_EXAMPLE"
  echo "Broken code: $ERROR_FILE"
  echo ""

  echo "Key differences:"
  diff -u "$FIRST_EXAMPLE" "$ERROR_FILE"
  echo ""
fi

# STEP 3: Check Dependencies
echo "STEP 3: Checking dependencies..."
echo ""

# Extract module name from error
MODULE_NAME=$(echo "$ERROR_MSG" | grep -oP "Module '.*?'"

if [ -n "$MODULE_NAME" ]; then
  echo "Missing module: $MODULE_NAME"
  echo "Checking if installed:"
  npm list "$MODULE_NAME" 2>&1 || echo "Not installed"
  echo ""
fi

echo "✓ Phase 2 Complete: Pattern analysis finished"
echo ""
```

### Phase 3: Hypothesis and Testing

```bash
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "💡 Phase 3: Hypothesis and Testing"
echo ""

# STEP 1: Form Hypothesis
echo "STEP 1: Forming hypothesis based on investigation..."
echo ""

# Classify error type
ERROR_TYPE=$(classify_error "$ERROR_MSG")
echo "Error type: $ERROR_TYPE"
echo ""

case "$ERROR_TYPE" in
  missing_dependency)
    HYPOTHESIS="Module '$MODULE_NAME' is not installed or not listed in dependencies"
    FIX_TYPE="dependency"
    ;;
  type_error)
    HYPOTHESIS="Type mismatch or incorrect type annotation"
    FIX_TYPE="code"
    ;;
  undefined_reference)
    HYPOTHESIS="Variable or import not defined"
    FIX_TYPE="code"
    ;;
  test_failure)
    HYPOTHESIS="Implementation doesn't match expected behavior"
    FIX_TYPE="implementation"
    ;;
  build_error)
    HYPOTHESIS="Configuration or compilation issue"
    FIX_TYPE="config"
    ;;
  *)
    HYPOTHESIS="Unknown error type - need more investigation"
    FIX_TYPE="unknown"
    ;;
esac

echo "HYPOTHESIS: $HYPOTHESIS"
echo "Fix type: $FIX_TYPE"
echo ""

# STEP 2: Use WebSearch to Confirm Hypothesis
echo "STEP 2: Using WebSearch to confirm hypothesis..."
echo ""

# Build search query
SEARCH_QUERY=$(build_search_query "$ERROR_TYPE" "$ERROR_MSG" "$TASK_JSON")
echo "Search query: $SEARCH_QUERY"
echo ""

# Use WebSearch tool
# In actual execution:
# Use WebSearch with query: "$SEARCH_QUERY"

# Simulated result:
SEARCH_RESULTS='[
  {
    "title": "Solution for this error",
    "url": "https://stackoverflow.com/...",
    "solution": "Install the package or fix the code"
  }
]'

echo "Search results:"
echo "$SEARCH_RESULTS"
echo ""

echo "✓ Phase 3 Complete: Hypothesis formed and validated"
echo ""
```

### Phase 4: Implementation with Verification

```bash
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔧 Phase 4: Implementation"
echo ""

MAX_ATTEMPTS=3
ATTEMPT=1

while [ $ATTEMPT -le $MAX_ATTEMPTS ]; do
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "Healing Attempt $ATTEMPT/$MAX_ATTEMPTS"
  echo ""

  # STEP 1: Create Failing Test (if not exists)
  echo "STEP 1: Verify failing test exists..."
  echo ""

  # Run tests to confirm failure
  npm test -- "$TEST_PATTERN" 2>&1
  TEST_STATUS=$?

  if [ $TEST_STATUS -eq 0 ]; then
    echo "⚠️  Tests passing - error may already be fixed"
    return 0
  fi
  echo ""

  # STEP 2: Implement Single Fix
  echo "STEP 2: Implementing fix for $FIX_TYPE error..."
  echo ""

  case "$FIX_TYPE" in
    dependency)
      # Install missing dependency
      echo "Installing: $MODULE_NAME"
      npm install "$MODULE_NAME" 2>&1
      FIX_STATUS=$?
      ;;

    code)
      # Apply code fix based on search results
      echo "Applying code fix..."
      # Use Edit tool to fix the code
      # (Would need actual implementation)
      FIX_STATUS=0
      ;;

    implementation)
      # Fix implementation logic
      echo "Fixing implementation logic..."
      # Use Edit tool
      FIX_STATUS=0
      ;;

    config)
      # Fix configuration
      echo "Updating configuration..."
      # Use Edit tool
      FIX_STATUS=0
      ;;

    *)
      echo "Unknown fix type, cannot proceed"
      FIX_STATUS=1
      ;;
  esac

  echo ""

  # STEP 3: Verify Fix
  echo "STEP 3: Verifying fix..."
  echo ""
  echo "Running: npm test -- $TEST_PATTERN"
  echo ""

  VERIFY_OUTPUT=$(npm test -- "$TEST_PATTERN" 2>&1)
  VERIFY_STATUS=$?

  echo "$VERIFY_OUTPUT"
  echo ""
  echo "Exit code: $VERIFY_STATUS"
  echo ""

  if [ $VERIFY_STATUS -eq 0 ]; then
    echo "✅ VERIFIED: Fix successful (see test output above)"
    echo ""
    echo "📊 Healing Summary:"
    echo "   Attempts: $ATTEMPT"
    echo "   Fix type: $FIX_TYPE"
    echo "   Hypothesis: $HYPOTHESIS"
    echo ""
    return 0
  else
    echo "❌ VERIFIED: Fix failed (see test output above)"
    echo ""

    ATTEMPT=$((ATTEMPT + 1))

    if [ $ATTEMPT -le $MAX_ATTEMPTS ]; then
      echo "🔄 Retrying with alternative approach..."
      echo ""
      echo "Returning to Phase 1 with new information..."
      echo ""
      # Would re-run Phase 1-3 with learned context
    fi
  fi
done

# STEP 4: Failed After Max Attempts
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "❌ Healing failed after $MAX_ATTEMPTS attempts"
echo ""
echo "💡 Manual intervention required:"
echo "   - Review Phase 1-3 investigation above"
echo "   - Error may indicate architectural issue"
echo "   - Task marked as 'failed' for manual review"
echo ""

return 1
```

## Helper Functions

```bash
classify_error() {
  local ERROR_MSG=$1

  case "$ERROR_MSG" in
    *"Module"*"not found"*|*"Cannot find module"*)
      echo "missing_dependency"
      ;;
    *"TypeError"*)
      echo "type_error"
      ;;
    *"ReferenceError"*|*"is not defined"*)
      echo "undefined_reference"
      ;;
    *"SyntaxError"*)
      echo "syntax_error"
      ;;
    *"Test failed"*|*"Expected"*"but got"*|*"AssertionError"*)
      echo "test_failure"
      ;;
    *"build failed"*|*"compilation error"*)
      echo "build_error"
      ;;
    *)
      echo "unknown_error"
      ;;
  esac
}

build_search_query() {
  local ERROR_TYPE=$1
  local ERROR_MSG=$2
  local TASK_JSON=$3

  local LANGUAGE=$(echo "$TASK_JSON"
  local FRAMEWORK=$(echo "$TASK_JSON"

  case "$ERROR_TYPE" in
    missing_dependency)
      MODULE=$(echo "$ERROR_MSG" | grep -oP "(?<=Module ').*(?=' not found)" || \
               echo "$ERROR_MSG"
      echo "$LANGUAGE $FRAMEWORK install $MODULE dependency"
      ;;
    type_error)
      echo "$LANGUAGE $FRAMEWORK TypeError how to fix"
      ;;
    undefined_reference)
      echo "$LANGUAGE $FRAMEWORK ReferenceError fix"
      ;;
    test_failure)
      echo "$LANGUAGE $FRAMEWORK test failure solution"
      ;;
    build_error)
      echo "$LANGUAGE $FRAMEWORK build error solution"
      ;;
    *)
      echo "$LANGUAGE $FRAMEWORK error fix"
      ;;
  esac
}

extract_line_number() {
  echo "$1" | grep -oP ":\d+" | tr -d ':'
}

extract_file_path() {
  echo "$1" | grep -oP "[a-zA-Z0-9_/-]+\.ts[x]?"
}

extract_error_code() {
  echo "$1" | grep -oP "\[TS\d+\]"
}
```

## Error Handling

| Error | Action |
|-------|--------|
| Cannot reproduce | Gather more data, check environment |
| No working examples | Use WebSearch for reference implementations |
| All 3 attempts fail | Mark task as failed, require manual intervention |
| Hypothesis unclear | Return to Phase 1 with more investigation |

## Rules

1. **ALWAYS complete Phase 1** - No skipping root cause investigation
2. **One fix at a time** - Don't apply multiple changes simultaneously
3. **Verify with tests** - Run tests after every fix attempt
4. **Max 3 attempts** - After 3 failures, escalate to manual review
5. **Use WebSearch to confirm** - Don't guess, search for proven solutions
6. **Evidence required** - Show full test output for verification
7. **No fixes without investigation** - Investigation MUST precede fixes

## Progress Updates

```
🔍 Phase 1: Root Cause Investigation
   ✓ Error reproduced consistently
   ✓ Recent changes reviewed
   ✓ Data flow traced
   Root cause: Missing bcrypt dependency

🔎 Phase 2: Pattern Analysis
   ✓ Found 3 working examples
   ✓ Compared differences
   ✓ Dependencies checked

💡 Phase 3: Hypothesis and Testing
   Hypothesis: bcrypt module not installed
   ✓ Confirmed via WebSearch

🔧 Phase 4: Implementation (Attempt 1/3)
   Applying fix: npm install bcrypt@5.1.0

   Running: npm test -- tests/auth/**/*.test.ts

   [Full test output shown]

   Exit code: 0

   ✅ VERIFIED: Fix successful (see test output above)

   📊 Healing Summary:
      Attempts: 1
      Fix type: dependency
      Hypothesis: bcrypt module not installed
```

## Notes

- Systematic debugging is FASTER than random fixes
- Each phase builds on previous phases - don't skip
- WebSearch is for confirming hypotheses, not replacing investigation
- 3-attempt limit prevents infinite loops
- Failed healing should mark task as 'failed' for manual review
- ALWAYS show full verification output - evidence before claims
