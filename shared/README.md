# Shared Bootstrap Scripts

This directory contains reusable scripts for all Foreman skills.

## Files

### `bootstrap-cli.sh` (Required)

**Purpose:** Automatically detect, build, and validate the Foreman TypeScript CLI.

**Usage in skills:**
```bash
# At the top of any SKILL.md that uses ralph-dev
source ${CLAUDE_PLUGIN_ROOT}/shared/bootstrap-cli.sh

# Then use the CLI anywhere:
ralph-dev tasks list
ralph-dev state update --phase implement
```

**What it does:**
1. Checks if CLI binary exists (`cli/dist/index.js`)
2. Builds CLI if missing (npm install + TypeScript compilation)
3. Validates CLI works correctly (runs `--version`)
4. Provides friendly error messages if build fails
5. Exports `ralph-dev` function for use in skills

**First run:** 15-30 seconds (npm install + build)
**Subsequent runs:** Instant (CLI already built)

**Environment variables:**
- `SKIP_BOOTSTRAP=1` - Skip automatic bootstrap (for testing)
- `FORCE_REBUILD=1` - Force rebuild even if CLI exists
- `BOOTSTRAP_QUIET=1` - Suppress non-error output

**Example output:**
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔧 Building Foreman CLI
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
▸ Installing dependencies...
✓ Dependencies installed
▸ Compiling TypeScript...
✓ CLI compiled successfully
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✓ Foreman CLI ready
```

---

### `cli-fallback.sh` (Optional)

**Purpose:** Provides basic task operations when TypeScript CLI is unavailable.

**Usage:**
```bash
# Fallback is loaded automatically if bootstrap fails
# Or load manually:
source ${CLAUDE_PLUGIN_ROOT}/shared/cli-fallback.sh
```

**Available functions:**
- `fallback_get_next_task [tasks_dir]` - Get next pending task file path
- `fallback_read_task <task_file>` - Display task details
- `fallback_mark_done <task_file>` - Mark task as completed
- `fallback_mark_started <task_file>` - Mark task as in_progress
- `fallback_mark_failed <task_file> [reason]` - Mark task as failed
- `fallback_list_tasks [tasks_dir] [status]` - List all tasks
- `fallback_update_state_phase <phase>` - Update state.json phase

**Example:**
```bash
# Get next task
NEXT_TASK=$(fallback_get_next_task "workspace/ai/tasks")

# Read task details
fallback_read_task "$NEXT_TASK"

# Mark as completed
fallback_mark_done "$NEXT_TASK"
```

**Limitations:**
- No comprehensive context (unlike CLI's `tasks next`)
- No dependency checking
- No validation
- Basic grep/sed parsing only

**When fallback activates:**
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠  FALLBACK MODE ACTIVE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

The TypeScript CLI is unavailable.
Using limited bash implementations.

Available functions:
  - fallback_get_next_task
  - fallback_read_task
  ...
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

### `test-bootstrap.sh`

**Purpose:** Validate bootstrap script works correctly.

**Usage:**
```bash
./shared/test-bootstrap.sh
```

**Tests:**
1. Bootstrap script sources successfully
2. `ralph-dev` function is available
3. CLI executes and returns version
4. CLI commands work (tasks list)

**Expected output:**
```
Testing Foreman CLI Bootstrap...

1. Testing bootstrap script sourcing...
✓ Foreman CLI ready

2. Testing ralph-dev function...
✓ ralph-dev function is available

3. Testing CLI execution...
✓ CLI executed successfully
  Version: 1.0.0

4. Testing tasks list command...
✓ Tasks command works

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ All bootstrap tests passed!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## Integration Guide for Skills

### Step 1: Add Bootstrap to SKILL.md

At the top of your skill execution section, add:

```markdown
## Execution

### Step 0: Initialize CLI (Automatic)

```bash
# Bootstrap CLI - runs automatically on first use
source ${CLAUDE_PLUGIN_ROOT}/shared/bootstrap-cli.sh

# Verify CLI is ready (optional)
ralph-dev --version
echo ""
```

### Step 1: Your actual skill logic...
```

### Step 2: Use ralph-dev Function

Replace all `node cli/dist/index.js` calls with `ralph-dev`:

**Before:**
```bash
node cli/dist/index.js tasks list --status pending
```

**After:**
```bash
ralph-dev tasks list --status pending
```

### Step 3: Test Your Skill

Run the skill and verify bootstrap works:
```bash
# First run: Should build CLI automatically
# Subsequent runs: Should skip build

# Expected first run:
🔧 Building Foreman CLI...
✓ CLI compiled successfully
✓ Foreman CLI ready

# Expected subsequent runs:
✓ Foreman CLI ready
```

---

## Troubleshooting

### CLI Build Fails

**Error:** `npm install` fails

**Solution:**
1. Check Node.js version: `node --version` (must be >= 18.0.0)
2. Update npm: `npm install -g npm@latest`
3. Clean and rebuild:
   ```bash
   cd cli
   rm -rf node_modules dist
   npm install
   npm run build
   ```

### Bootstrap Script Not Found

**Error:** `shared/bootstrap-cli.sh: No such file or directory`

**Solution:**
Ensure `CLAUDE_PLUGIN_ROOT` is set correctly:
```bash
export CLAUDE_PLUGIN_ROOT=/path/to/ralph-dev
source ${CLAUDE_PLUGIN_ROOT}/shared/bootstrap-cli.sh
```

### Function Not Available

**Error:** `ralph-dev: command not found`

**Solution:**
Make sure you're **sourcing** the script (not executing):
```bash
# Correct:
source shared/bootstrap-cli.sh

# Wrong:
bash shared/bootstrap-cli.sh
./shared/bootstrap-cli.sh
```

---

## Architecture Decision

**Why not embed scripts in each skill?**

We chose **centralized CLI + shared bootstrap** (Option C) because:

1. **Performance** - Compiled TypeScript is 8-10x faster than bash
2. **Type safety** - Catch errors at compile time
3. **Maintainability** - Single source of truth
4. **Testing** - Full unit test coverage in TypeScript
5. **User experience** - Auto-bootstrap makes it transparent

**Trade-off:**
- Requires Node.js 18+ and npm 9+ (acceptable for modern development)
- First-use build time of 15-30 seconds (one-time cost)

See [docs/CLI_ARCHITECTURE.md](../docs/CLI_ARCHITECTURE.md) for full rationale.

---

## Version History

- **v2.0.0** - Initial shared bootstrap scripts
  - Auto-detection and build
  - Graceful fallback mode
  - Comprehensive validation

---

**Maintained by:** Foreman Team
**Issues:** https://github.com/mylukin/ralph-dev/issues
