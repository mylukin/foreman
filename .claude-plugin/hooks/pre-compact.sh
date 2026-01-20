#!/bin/bash
#
# Ralph-dev PreCompact Hook
# Checkpoints current workflow state before context compression
#
# This ensures workflow progress is preserved and recoverable.
#
# Environment variables provided by Claude Code:
# - CLAUDE_PROJECT_DIR: Path to the current project directory
#
# Hook receives JSON input via stdin with:
# - hook_event_name: "PreCompact"
# - trigger: "manual" | "auto"
# - custom_instructions: string or empty
#

# Don't exit on error - we want to be non-blocking
set +e

# Get target project directory
TARGET_DIR="${CLAUDE_PROJECT_DIR:-$PWD}"
RULES_DIR="${TARGET_DIR}/.claude/rules"
STATE_CHECKPOINT="${RULES_DIR}/ralph-dev-state-checkpoint.md"
RALPH_DEV_DIR="${TARGET_DIR}/.ralph-dev"

# Skip if not an active ralph-dev project
if [ ! -d "${RALPH_DEV_DIR}" ]; then
  exit 0
fi

# Check if ralph-dev CLI is available
if ! command -v ralph-dev &> /dev/null; then
  exit 0
fi

# Query current state from CLI
STATE_JSON=$(ralph-dev state get --json 2>/dev/null)
if [ $? -ne 0 ] || [ -z "$STATE_JSON" ]; then
  exit 0
fi

PHASE=$(echo "$STATE_JSON" | jq -r '.phase // "none"' 2>/dev/null)

# Skip if no active session
if [ "$PHASE" = "none" ] || [ "$PHASE" = "null" ] || [ -z "$PHASE" ]; then
  exit 0
fi

# Get task progress
TASKS_JSON=$(ralph-dev tasks list --json 2>/dev/null || echo '{"data":{"total":0}}')
TOTAL=$(echo "$TASKS_JSON" | jq -r '.data.total // 0' 2>/dev/null || echo "0")
COMPLETED=$(echo "$TASKS_JSON" | jq -r '.data.completed // 0' 2>/dev/null || echo "0")
PENDING=$(echo "$TASKS_JSON" | jq -r '.data.pending // 0' 2>/dev/null || echo "0")
IN_PROGRESS=$(echo "$TASKS_JSON" | jq -r '.data.in_progress // 0' 2>/dev/null || echo "0")
FAILED=$(echo "$TASKS_JSON" | jq -r '.data.failed // 0' 2>/dev/null || echo "0")

# Get current task
CURRENT_TASK=$(echo "$STATE_JSON" | jq -r '.currentTask // "none"' 2>/dev/null || echo "none")

# Create checkpoint rules directory
mkdir -p "${RULES_DIR}" 2>/dev/null || exit 0

# Generate timestamp
TIMESTAMP=$(date -Iseconds 2>/dev/null || date "+%Y-%m-%dT%H:%M:%S")

# Write state checkpoint
cat > "${STATE_CHECKPOINT}" << EOF
# Ralph-dev State Checkpoint

**Auto-generated before context compression. Use this to recover workflow state.**

## Current State

- **Phase:** ${PHASE}
- **Current Task:** ${CURRENT_TASK}
- **Timestamp:** ${TIMESTAMP}

## Task Progress

| Status | Count |
|--------|-------|
| Total | ${TOTAL} |
| Completed | ${COMPLETED} |
| Pending | ${PENDING} |
| In Progress | ${IN_PROGRESS} |
| Failed | ${FAILED} |

## Recovery Commands

If context was compressed and you need to resume:

\`\`\`bash
# 1. Verify current state
ralph-dev state get --json

# 2. Check task progress
ralph-dev tasks list --json

# 3. Get next task (if in implement phase)
ralph-dev tasks next --json

# 4. Resume from current phase
# The workflow rules in .claude/rules/ will guide execution
\`\`\`

## Important Notes

- This checkpoint is updated automatically before each context compression
- The CLI state (\`.ralph-dev/state.json\`) is the source of truth
- Always query \`ralph-dev state get --json\` for current state
- Workflow rules in \`.claude/rules/ralph-dev-*.md\` provide guidance
EOF

echo "[ralph-dev] State checkpoint saved: Phase=${PHASE}, Tasks=${COMPLETED}/${TOTAL}"

exit 0
