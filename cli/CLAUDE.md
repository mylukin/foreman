# Ralph-dev CLI

TypeScript command-line tool for managing AI agent workflow state and tasks. Called from Ralph-dev skills during autonomous development phases.

## Key Design

- **Zero-config**: Creates `.ralph-dev/` on first use
- **CLI-first**: All operations via command-line for bash integration
- **JSON output**: Every command supports `--json` flag
- **Layered architecture**: Commands → Services → Repositories → Domain → Infrastructure

## Development Commands

**CRITICAL**: Always use `CI=true` when running tests.

```bash
# Build and run
npm run dev           # Development with watch
npm run build         # Production build

# Testing (MUST use CI=true)
CI=true npm test                           # All tests
CI=true npx vitest run src/core/task-parser.test.ts  # Single file
CI=true npx vitest run --coverage          # With coverage

# Code quality
npm run lint          # Lint check
npm run format        # Format code
```

## Quick Start: Adding a New Feature

Follow this layered approach:

### 1. Domain Entity (`src/domain/`)
```typescript
export class MyEntity {
  constructor(public readonly id: string, private _status: string) {}
  canTransition(): boolean { return this._status === 'ready'; }
  transition(): void {
    if (!this.canTransition()) throw new Error('Invalid transition');
    this._status = 'done';
  }
}
```

### 2. Repository Interface (`src/repositories/`)
```typescript
export interface IMyRepository {
  findById(id: string): Promise<MyEntity | null>;
  save(entity: MyEntity): Promise<void>;
}
```

### 3. Service (`src/services/`)
```typescript
export class MyService {
  constructor(private repo: IMyRepository, private logger: ILogger) {}
  async process(id: string): Promise<MyEntity> {
    const entity = await this.repo.findById(id);
    if (!entity) throw new Error('Not found');
    entity.transition();
    await this.repo.save(entity);
    return entity;
  }
}
```

### 4. Service Factory (`src/commands/service-factory.ts`)
```typescript
export function createMyService(workspaceDir: string): MyService {
  const fileSystem = new FileSystemService();
  const repo = new FileSystemMyRepository(fileSystem, workspaceDir);
  return new MyService(repo, new ConsoleLogger());
}
```

### 5. Command (`src/commands/`)
```typescript
my.command('process <id>')
  .option('--json', 'Output JSON')
  .action(async (id, options) => {
    const service = createMyService(process.env.RALPH_DEV_WORKSPACE || process.cwd());
    try {
      const entity = await service.process(id);
      outputResponse({ entity }, options.json);
    } catch (error) { handleError(error, options.json); }
  });
```

## File Structure

```
cli/src/
├── commands/              # CLI interface (thin layer)
│   └── service-factory.ts # Dependency injection
├── services/              # Business logic
│   ├── task-service.ts
│   ├── state-service.ts
│   └── healing-service.ts # Circuit breaker
├── repositories/          # Data access
│   ├── task-repository.service.ts
│   └── state-repository.service.ts
├── domain/                # Entities with behavior
│   ├── task-entity.ts
│   └── state-entity.ts
├── infrastructure/        # File I/O, logging
│   ├── file-system.service.ts
│   └── logger.service.ts
├── core/                  # Utilities
│   ├── task-parser.ts     # YAML frontmatter parsing
│   ├── circuit-breaker.ts
│   └── exit-codes.ts
└── test-utils/            # Mock implementations
```

**Workspace Structure:**
```
.ralph-dev/
├── state.json           # Current phase and task
├── tasks/
│   ├── index.json       # Task index
│   └── {module}/{id}.md # Task files
└── saga.log             # Saga audit trail
```

## Task File Format

```markdown
---
id: auth.login
module: auth
priority: 2
status: pending
estimatedMinutes: 25
dependencies:
  - setup.scaffold
---

# Task Description

## Acceptance Criteria
1. Criterion 1
```

## Architecture Rules

| Layer | DO | DON'T |
|-------|-----|-------|
| Commands | Parse args, call services, format output | Put business logic, access file system |
| Services | Business logic, coordinate repos | Create own dependencies |
| Repositories | Data persistence, maintain index.json | Expose file paths to services |
| Domain | Behavior methods, enforce invariants | Just be data bags |
| Infrastructure | File I/O, logging, retry logic | Contain business rules |

## Testing Patterns

```typescript
// Service test with mock repository
describe('MyService', () => {
  it('should process entity', async () => {
    const mockRepo = {
      findById: vi.fn().mockResolvedValue(new MyEntity('test', 'ready')),
      save: vi.fn(),
    };
    const service = new MyService(mockRepo, new MockLogger());

    const result = await service.process('test');

    expect(result.status).toBe('done');
  });
});
```

**Key practices:**
- Use `beforeEach`/`afterEach` for test isolation
- Mock `console.log`, `process.exit` in CLI tests
- Use unique temp directories per test file
- Test behavior, not implementation

## Exit Codes

| Code | Meaning |
|------|---------|
| 0 | Success |
| 1 | General error |
| 2 | Not found |
| 3 | Invalid input |
| 4 | Conflict |
| 5 | System error |

## Environment Variables

| Variable | Purpose |
|----------|---------|
| `RALPH_DEV_WORKSPACE` | Override workspace directory |
| `CI` | Set to `true` for CI/test mode |
