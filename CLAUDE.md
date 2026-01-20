# Ralph-dev

Autonomous end-to-end development system integrated with Claude Code. Transforms natural language requirements into production-ready, tested code through a 5-phase workflow.
> 与 Claude Code 集成的自主端到端开发系统。通过 5 阶段工作流将自然语言需求转换为生产就绪的测试代码。

## Architecture

```
Clarify → Breakdown → Implement ⇄ Heal → Deliver
```

**Tech Stack:**
- **CLI**: TypeScript 5.3+ with Commander.js (`cli/`)
- **Skills**: AI agent workflows for each phase (`skills/`)
- **Plugin**: Claude Code plugin configuration (`.claude-plugin/`)

## Quick Reference

See `.claude/rules/` for detailed guidance:
- **@.claude/rules/ralph-dev-workflow.md** - Phase state machine, recovery after compression
- **@.claude/rules/ralph-dev-principles.md** - 8 core principles (TDD, circuit breaker, layered arch)
- **@.claude/rules/ralph-dev-commands.md** - CLI command reference

## Most Used Commands

```bash
# Query state (ALWAYS do this first after context compression)
ralph-dev state get --json

# Get next task
ralph-dev tasks next --json

# Task lifecycle
ralph-dev tasks start <id>
ralph-dev tasks done <id>
ralph-dev tasks fail <id> --reason "..."
```

## Key Design Principles

1. **State-Driven Execution** - Never assume state; always query CLI first
2. **TDD Enforcement** - Write failing tests first, implement minimal code
3. **Fresh Agent Context** - Each task uses fresh subagent via Task tool
4. **Circuit Breaker** - Max 5 heal attempts before marking task failed
5. **Layered Architecture** - Commands → Services → Repositories → Domain → Infrastructure
6. **AskUserQuestion** - Use for user interaction in main session (not bash read)

## Testing

**CRITICAL**: Always use `CI=true` when running tests to prevent interactive mode.

```bash
CI=true npm test              # Run all tests
CI=true npx vitest run <file> # Run single test
```

## CLI Documentation

For CLI-specific implementation details, see:
- **@cli/CLAUDE.md** - TypeScript CLI development guide

## CLI Release Process

When user says "发布 cli release" or "publish cli release", execute the following steps automatically:
> 当用户说"发布 cli release"时，自动执行以下步骤：

### Release Steps

```bash
# Step 1: Run quality checks
cd cli && CI=true npm test && npm run lint && npm run build

# Step 2: Determine version bump (ask user if not specified)
# Options: patch (0.0.x), minor (0.x.0), major (x.0.0)

# Step 3: Bump version
npm version <patch|minor|major>

# Step 4: Commit and tag
cd .. && git add cli/package.json
git commit -m "chore(cli): release v$(node -p \"require('./cli/package.json').version\")"
git tag cli-v$(node -p "require('./cli/package.json').version")

# Step 5: Push to trigger GitHub Actions
git push origin main --tags
```

### Automated Workflow

GitHub Actions (`.github/workflows/publish-cli.yml`) will automatically:
1. Verify tag version matches `package.json`
2. Run tests and lint
3. Build the CLI
4. Publish to npm
5. Create GitHub Release

### Version Guidelines

| Type | When to Use | Example |
|------|-------------|---------|
| `patch` | Bug fixes, minor updates | 0.2.0 → 0.2.1 |
| `minor` | New features, backwards compatible | 0.2.0 → 0.3.0 |
| `major` | Breaking changes | 0.2.0 → 1.0.0 |

---

**Last Updated:** 2026-01-20
