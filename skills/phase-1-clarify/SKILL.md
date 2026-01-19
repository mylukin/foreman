---
name: phase-1-clarify
description: Interactive requirement clarification through structured questions and PRD generation
allowed-tools: [Read, Write, Bash, AskUserQuestion]
user-invocable: false
---

# Phase 1: Clarify Requirements

## Overview

Interactively clarify user requirements through structured questions, then generate a comprehensive Product Requirements Document (PRD).

通过结构化问题交互式澄清用户需求，然后生成全面的产品需求文档 (PRD)。

## When to Use

Invoked by dev-orchestrator as Phase 1 of the autonomous development workflow.

## Input

Receives the raw user requirement string from the orchestrator.

## Execution

### Step 1: Analyze Requirement

Analyze the user requirement to determine what clarifications are needed:

```bash
# Store requirement
REQUIREMENT="$USER_REQUIREMENT"

# Determine project type, scope, and ambiguities
```

### Step 2: Generate Structured Questions

Generate 3-5 structured questions with multiple choice answers (A, B, C, D).

Questions should cover:
1. **Project type** - Web app, mobile app, API, full-stack
2. **Tech stack preferences** - Framework, language, database
3. **Scale and scope** - MVP, production-ready, enterprise
4. **Authentication** - None, basic, OAuth, custom
5. **Deployment** - Local, cloud, specific platform

Use AskUserQuestion tool:

```markdown
Use AskUserQuestion with questions like:

Question 1: What type of application?
  A) Web application (React/Vue/Angular frontend)
  B) Mobile application (React Native/Flutter)
  C) Backend API only (REST/GraphQL)
  D) Full-stack application (frontend + backend)

Question 2: What's your tech stack preference?
  A) TypeScript/JavaScript (Node.js ecosystem)
  B) Python (Django/Flask/FastAPI)
  C) Go (high performance)
  D) No preference (you choose best fit)

Question 3: What's the target scale?
  A) MVP/Prototype (quick proof of concept)
  B) Production-ready (scalable, tested)
  C) Enterprise-grade (high availability, security)
  D) Learning project (focus on best practices)

Question 4: Authentication requirements?
  A) No authentication needed
  B) Basic email/password authentication
  C) OAuth (Google, GitHub, etc.)
  D) Custom authentication system

Question 5: Deployment target?
  A) Local development only
  B) Cloud platform (Vercel, Netlify, AWS)
  C) Self-hosted (Docker, VPS)
  D) Not decided yet
```

### Step 3: Collect Answers

Wait for user to answer all questions.

Store answers:
```bash
# Example answers object
ANSWERS='{
  "projectType": "Web application",
  "techStack": "TypeScript/JavaScript",
  "scale": "Production-ready",
  "auth": "Basic email/password",
  "deployment": "Cloud platform"
}'
```

### Step 4: Generate PRD

Based on the requirement and answers, generate a comprehensive PRD:

```markdown
# Product Requirements Document

## Project Overview
{Brief description based on user requirement}

## Technical Stack
- **Language**: {from answers}
- **Framework**: {inferred from answers}
- **Database**: {if needed}
- **Authentication**: {from answers}
- **Deployment**: {from answers}

## User Stories

### Epic 1: {Main feature area}
- As a user, I want to {capability} so that {benefit}
- As a user, I want to {capability} so that {benefit}

### Epic 2: {Second feature area}
- As a user, I want to {capability} so that {benefit}

## Functional Requirements

### {Feature Area 1}
1. The system shall {requirement}
2. The system shall {requirement}
3. The system shall {requirement}

### {Feature Area 2}
1. The system shall {requirement}
2. The system shall {requirement}

## Non-Functional Requirements

### Performance
- Response time < 200ms for API calls
- Page load time < 2s

### Security
- {Auth requirements from answers}
- Input validation on all forms
- HTTPS only

### Testing
- Unit test coverage > 80%
- Integration tests for critical paths
- E2E tests for user flows

## Technical Architecture

### Frontend
- Framework: {from answers}
- State management: {appropriate choice}
- Styling: {CSS framework or approach}

### Backend
- Framework: {from answers}
- API style: REST/GraphQL
- Database: {appropriate choice}

### Infrastructure
- Hosting: {from answers}
- CI/CD: GitHub Actions
- Monitoring: {if production-ready}

## Success Criteria

1. All functional requirements implemented
2. All tests passing (>80% coverage)
3. Code review passed
4. Deployed to {deployment target}
5. Documentation complete

## Out of Scope (for MVP)

- {Features to defer}
- {Nice-to-have features}

---
Generated: {timestamp}
```

### Step 5: Save PRD

Save the generated PRD to workspace:

```bash
# Ensure workspace directory exists
mkdir -p .ralph-dev

# Save PRD
cat > .ralph-dev/prd.md <<'EOF'
{GENERATED_PRD_CONTENT}
EOF

echo "✅ PRD saved to .ralph-dev/prd.md"
```

### Step 6: Update State

Update ralph-dev state to indicate Phase 1 complete:

```bash
# Update state to breakdown phase
ralph-dev state update --phase breakdown

echo "✅ Phase 1 (Clarify) complete"
```

### Step 7: Return Result

Return structured result to orchestrator:

```yaml
---PHASE RESULT---
phase: clarify
status: complete
prd_file: .ralph-dev/prd.md
next_phase: breakdown
summary: |
  Generated PRD with {N} user stories across {M} epics.
  Tech stack: {language} with {framework}
  Scale: {scale}
  Ready for task breakdown.
---END PHASE RESULT---
```

## Error Handling

| Error | Action |
|-------|--------|
| User cancels during questions | Save partial state, return status: cancelled |
| Invalid answers | Re-ask the specific question |
| PRD generation fails | Use fallback template-based PRD |
| Workspace directory creation fails | Try alternative path or fail gracefully |

## Example Output

**User Requirement**: "Build a task management app with user authentication"

**Questions & Answers**:
- Q1: Project type → A (Web application)
- Q2: Tech stack → A (TypeScript/JavaScript)
- Q3: Scale → B (Production-ready)
- Q4: Auth → B (Basic email/password)
- Q5: Deployment → B (Cloud platform - Vercel)

**Generated PRD Excerpt**:
```markdown
# Product Requirements Document

## Project Overview
A task management web application that allows users to create, organize, and track tasks with secure user authentication.

## Technical Stack
- **Language**: TypeScript
- **Frontend**: React with Next.js
- **Backend**: Next.js API Routes
- **Database**: PostgreSQL (Vercel Postgres)
- **Authentication**: NextAuth.js with email/password
- **Deployment**: Vercel

## User Stories

### Epic 1: User Authentication
- As a user, I want to sign up with email/password so that I can access my tasks
- As a user, I want to log in securely so that my data is protected
- As a user, I want to log out so that others can't access my account

### Epic 2: Task Management
- As a user, I want to create new tasks so that I can track my work
- As a user, I want to mark tasks as complete so that I know what's done
- As a user, I want to delete tasks so that I can remove outdated items
...
```

## Rules

1. **Ask minimum 3, maximum 5 questions** - Keep it concise
2. **Use AskUserQuestion tool** - Don't ask questions in plain text
3. **Generate comprehensive PRD** - Include all necessary sections
4. **Save to .ralph-dev/prd.md** - Standard location
5. **Update state** - Always update to next phase
6. **Return structured result** - Use YAML format

## Notes

- Questions should be tailored to the user requirement
- PRD should be detailed enough for task breakdown
- Infer reasonable defaults when answers are ambiguous
- PRD format should be consistent for Phase 2 parsing
