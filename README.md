# Ralph-dev

[English](README.md) | [中文](README_ZH.md)

Autonomous development workflow plugin for Claude Code that transforms natural language requirements into structured, testable code through a 5-phase process.

[![npm version](https://img.shields.io/npm/v/ralph-dev.svg)](https://www.npmjs.com/package/ralph-dev)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

## Overview

Ralph-dev automates software development workflows by:
- Breaking down requirements into atomic, testable tasks
- Implementing each task with fresh agent context for TDD enforcement
- Auto-detecting project language and framework (12+ languages supported)
- Managing state and progress through a CLI-driven task system
- Automatically healing errors through WebSearch-based investigation
- Creating git commits and pull requests for code review

## Quick Start

```bash
# Step 1: Install CLI globally
npm install -g ralph-dev

# Step 2: Add plugin marketplace
/plugin marketplace add mylukin/ralph-dev

# Step 3: Install plugin
/plugin install ralph-dev

# Step 4: Initialize project (installs workflow rules)
ralph-dev init

# Step 5: Start your first task
/ralph-dev "Build a REST API for user authentication"
```

Ralph-dev will guide you through:
1. Clarifying questions with structured multiple-choice answers
2. Task breakdown approval (review atomic tasks before implementation)
3. Autonomous implementation with TDD workflow
4. Automated pull request creation

## Key Features

### Interactive Clarification
Structured Q&A eliminates requirement ambiguity through multiple-choice questions about tech stack, architecture, and deployment.

### Autonomous Task Breakdown
Decomposes requirements into atomic tasks stored as markdown files with YAML frontmatter, enabling:
- Dependency tracking between tasks
- Granular progress monitoring
- Human-readable task descriptions
- Version control integration

### Multi-Language Support
Auto-detects and configures verification commands for:
- **JavaScript/TypeScript** - Node.js, Next.js, React, Vue, Angular
- **Python** - Django, Flask, FastAPI
- **Go, Rust, Java, Ruby, PHP, C#, Swift, Kotlin, Scala, C++**

### Self-Healing Implementation
When tasks fail, automatically:
- Investigates errors using WebSearch
- Applies fixes based on research
- Re-runs verification commands
- Retries up to 5 times before escalating (circuit breaker pattern)

### Safety Features
Inspired by [Superpowers](https://github.com/coleam00/superpowers):
1. **Gitignore Verification** - Automatically ensures `.ralph-dev/` is gitignored before creating files
2. **Baseline Test Verification** - Confirms all tests pass before starting implementation
3. **Auto-Cleanup** - Removes temporary files after delivery while preserving documentation

### Two-Stage Code Review
Before creating PRs:
1. **Spec Compliance** - Validates acceptance criteria are met
2. **Code Quality** - Runs type-check, lint, and tests

## Architecture

### 5-Phase Workflow

```
CLARIFY → BREAKDOWN → IMPLEMENT ⇄ HEAL → DELIVER
```

**Phase 1: CLARIFY**
- Skill: `skills/phase-1-clarify/`
- Asks structured questions about requirements
- Generates Product Requirements Document (PRD)
- Output: `.ralph-dev/prd.md`

**Phase 2: BREAKDOWN**
- Skill: `skills/phase-2-breakdown/`
- Parses PRD into atomic tasks (<30 min each)
- Creates modular task files with dependency tracking
- Output: `.ralph-dev/tasks/*.md` + `tasks/index.json`

**Phase 3: IMPLEMENT**
- Skill: `skills/phase-3-implement/`
- Spawns fresh agent context per task for TDD enforcement
- Manages task lifecycle (pending → in_progress → completed/failed)
- Automatically invokes Phase 4 on failure

**Phase 4: HEAL**
- Skill: `skills/phase-4-heal/`
- Triggered when Phase 3 tasks fail
- Uses WebSearch to research error solutions
- Applies fixes and re-runs verification
- Max 5 retry attempts per error (circuit breaker)

**Phase 5: DELIVER**
- Skill: `skills/phase-5-deliver/`
- Runs language-specific quality gates
- Two-stage code review process
- Creates git commit and pull request

### Directory Structure

```
ralph-dev/
├── .claude-plugin/
│   └── plugin.json           # Plugin metadata
├── cli/                      # TypeScript CLI (state, tasks, language detection)
│   ├── src/
│   │   ├── commands/         # CLI subcommands
│   │   │   ├── state.ts      # Manage .ralph-dev/state.json
│   │   │   ├── tasks.ts      # Task CRUD operations
│   │   │   ├── detect.ts     # Language detection
│   │   │   └── detect-ai.ts  # AI-powered detection
│   │   ├── core/
│   │   │   ├── task-parser.ts      # Parse YAML frontmatter
│   │   │   ├── task-writer.ts      # Write task files
│   │   │   └── circuit-breaker.ts  # Failure protection pattern
│   │   ├── repositories/
│   │   │   ├── task-repository.service.ts    # Task persistence
│   │   │   ├── state-repository.service.ts   # State persistence
│   │   │   └── index-repository.service.ts   # Task index management
│   │   └── language/
│   │       └── detector.ts   # Multi-language detection
│   └── bin/
│       └── ralph-dev.js      # CLI entry point
├── skills/
│   ├── dev-orchestrator/     # Main workflow orchestrator
│   ├── phase-1-clarify/      # Requirements clarification
│   ├── phase-2-breakdown/    # Task decomposition
│   ├── phase-3-implement/    # Implementation loop
│   ├── phase-4-heal/         # Error recovery
│   ├── phase-5-deliver/      # Quality gates + PR creation
│   └── detect-language/      # AI-based language detection
├── commands/
│   └── ralph-dev.md          # Main /ralph-dev command
└── shared/
    └── bootstrap-cli.sh      # Auto-build CLI on first use
```

### Workspace Structure

When you run `/ralph-dev`, a workspace directory is created:

```
your-project/
└── .ralph-dev/
    ├── state.json            # Current phase, progress tracking
    ├── prd.md                # Product Requirements Document
    ├── tasks/
    │   ├── index.json        # Task metadata and status
    │   ├── auth/
    │   │   ├── login.ui.md
    │   │   ├── login.api.md
    │   │   └── logout.md
    │   └── setup/
    │       └── scaffold.md
    ├── progress.log          # Audit trail (gitignored)
    └── debug.log             # Error logs (gitignored)
```

**Task File Format:**
```markdown
---
id: auth.login.ui
module: auth
priority: 2
status: pending
estimatedMinutes: 25
dependencies: [setup.scaffold]
testRequirements:
  unit:
    required: true
    pattern: "**/*.test.ts"
---

# Login UI Component

## Acceptance Criteria
1. Form displays email and password fields
2. Submit button validates email format
...
```

## Installation

### Prerequisites
- Claude Code (latest version)
- Node.js >= 18.0.0
- npm >= 9.0.0
- Git repository

### Installation Steps

**Step 1: Install CLI globally**
```bash
npm install -g ralph-dev
```

**Step 2: Add plugin marketplace**
```bash
/plugin marketplace add mylukin/ralph-dev
```

**Step 3: Install plugin**
```bash
/plugin install ralph-dev
```

**Step 4: Initialize project**
```bash
ralph-dev init
```
This installs workflow rules to `.claude/rules/` for better AI guidance during development.

**Note:** The TypeScript CLI auto-builds on first use. Build time depends on your system performance.

## Usage

### Starting a New Task
```bash
/ralph-dev "Add real-time notifications using WebSockets"
```

### Resuming Previous Session
```bash
/ralph-dev resume
```

### Check Progress
```bash
/ralph-dev status
```

### Cancel Session
```bash
/ralph-dev cancel
```

## CLI Reference

The `ralph-dev` CLI is used internally by skills to manage state and tasks:

```bash
# State management
ralph-dev state get                    # Read current state
ralph-dev state update --phase clarify # Update phase
ralph-dev state clear                  # Reset state

# Task management
ralph-dev tasks list                   # List all tasks
ralph-dev tasks next --json            # Get next pending task
ralph-dev tasks start <id>             # Mark task in progress
ralph-dev tasks done <id>              # Mark task completed
ralph-dev tasks fail <id> --reason ""  # Mark task failed

# Language detection
ralph-dev detect                       # Detect language/framework
ralph-dev detect-ai                    # AI-powered detection
```

## Language Detection

Ralph-dev automatically detects your project's language and configures verification commands:

| Language | Frameworks Detected | Test Frameworks | Build Tools |
|----------|-------------------|----------------|-------------|
| JavaScript/TypeScript | Next.js, React, Vue, Angular | Jest, Vitest | npm, Vite, Webpack |
| Python | Django, Flask, FastAPI | pytest, unittest | pip |
| Go | - | go test | go build |
| Rust | - | cargo test | cargo |
| Java | - | JUnit | Maven, Gradle |
| Ruby | Rails | RSpec, Minitest | bundler |
| PHP | Laravel, Symfony | PHPUnit | composer |
| C# | .NET | xunit | dotnet |
| Swift, Kotlin, Scala, C++ | Various | Various | Various |

Detection analyzes:
- Package manager files (package.json, requirements.txt, Cargo.toml, etc.)
- Configuration files
- Source file extensions
- Project structure patterns

## How It Works: Example Flow

**User Input:**
```bash
/ralph-dev "Add password reset functionality"
```

**Phase 1: CLARIFY**
- Asks questions about reset method (email/SMS), token expiration, security requirements
- Generates PRD with user stories and technical requirements

**Phase 2: BREAKDOWN**
Creates tasks like:
- `auth.password-reset.ui` - Frontend form component
- `auth.password-reset.api` - Backend API endpoint
- `auth.password-reset.email` - Email notification service
- `auth.password-reset.tests` - Integration tests
- `auth.password-reset.docs` - API documentation

**Phase 3: IMPLEMENT**
For each task:
1. Spawns fresh agent context
2. Implements with TDD (tests first)
3. Runs verification commands
4. Marks task complete or invokes Phase 4 on error

**Phase 4: HEAL** (if needed)
- Searches for error solutions
- Applies fixes automatically
- Retries verification

**Phase 5: DELIVER**
- Runs full quality gates (type-check, lint, test, build)
- Reviews spec compliance and code quality
- Creates git commit with semantic message
- Generates pull request

## Configuration

Ralph-dev can be configured through environment variables:

### Environment Variables

| Variable | Purpose | Default |
|----------|---------|---------|
| `CI` | Enable CI mode for tests (non-interactive) | - |
| `RALPH_DEV_WORKSPACE` | Override workspace directory | `process.cwd()` |

### CI/CD Configuration

For CI/CD automation, use `.ralph-dev/ci-config.yml`:

```yaml
ci_mode:
  enabled: true
  auto_approve_breakdown: true
  limits:
    max_tasks: 50
    max_total_time: "4h"
```

### Git Configuration
Add `.ralph-dev/` directory to your `.gitignore`:
```
.ralph-dev/state.json
.ralph-dev/progress.log
.ralph-dev/debug.log
```

Commit task definitions and PRD:
```
!.ralph-dev/prd.md
!.ralph-dev/tasks/
```

**Note:** Ralph-dev automatically verifies and fixes gitignore configuration in Phase 2.

## Troubleshooting

### Plugin not loading
```bash
# Reinstall the plugin
/plugin uninstall ralph-dev
/plugin marketplace add mylukin/ralph-dev
/plugin install ralph-dev
/clear  # Clear session and restart
```

### CLI not found
```bash
# Verify global installation
npm list -g ralph-dev

# Reinstall if needed
npm install -g ralph-dev
```

### Marketplace update
```bash
# Update marketplace to get latest version
/plugin marketplace update mylukin/ralph-dev
/plugin update ralph-dev
```

### CLI build fails
```bash
# Verify Node.js version
node --version  # Should be >= 18.0.0
npm --version   # Should be >= 9.0.0

# Manual build
cd ~/.claude/plugins/ralph-dev/cli
npm install
npm run build
```

### Tasks not progressing
```bash
# Check current state
ralph-dev state get

# View task status
ralph-dev tasks list

# Reset if stuck
ralph-dev state clear
```

## Contributing

We welcome contributions:

- **Bug Reports**: [GitHub Issues](https://github.com/mylukin/ralph-dev/issues)
- **Feature Requests**: [GitHub Discussions](https://github.com/mylukin/ralph-dev/discussions)
- **Pull Requests**:
  1. Fork the repository
  2. Create feature branch
  3. Add tests for new functionality
  4. Use semantic commit messages
  5. Submit PR with description

## Development

### Running Tests
```bash
cd cli
npm test
```

### Building CLI
```bash
cd cli
npm install
npm run build
```

### Plugin Structure
- Commands: User-facing entry points (`/ralph-dev`)
- Skills: AI agent workflows (5 phases + orchestrator)
- Agents: Autonomous specialized agents (language detector)
- CLI: TypeScript binary for state/task management

### CLI Best Practices for AI Agents

**Important**: When calling the ralph-dev CLI from skills or agents, follow these best practices:

✅ **Always use `--json` flag** for structured output
✅ **Parse JSON responses** and check `.success` field
✅ **Handle errors gracefully** using `.error.code` and `.error.recoverable`
✅ **Use batch operations** for bulk updates (10x faster)
✅ **Use filters** to reduce data transfer
✅ **Check exit codes** for programmatic error handling

**Example**:
```bash
# Get task with error handling
RESULT=$(ralph-dev tasks next --json)

if echo "$RESULT" | jq -e '.success == true' > /dev/null; then
  TASK_ID=$(echo "$RESULT" | jq -r '.data.task.id')
  echo "Next task: $TASK_ID"
else
  ERROR=$(echo "$RESULT" | jq -r '.error.message')
  echo "Error: $ERROR"
  exit 1
fi
```

**Documentation**:
- 📋 [CLI Improvements Reference](CLI_IMPROVEMENTS.md)

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Support

- 📖 [Skill Documentation](skills/)
- 🐛 [Report Issues](https://github.com/mylukin/ralph-dev/issues)
- 💬 [Discussions](https://github.com/mylukin/ralph-dev/discussions)
- 🌐 [GitHub Repository](https://github.com/mylukin/ralph-dev)

## Acknowledgments

Built for the Claude Code plugin ecosystem. Requires Claude Code CLI to function.

---

**Version:** 0.4.3
**Status:** Active development
**Author:** Lukin ([email protected])
