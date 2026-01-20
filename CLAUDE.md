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

---

**Last Updated:** 2026-01-20
