---
argument-hint: "<requirement>" [--mode=resume|status|cancel]
description: Start autonomous end-to-end development from requirement to production-ready code
context: fork
agent: general-purpose
---

# Ralph-dev Command Handler

You are executing the `/ralph-dev` command. Your task is to parse user input and invoke the development orchestrator skill.

## User Arguments

User provided: `$ARGUMENTS`

## Execution Logic

**Step 1: Parse the mode** from the arguments:

- If arguments contain `--mode=resume` or just `resume`: Resume the last session
- If arguments contain `--mode=status` or just `status`: Show session status
- If arguments contain `--mode=cancel` or just `cancel`: Cancel current session
- Otherwise: Start new development session with the provided requirement

**Step 2: Invoke the orchestrator skill** using the Skill tool:

```javascript
skill: "dev-orchestrator"
args: "$ARGUMENTS"
```

**Step 3: Pass through all responses** from the skill to the user

## Important Notes

- The dev-orchestrator skill handles all workflow phases (clarify, breakdown, implement, heal, deliver)
- User will interact directly with questions during the clarification phase
- Session state persists in `.ralph-dev/` directory for resumption
- All extensive documentation is in `docs/ralph-dev-guide.md`

## Error Handling

- If no arguments provided for new session: Ask user to provide a requirement
- If skill invocation fails: Show error and suggest checking skill availability
- For all other errors: Let the dev-orchestrator handle them
