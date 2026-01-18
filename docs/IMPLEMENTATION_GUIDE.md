# Autopilot Implementation Guide | 实现指南

This guide provides step-by-step instructions to build the Autopilot system from scratch.

本指南提供从零开始构建 Autopilot 系统的分步说明。

## Table of Contents | 目录

1. [Prerequisites](#prerequisites--前置要求)
2. [Week 1: Foundation](#week-1-foundation--第1周基础)
3. [Week 2-3: Core Skills](#week-2-3-core-skills--第2-3周核心技能)
4. [Week 4: Agents](#week-4-agents--第4周代理)
5. [Week 5: Supporting Skills](#week-5-supporting-skills--第5周支持技能)
6. [Week 6: Hooks & Polish](#week-6-hooks--polish--第6周钩子与完善)
7. [Testing Strategy](#testing-strategy--测试策略)
8. [Deployment](#deployment--部署)

---

## Prerequisites | 前置要求

### Required Knowledge | 必备知识

- ✅ Claude Code plugin development
- ✅ YAML frontmatter syntax
- ✅ Markdown formatting
- ✅ Bash scripting basics
- ✅ Git workflows

### Tools Needed | 所需工具

```bash
# Claude Code CLI
brew install claude-code  # or download from claude.com/code

# Git
git --version  # Should be >=2.30

# Node.js (for testing)
node --version  # Should be >=18

# jq (for JSON parsing in scripts)
brew install jq
```

### Study Materials | 学习材料

Before starting, read these official docs:

1. **Skills**: https://code.claude.com/docs/en/skills
2. **Slash Commands**: https://code.claude.com/docs/en/slash-commands
3. **Agents**: https://code.claude.com/docs/en/agents
4. **Hooks**: https://code.claude.com/docs/en/hooks

---

## Week 1: Foundation | 第1周：基础

### Day 1: Project Setup | 第1天：项目设置

#### Step 1.1: Create Directory Structure

```bash
cd ~/Projects
mkdir -p autopilot
cd autopilot

# Create all directories
mkdir -p .claude-plugin
mkdir -p skills/{autopilot-orchestrator,phase-1-clarify,phase-2-breakdown,phase-3-implement,phase-4-heal,phase-5-deliver}
mkdir -p skills/support/{systematic-debugging,verification-check,tdd-enforcer,code-reviewer}
mkdir -p agents
mkdir -p commands
mkdir -p hooks
mkdir -p tools
mkdir -p examples
mkdir -p docs
mkdir -p tests
```

#### Step 1.2: Initialize Git

```bash
git init
cat > .gitignore <<'EOF'
# Workspace (user-specific)
workspace/
.claude/autopilot/

# OS files
.DS_Store
Thumbs.db

# IDE
.vscode/
.idea/

# Logs
*.log
debug.log

# Test artifacts
coverage/
.nyc_output/

# Temporary
tmp/
temp/
EOF

git add .gitignore
git commit -m "chore: Initialize project structure"
```

#### Step 1.3: Create Plugin Metadata

```bash
cat > .claude-plugin/plugin.json <<'EOF'
{
  "name": "autopilot",
  "version": "1.0.0",
  "description": "Autonomous end-to-end development from requirement to delivery",
  "author": {
    "name": "Your Name",
    "email": "your.email@example.com"
  },
  "homepage": "https://github.com/mylukin/autopilot",
  "repository": "https://github.com/mylukin/autopilot",
  "license": "MIT",
  "keywords": [
    "autonomous",
    "autopilot",
    "ai-agent",
    "self-healing",
    "tdd",
    "claude-code",
    "workflow-automation"
  ]
}
EOF
```

#### Step 1.4: Create Marketplace Metadata

```bash
cat > .claude-plugin/marketplace.json <<'EOF'
{
  "displayName": "Autopilot - Autonomous Development",
  "shortDescription": "Transform requirements into production code autonomously",
  "longDescription": "Autopilot is an autonomous development system that takes a requirement, clarifies it through structured questions, breaks it into atomic tasks, implements with TDD, auto-heals errors, and delivers production-ready code with pull requests.",
  "icon": "🚀",
  "category": "Development Workflows",
  "tags": ["automation", "tdd", "testing", "code-review", "self-healing"],
  "screenshots": [],
  "demoVideo": "",
  "minClaudeVersion": "1.0.0"
}
EOF
```

#### Step 1.5: Link to Claude Code

```bash
# Create symlink
ln -s ~/Projects/autopilot ~/.claude/plugins/autopilot

# Verify
ls -la ~/.claude/plugins/ | grep autopilot
```

### Day 2: Entry Command | 第2天：入口命令

#### Step 2.1: Create Autopilot Command

```bash
cat > commands/autopilot.md <<'EOF'
---
description: Autonomous development from requirement to delivery
argument-hint: [requirement description or 'resume'|'status'|'cancel']
disable-model-invocation: false
allowed-tools: [Skill, Read, Write, Bash]
---

# Autopilot Command

## Input Parsing

User command: `/autopilot $ARGUMENTS`

## Mode Detection

```python
if $ARGUMENTS == "resume":
    mode = "RESUME"
elif $ARGUMENTS == "status":
    mode = "STATUS"
elif $ARGUMENTS == "cancel":
    mode = "CANCEL"
else:
    mode = "NEW"
    requirement = $ARGUMENTS
```

## Execution

### Mode: NEW

```markdown
🚀 Starting Autopilot...

Requirement: $ARGUMENTS
Mode: Full autonomous development
Phases: 5 (Clarify → Breakdown → Implement → Heal → Deliver)

Invoking autopilot-orchestrator skill...
```

Invoke the `autopilot-orchestrator` skill with:
```
User requirement: $ARGUMENTS

Execute the complete 5-phase workflow:
1. Clarify requirements (interactive)
2. Breakdown into tasks (autonomous)
3. Implement all tasks (autonomous)
4. Self-heal errors (on-demand)
5. Deliver with quality gates (autonomous)

Show progress updates throughout.
```

### Mode: RESUME

```bash
# Check if state file exists
if [ -f ".claude/autopilot/state.json" ]; then
    # Resume from saved state
    Invoke autopilot-orchestrator with resume=true
else
    echo "❌ No saved session found. Start new: /autopilot <requirement>"
fi
```

### Mode: STATUS

```bash
# Show current progress
cat .claude/autopilot/state.json | jq '{
  phase: .phase,
  progress: "\(.completed | length)/\(.totalTasks)",
  current: .currentTask,
  elapsed: .elapsedTime
}'
```

### Mode: CANCEL

```bash
# Clean up and archive
mv .claude/autopilot .claude/autopilot-cancelled-$(date +%Y%m%d-%H%M%S)
echo "✅ Session cancelled and archived"
```

## Output Format

After invoking skill, show:

```
┌─────────────────────────────────────────┐
│ 🚀 AUTOPILOT ACTIVE                     │
├─────────────────────────────────────────┤
│ Status: Phase 1 - Clarifying            │
│ Action: Asking questions...             │
└─────────────────────────────────────────┘
```
EOF

git add commands/autopilot.md
git commit -m "feat: Add autopilot entry command"
```

### Day 3-5: Core Workspace Setup | 第3-5天：核心工作空间设置

#### Create Workspace Templates

```bash
mkdir -p workspace/.claude/autopilot/templates

# State template
cat > workspace/.claude/autopilot/templates/state.json <<'EOF'
{
  "phase": "clarify",
  "requirement": "",
  "currentTask": null,
  "currentTaskIndex": 0,
  "totalTasks": 0,
  "completed": [],
  "failed": [],
  "autoFixes": 0,
  "startedAt": "",
  "estimatedCompletion": ""
}
EOF

# PRD template
cat > workspace/.claude/autopilot/templates/prd.md <<'EOF'
# Product Requirements Document

## Project Goal
[One sentence summary]

## User Stories
1. As a [user type], I can [action] so that [benefit]

## Technical Specifications

### Architecture
- Type: [e.g., Full-stack web app]
- Frontend: [e.g., React + TypeScript]
- Backend: [e.g., Node.js + Express]
- Database: [e.g., PostgreSQL]

### Core Features
1. **Feature Name**
   - Description
   - Acceptance criteria

## Quality Requirements
- Test coverage: >80%
- TDD mode: strict|recommended|disabled
- Code review: 2-stage required

## Non-Functional Requirements
- Performance: [metrics]
- Security: [requirements]
- Accessibility: [standards]
EOF

# Tasks template
cat > workspace/.claude/autopilot/templates/tasks.json <<'EOF'
{
  "tasks": [],
  "metadata": {
    "totalTasks": 0,
    "estimatedHours": 0,
    "tddMode": "strict",
    "createdAt": ""
  }
}
EOF
```

---

## Week 2-3: Core Skills | 第2-3周：核心技能

### Implementation Order

1. ✅ Orchestrator (Week 2, Day 1-2) - Routes between phases
2. ✅ Phase 1: Clarify (Week 2, Day 3-4) - Asks questions, generates PRD
3. ✅ Phase 2: Breakdown (Week 2, Day 5) - Creates atomic tasks
4. ✅ Phase 3: Implement (Week 3, Day 1-3) - Execution loop
5. ✅ Phase 4: Heal (Week 3, Day 4) - Self-healing
6. ✅ Phase 5: Deliver (Week 3, Day 5) - Quality gates + delivery

### Skill 1: Autopilot Orchestrator

**File:** `skills/autopilot-orchestrator/SKILL.md`

See [../skills/autopilot-orchestrator/SKILL.md](../skills/autopilot-orchestrator/SKILL.md) for complete implementation.

**Key Pseudocode:**

```python
def orchestrate(user_requirement):
    # Initialize state
    state = {
        "phase": "clarify",
        "requirement": user_requirement,
        "startedAt": now()
    }
    save_state(state)

    # Phase 1: Clarify
    prd = invoke_skill("phase-1-clarify", user_requirement)
    save_file(".claude/autopilot/prd.md", prd)
    state["phase"] = "breakdown"

    # Phase 2: Breakdown
    tasks = invoke_skill("phase-2-breakdown", prd)
    save_file(".claude/autopilot/tasks.json", tasks)
    state["totalTasks"] = len(tasks)
    state["phase"] = "implement"

    # Phase 3: Implement (with healing)
    for task in tasks:
        result = invoke_skill("phase-3-implement", task)

        if result.status == "error":
            # Phase 4: Heal
            heal_result = invoke_skill("phase-4-heal", result.error)
            if heal_result.status == "fixed":
                state["completed"].append(task.id)
                state["autoFixes"] += 1
            else:
                state["failed"].append(task.id)
        else:
            state["completed"].append(task.id)

        update_progress(state)

    # Phase 5: Deliver
    state["phase"] = "deliver"
    delivery = invoke_skill("phase-5-deliver", state)

    return delivery
```

**Testing:**

```bash
# Create test file
cat > tests/test-orchestrator.md <<'EOF'
# Test: Orchestrator Skill

## Input
User requirement: "Build a simple todo app"

## Expected Behavior
1. Invokes phase-1-clarify
2. Waits for user answers
3. Invokes phase-2-breakdown
4. Shows task plan
5. Waits for approval
6. Invokes phase-3-implement for each task
7. Invokes phase-5-deliver when done

## Verification
- State file created
- PRD file created
- Tasks file created
- All phases executed in order
EOF
```

### Skill 2: Phase 1 - Clarify

**File:** `skills/phase-1-clarify/SKILL.md`

**Implementation:**

```bash
cat > skills/phase-1-clarify/SKILL.md <<'EOF'
---
name: phase-1-clarify
description: Interactive requirement clarification through structured questions
allowed-tools: [Read, Write, AskUserQuestion]
context: fork
agent: general-purpose
---

# Phase 1: Clarify Requirements

## Mission

Transform vague user requirement into detailed PRD through structured questioning.

## Question Framework

Ask 3-5 questions using **lettered options (A, B, C, D)** for easy selection.

### Standard Question Set

#### Question 1: Application Type

```
🤔 Question 1/5: What type of application?
   A) Web app (React/Vue/Angular)
   B) Mobile app (React Native/Flutter)
   C) API backend only
   D) Full-stack (frontend + backend)

Your choice: _
```

#### Question 2: Core Features

```
🤔 Question 2/5: Core features to include? (Select multiple)
   A) User authentication
   B) Data CRUD operations
   C) Real-time updates
   D) File uploads
   E) Search & filtering

Your choices: _
```

#### Question 3: Tech Stack

```
🤔 Question 3/5: Preferred technologies?
   A) TypeScript + Node.js + PostgreSQL
   B) Python + FastAPI + MongoDB
   C) Go + Gin + MySQL
   D) Choose for me (best practices)

Your choice: _
```

#### Question 4: Testing Requirements

```
🤔 Question 4/5: Testing requirements?
   A) Unit tests only
   B) Unit + integration tests
   C) Unit + integration + E2E
   D) TDD strict mode (tests first, mandatory)

Your choice: _
```

#### Question 5: Deployment

```
🤔 Question 5/5: Deployment target?
   A) Local development only
   B) Docker containers
   C) Cloud platform (AWS/GCP/Azure)
   D) Serverless (Lambda/Cloud Functions)

Your choice: _
```

## PRD Generation

After collecting answers, generate:

```markdown
# Product Requirements Document

## Project Goal
${user_requirement}

## Answers Summary
- Application type: ${answer_1}
- Core features: ${answer_2}
- Tech stack: ${answer_3}
- Testing: ${answer_4}
- Deployment: ${answer_5}

## User Stories

${generate_user_stories_from_features()}

## Technical Specifications

### Architecture
- Type: ${answer_1}
- Frontend: ${extract_frontend(answer_3)}
- Backend: ${extract_backend(answer_3)}
- Database: ${extract_database(answer_3)}

### Core Features

${expand_features(answer_2)}

### Quality Requirements
- Test coverage: >80%
- TDD mode: ${answer_4_to_mode()}
- Code review: 2-stage required

## Acceptance Criteria

Global (apply to ALL tasks):
- [ ] TypeScript compiles with no errors
- [ ] All tests passing
- [ ] ESLint passing (0 errors)
- [ ] Code reviewed and approved

## Non-Functional Requirements
- Performance: API response < 200ms
- Security: OWASP top 10 compliance
- Accessibility: WCAG 2.1 AA (if web app)
```

## Helper Functions

```python
def generate_user_stories_from_features(features):
    stories = []

    if "authentication" in features:
        stories.append("As a user, I can register an account so that I can access the app")
        stories.append("As a user, I can log in so that I can access my data")
        stories.append("As a user, I can log out so that I can secure my session")

    if "crud" in features:
        stories.append("As a user, I can create items so that I can add new data")
        stories.append("As a user, I can view items so that I can see my data")
        stories.append("As a user, I can update items so that I can modify data")
        stories.append("As a user, I can delete items so that I can remove data")

    # ... more mappings

    return stories

def answer_4_to_mode(answer):
    mapping = {
        "A": "recommended",  # Unit only
        "B": "recommended",  # Unit + integration
        "C": "strict",       # Unit + integration + E2E
        "D": "strict"        # TDD strict
    }
    return mapping.get(answer, "recommended")
```

## Output

Save to: `.claude/autopilot/prd.md`

Return to orchestrator:
```yaml
---PHASE RESULT---
phase: clarify
status: complete
output_file: .claude/autopilot/prd.md
next_phase: breakdown
---END PHASE RESULT---
```
EOF

git add skills/phase-1-clarify/
git commit -m "feat: Add phase-1-clarify skill"
```

### Skill 3: Phase 2 - Breakdown

**File:** `skills/phase-2-breakdown/SKILL.md`

**Key Algorithm:**

```python
def breakdown_prd_to_tasks(prd):
    tasks = []

    # Step 1: Setup tasks (always first)
    tasks.append({
        "id": "setup.scaffold",
        "priority": 1,
        "title": "Initialize project structure",
        "estimatedMinutes": 15,
        "acceptanceCriteria": [
            "Project folder structure exists",
            "Package.json created",
            "TypeScript configured",
            "ESLint configured"
        ]
    })

    # Step 2: Parse user stories from PRD
    stories = extract_user_stories(prd)

    # Step 3: Convert each story to tasks
    for story in stories:
        story_tasks = decompose_story(story)

        # Validate task size
        for task in story_tasks:
            if task.estimatedMinutes > 30:
                # Split into smaller tasks
                subtasks = split_task(task)
                tasks.extend(subtasks)
            else:
                tasks.append(task)

    # Step 4: Add dependencies
    tasks = add_dependencies(tasks)

    # Step 5: Assign priorities
    tasks = assign_priorities(tasks)

    return tasks

def decompose_story(story):
    """
    Convert one user story to 1-3 tasks.

    Example:
    Story: "As a user, I can log in"
    Tasks:
      1. auth.login.ui - Create login form
      2. auth.login.api - Create login endpoint
      3. auth.login.tests - Write integration tests
    """
    tasks = []

    # UI task
    if needs_ui_component(story):
        tasks.append(create_ui_task(story))

    # API task
    if needs_api_endpoint(story):
        tasks.append(create_api_task(story))

    # Test task (if not bundled)
    if needs_separate_test_task(story):
        tasks.append(create_test_task(story))

    return tasks
```

**Full Implementation:** See `skills/phase-2-breakdown/SKILL.md` in repository.

### Skill 4: Phase 3 - Implement

**Key Loop:**

```python
def implement_all_tasks(tasks_json):
    tasks = load_json(tasks_json)

    while True:
        # Get next pending task
        task = get_next_pending_task(tasks)

        if task is None:
            break  # All done

        # Spawn implementer agent (fresh context)
        result = spawn_agent(
            type="implementer",
            context={
                "task_id": task.id,
                "title": task.title,
                "description": task.description,
                "acceptance_criteria": task.acceptanceCriteria,
                "tdd_mode": get_tdd_mode()
            }
        )

        # Parse result
        if result.status == "success" and result.verification == "passed":
            mark_complete(task.id)
            show_progress(task.id, result)

        elif result.status == "error":
            # Auto-heal
            heal_result = spawn_agent(
                type="debugger",
                context=result.error_details
            )

            if heal_result.status == "fixed":
                mark_complete(task.id)
                log_auto_fix(task.id, heal_result)
            else:
                mark_failed(task.id, heal_result.diagnostics)

        else:
            mark_failed(task.id, "Verification failed")

        # Update state
        update_state_file(task.id)

    return "all_complete"
```

**Full Implementation:** See `skills/phase-3-implement/SKILL.md`.

### Skill 5: Phase 4 - Heal

**Self-Healing Algorithm:**

```python
def self_heal(error_context):
    """
    4-phase self-healing protocol.

    Returns: {"status": "fixed"|"failed", "attempts": int, ...}
    """

    max_attempts = 3

    for attempt in range(1, max_attempts + 1):
        # PHASE 1: CAPTURE
        error_info = {
            "message": extract_error_message(error_context),
            "stack_trace": extract_stack_trace(error_context),
            "failed_command": error_context.command,
            "file": extract_file_from_stack(error_context),
            "line": extract_line_from_stack(error_context)
        }

        # PHASE 2: SEARCH
        query = f"{framework} {error_info.message} fix 2026"
        search_results = web_search(query)
        solution = parse_solution_from_results(search_results)

        # PHASE 3: APPLY
        fix_type = classify_error(error_info)

        if fix_type == "MODULE_NOT_FOUND":
            package = extract_package_name(error_info.message)
            execute(f"npm install {package}")

        elif fix_type == "SYNTAX_ERROR":
            edit_file(error_info.file, error_info.line, solution.code_fix)

        elif fix_type == "PORT_IN_USE":
            port = extract_port(error_info.message)
            kill_process_on_port(port)

        # ... more error types

        # PHASE 4: VERIFY
        result = execute(error_context.command)

        if result.exit_code == 0:
            return {
                "status": "fixed",
                "attempts": attempt,
                "solution": solution.description,
                "verification": result.output
            }

    # Failed after max attempts
    return {
        "status": "failed",
        "attempts": max_attempts,
        "diagnostics": collect_diagnostics(error_info)
    }
```

**Full Implementation:** See `skills/phase-4-heal/SKILL.md`.

### Skill 6: Phase 5 - Deliver

**Quality Gates:**

```python
def deliver_with_quality_gates(state):
    """
    Run quality gates, create commit, open PR.
    """

    gates = [
        ("All tasks complete", check_all_tasks_complete),
        ("All tests passing", check_tests_passing),
        ("Type checking", check_typescript),
        ("Linting", check_eslint),
        ("Build success", check_build),
        ("Code review: Spec", review_spec_compliance),
        ("Code review: Quality", review_code_quality)
    ]

    results = {}

    for gate_name, gate_func in gates:
        result = gate_func()
        results[gate_name] = result

        if not result.passed:
            return {
                "status": "failed",
                "failed_gate": gate_name,
                "details": result.details
            }

    # All gates passed
    commit_hash = create_commit()
    pr_number = create_pull_request()

    return {
        "status": "success",
        "commit": commit_hash,
        "pr": pr_number,
        "quality_results": results
    }
```

**Full Implementation:** See `skills/phase-5-deliver/SKILL.md`.

---

## Week 4: Agents | 第4周：代理

### Agent 1: Implementer

**Responsibility:** Execute single task with TDD workflow.

**See:** `agents/implementer.md` for full implementation.

**Testing:**

```bash
# Test implementer agent standalone
cat > tests/test-implementer.sh <<'EOF'
#!/bin/bash

# Create test task
cat > /tmp/test-task.json <<'TASK'
{
  "id": "test.simple",
  "title": "Add two numbers",
  "description": "Create a function that adds two numbers",
  "acceptanceCriteria": [
    "Function exists at src/add.ts",
    "Function returns sum of two numbers",
    "Unit tests pass"
  ],
  "tddMode": "strict"
}
TASK

# Invoke implementer
claude task \
  --agent implementer \
  --input /tmp/test-task.json \
  --output /tmp/result.json

# Check result
if jq -e '.status == "success"' /tmp/result.json; then
  echo "✅ Implementer test passed"
else
  echo "❌ Implementer test failed"
  exit 1
fi
EOF

chmod +x tests/test-implementer.sh
```

### Agent 2: Debugger

**Responsibility:** Auto-heal errors using WebSearch.

**See:** `agents/debugger.md` for full implementation.

### Agent 3: Reviewer

**Responsibility:** Two-stage code review.

**See:** `agents/reviewer.md` for full implementation.

---

## Week 5: Supporting Skills | 第5周：支持技能

Port these skills from superpowers project:

1. **systematic-debugging** - 4-phase debugging protocol
2. **verification-check** - Evidence before claims
3. **tdd-enforcer** - RED-GREEN-REFACTOR enforcement
4. **code-reviewer** - Review standards

**Commands:**

```bash
# Copy from superpowers (if available)
cp -r ~/Projects/superpowers/skills/systematic-debugging skills/support/
cp -r ~/Projects/superpowers/skills/verification-before-completion skills/support/verification-check
cp -r ~/Projects/superpowers/skills/test-driven-development skills/support/tdd-enforcer

# Or implement from scratch using documentation
```

---

## Week 6: Hooks & Polish | 第6周：钩子与完善

### Hook 1: Session Start

```bash
cat > hooks/hooks.json <<'EOF'
{
  "SessionStart": {
    "description": "Show autopilot status on session start",
    "script": "./session-start.sh"
  }
}
EOF

cat > hooks/session-start.sh <<'EOF'
#!/bin/bash

STATE_FILE=".claude/autopilot/state.json"

if [ -f "$STATE_FILE" ]; then
  PHASE=$(jq -r '.phase' "$STATE_FILE")
  CURRENT=$(jq -r '.currentTask' "$STATE_FILE")
  COMPLETED=$(jq '.completed | length' "$STATE_FILE")
  TOTAL=$(jq -r '.totalTasks' "$STATE_FILE")

  cat <<BANNER

┌────────────────────────────────────┐
│ 🚀 AUTOPILOT SESSION RESUMED       │
├────────────────────────────────────┤
│ Phase:    $PHASE                   │
│ Progress: $COMPLETED/$TOTAL tasks  │
│ Current:  $CURRENT                 │
├────────────────────────────────────┤
│ Resume: /autopilot resume          │
│ Status: /autopilot status          │
│ Cancel: /autopilot cancel          │
└────────────────────────────────────┘

BANNER
else
  cat <<BANNER

🚀 Autopilot is ready!

Start autonomous development:
  /autopilot "build a task manager app"

Learn more: /help autopilot

BANNER
fi
EOF

chmod +x hooks/session-start.sh
```

---

## Testing Strategy | 测试策略

### Unit Tests

Test individual skills in isolation:

```bash
# Test phase-1-clarify
tests/test-clarify.sh

# Test phase-2-breakdown
tests/test-breakdown.sh

# etc.
```

### Integration Tests

Test complete workflows:

```bash
# Simple project (5 tasks)
tests/integration/test-simple-todo.sh

# Medium project (15 tasks)
tests/integration/test-task-manager.sh

# Complex project (30 tasks)
tests/integration/test-full-stack-app.sh
```

### Manual Testing

```bash
# In Claude Code:
/autopilot "Build a simple counter app with increment/decrement buttons"

# Verify:
# 1. Questions asked
# 2. PRD generated
# 3. Tasks broken down
# 4. Implementation proceeds
# 5. PR created
```

---

## Deployment | 部署

### Local Development

```bash
# Link to Claude Code
ln -s ~/Projects/autopilot ~/.claude/plugins/autopilot

# Test
claude --plugins
# Should show "autopilot (1.0.0)"
```

### Publish to Marketplace

```bash
# Ensure all files are committed
git add .
git commit -m "feat: Complete implementation v1.0.0"
git tag v1.0.0
git push origin main --tags

# Submit to Claude Code marketplace
# Follow instructions at: https://code.claude.com/marketplace/submit
```

---

## Troubleshooting | 故障排除

### Skills Not Loading

```bash
# Clear plugin cache
rm -rf ~/.claude/plugins/cache

# Restart Claude Code
claude restart
```

### State File Corruption

```bash
# Reset state
rm -rf .claude/autopilot/state.json

# Copy fresh template
cp workspace/.claude/autopilot/templates/state.json .claude/autopilot/
```

### Permission Errors

```bash
# Make scripts executable
chmod +x hooks/*.sh
chmod +x tools/*.sh
```

---

## Next Steps | 后续步骤

1. ✅ Complete all 6 weeks of implementation
2. ✅ Run full test suite
3. ✅ Build example project
4. ✅ Document any issues
5. ✅ Optimize performance
6. ✅ Publish to marketplace

---

**Need help?** See [CONTRIBUTING.md](CONTRIBUTING.md) for support resources.

**需要帮助？** 参见 [CONTRIBUTING.md](CONTRIBUTING.md) 获取支持资源。
