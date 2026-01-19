# Foreman CLI

**Version:** 2.1.0
**Language:** TypeScript
**Purpose:** Efficient operations for Foreman skills

A high-performance TypeScript-based command-line tool for Foreman skills.

---

## Overview

The Foreman CLI is a TypeScript-based command-line tool that provides fast, reliable operations for:

- Task management (CRUD)
- State management
- PRD parsing and generation
- Language detection
- Verification execution

---

## Installation

```bash
# Install dependencies
cd ralph-dev/cli
npm install

# Build
npm run build

# Link globally (optional)
npm link

# Or use directly
npx ralph-dev <command>
```

---

## Architecture

```
cli/
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts              # CLI entry point
│   ├── commands/             # Command implementations
│   │   ├── state.ts
│   │   ├── tasks.ts
│   │   ├── prd.ts
│   │   ├── verify.ts
│   │   ├── breakdown.ts
│   │   └── detect.ts
│   ├── core/                 # Core utilities
│   │   ├── task-parser.ts    # Parse markdown tasks
│   │   ├── task-writer.ts    # Write markdown tasks
│   │   ├── index-manager.ts  # Manage index.json
│   │   └── file-utils.ts
│   ├── language/             # Language-specific logic
│   │   ├── detector.ts
│   │   ├── typescript.ts
│   │   ├── python.ts
│   │   ├── go.ts
│   │   └── rust.ts
│   └── templates/            # Code templates
│       ├── typescript/
│       ├── python/
│       ├── go/
│       └── rust/
└── bin/
    └── ralph-dev.js
```

---

## Commands Reference

### State Management

```bash
# Get state value
ralph-dev state get <key>
ralph-dev state get phase
# Output: "implement"

# Set state value
ralph-dev state set <key> <value>
ralph-dev state set phase deliver

# Update multiple values (JSON)
ralph-dev state update '<json>'
ralph-dev state update '{"autoFixes": 3}'

# Show full state
ralph-dev state show
ralph-dev state show --json

# Initialize state
ralph-dev state init "<requirement>"
```

### Task Management

```bash
# List tasks
ralph-dev tasks list
ralph-dev tasks list --status pending
ralph-dev tasks list --module auth
ralph-dev tasks list --json

# Get next task
ralph-dev tasks next
ralph-dev tasks next --json

# Get specific task
ralph-dev tasks get <task-id>
ralph-dev tasks get auth.login.ui
ralph-dev tasks get auth.login.ui --json

# Create task
ralph-dev tasks create \
  --id <id> \
  --module <module> \
  --title "<title>" \
  --priority <number> \
  --criteria "<criterion>" \
  --estimated <minutes>

# Mark complete
ralph-dev tasks done <task-id> \
  --duration "<duration>" \
  --files "<comma-separated>"

# Mark failed
ralph-dev tasks fail <task-id> \
  --reason "<reason>"

# Update task
ralph-dev tasks update <task-id> \
  --status <status> \
  --priority <number>

# Show progress
ralph-dev tasks progress
```

### PRD Operations

```bash
# Parse PRD
ralph-dev prd parse <file>
ralph-dev prd parse .ralph-dev/prd.md
ralph-dev prd parse .ralph-dev/prd.md --json

# Generate tasks from PRD
ralph-dev prd generate-tasks <file>
ralph-dev prd generate-tasks .ralph-dev/prd.md --output .ralph-dev/tasks/

# Validate PRD
ralph-dev prd validate <file>
```

### Language Detection

```bash
# Detect language
ralph-dev detect language
ralph-dev detect language --json

# Detect framework
ralph-dev detect framework

# Detect test framework
ralph-dev detect test-framework

# Get verification commands
ralph-dev detect verify-commands
ralph-dev detect verify-commands --json
```

### Verification

```bash
# Run verification
ralph-dev verify
ralph-dev verify --language typescript
ralph-dev verify --language python

# Custom commands
ralph-dev verify --command "npm test" --command "npm run build"

# Parse test output
ralph-dev verify parse-test-output <file>
```

### Breakdown

```bash
# Decompose user story
ralph-dev breakdown story \
  --text "<story>" \
  --language <lang> \
  --tech-stack "<stack>"

# Validate task size
ralph-dev breakdown validate-size <task-file>

# Split oversized task
ralph-dev breakdown split <task-file>

# Validate all tasks
ralph-dev breakdown validate-all <tasks-dir>
```

---

## Implementation Examples

### 1. Task Parser

```typescript
// cli/src/core/task-parser.ts

import * as fs from 'fs';
import * as path from 'path';
import yaml from 'yaml';

interface Task {
  id: string;
  module: string;
  priority: number;
  status: 'pending' | 'passing' | 'failing' | 'blocked';
  estimatedMinutes?: number;
  dependencies?: string[];
  testRequirements?: {
    unit?: {
      required: boolean;
      pattern: string;
    };
  };
  title: string;
  description: string;
  acceptanceCriteria: string[];
  notes?: string;
}

export class TaskParser {
  /**
   * Parse task from markdown file with YAML frontmatter.
   */
  static parseTaskFile(filePath: string): Task {
    const content = fs.readFileSync(filePath, 'utf-8');

    // Extract frontmatter
    const frontmatterMatch = content.match(/^---\n([\s\S]+?)\n---/);
    if (!frontmatterMatch) {
      throw new Error(`No frontmatter found in ${filePath}`);
    }

    const frontmatter = yaml.parse(frontmatterMatch[1]);
    const markdown = content.slice(frontmatterMatch[0].length).trim();

    // Parse markdown sections
    const sections = this.parseMarkdownSections(markdown);

    return {
      ...frontmatter,
      title: sections.title,
      description: sections.description,
      acceptanceCriteria: sections.acceptanceCriteria,
      notes: sections.notes
    };
  }

  private static parseMarkdownSections(markdown: string) {
    const lines = markdown.split('\n');
    const sections: any = {};

    let currentSection = '';
    let buffer: string[] = [];

    for (const line of lines) {
      if (line.startsWith('# ')) {
        // H1 = title
        sections.title = line.slice(2).trim();
      } else if (line.startsWith('## ')) {
        // H2 = new section
        if (currentSection && buffer.length > 0) {
          sections[currentSection] = buffer.join('\n').trim();
          buffer = [];
        }
        currentSection = line.slice(3).trim().toLowerCase().replace(/\s+/g, '_');
      } else {
        buffer.push(line);
      }
    }

    // Flush last section
    if (currentSection && buffer.length > 0) {
      sections[currentSection] = buffer.join('\n').trim();
    }

    // Parse acceptance criteria (numbered list)
    if (sections.acceptance_criteria) {
      const criteria = sections.acceptance_criteria
        .split('\n')
        .filter((line: string) => /^\d+\./.test(line.trim()))
        .map((line: string) => line.replace(/^\d+\.\s*/, '').trim());

      sections.acceptanceCriteria = criteria;
    }

    return sections;
  }

  /**
   * Get all tasks from directory.
   */
  static getAllTasks(tasksDir: string): Task[] {
    const indexPath = path.join(tasksDir, 'index.json');
    if (!fs.existsSync(indexPath)) {
      return [];
    }

    const index = JSON.parse(fs.readFileSync(indexPath, 'utf-8'));
    const tasks: Task[] = [];

    for (const [taskId, meta] of Object.entries(index.features || {})) {
      const filePath = this.getTaskFilePath(tasksDir, taskId, meta as any);
      if (fs.existsSync(filePath)) {
        tasks.push(this.parseTaskFile(filePath));
      }
    }

    return tasks;
  }

  private static getTaskFilePath(
    tasksDir: string,
    taskId: string,
    meta: { module: string; filePath?: string }
  ): string {
    if (meta.filePath) {
      return path.join(tasksDir, meta.filePath);
    }

    // Default: {module}/{action}.md
    const parts = taskId.split('.');
    const module = meta.module;
    const action = parts.slice(1).join('.');

    return path.join(tasksDir, module, `${action}.md`);
  }
}
```

### 2. Task Writer

```typescript
// cli/src/core/task-writer.ts

import * as fs from 'fs';
import * as path from 'path';
import yaml from 'yaml';

export class TaskWriter {
  /**
   * Create task file with YAML frontmatter.
   */
  static createTask(tasksDir: string, task: Task): void {
    const { id, module } = task;

    // Create module directory
    const moduleDir = path.join(tasksDir, module);
    if (!fs.existsSync(moduleDir)) {
      fs.mkdirSync(moduleDir, { recursive: true });
    }

    // Create task file
    const action = id.split('.').slice(1).join('.');
    const filePath = path.join(moduleDir, `${action}.md`);

    const frontmatter = {
      id: task.id,
      module: task.module,
      priority: task.priority,
      status: task.status,
      estimatedMinutes: task.estimatedMinutes,
      dependencies: task.dependencies,
      testRequirements: task.testRequirements
    };

    const content = this.formatTaskMarkdown(frontmatter, task);

    fs.writeFileSync(filePath, content, 'utf-8');

    // Update index
    this.updateIndex(tasksDir, task);
  }

  private static formatTaskMarkdown(frontmatter: any, task: Task): string {
    const yamlStr = yaml.stringify(frontmatter);

    let md = `---\n${yamlStr}---\n\n`;
    md += `# ${task.title}\n\n`;

    if (task.description) {
      md += `## Description\n${task.description}\n\n`;
    }

    if (task.acceptanceCriteria && task.acceptanceCriteria.length > 0) {
      md += `## Acceptance Criteria\n`;
      task.acceptanceCriteria.forEach((criterion, i) => {
        md += `${i + 1}. ${criterion}\n`;
      });
      md += '\n';
    }

    if (task.notes) {
      md += `## Notes\n${task.notes}\n`;
    }

    return md;
  }

  private static updateIndex(tasksDir: string, task: Task): void {
    const indexPath = path.join(tasksDir, 'index.json');

    let index: any;
    if (fs.existsSync(indexPath)) {
      index = JSON.parse(fs.readFileSync(indexPath, 'utf-8'));
    } else {
      index = {
        version: '2.0.0',
        updatedAt: new Date().toISOString(),
        features: {}
      };
    }

    index.features[task.id] = {
      status: task.status,
      priority: task.priority,
      module: task.module
    };

    index.updatedAt = new Date().toISOString();

    fs.writeFileSync(indexPath, JSON.stringify(index, null, 2), 'utf-8');
  }

  /**
   * Update task status.
   */
  static updateTaskStatus(
    tasksDir: string,
    taskId: string,
    status: string,
    metadata?: any
  ): void {
    const task = TaskParser.getTask(tasksDir, taskId);

    // Update frontmatter
    const filePath = TaskParser.getTaskFilePath(tasksDir, taskId, task);
    const content = fs.readFileSync(filePath, 'utf-8');

    const frontmatterMatch = content.match(/^---\n([\s\S]+?)\n---/);
    const frontmatter = yaml.parse(frontmatterMatch![1]);

    frontmatter.status = status;
    if (metadata) {
      Object.assign(frontmatter, metadata);
    }

    const markdown = content.slice(frontmatterMatch![0].length);
    const newContent = `---\n${yaml.stringify(frontmatter)}---${markdown}`;

    fs.writeFileSync(filePath, newContent, 'utf-8');

    // Update index
    this.updateIndex(tasksDir, { ...task, status });
  }
}
```

### 3. Language Detector

```typescript
// cli/src/language/detector.ts

import * as fs from 'fs';
import * as path from 'path';

export interface LanguageConfig {
  language: string;
  framework?: string;
  testFramework?: string;
  buildTool?: string;
  verifyCommands: string[];
}

export class LanguageDetector {
  static detect(projectPath: string = '.'): LanguageConfig {
    // TypeScript/JavaScript
    if (this.fileExists(projectPath, 'package.json')) {
      return this.detectTypeScript(projectPath);
    }

    // Python
    if (
      this.fileExists(projectPath, 'requirements.txt') ||
      this.fileExists(projectPath, 'pyproject.toml')
    ) {
      return this.detectPython(projectPath);
    }

    // Go
    if (this.fileExists(projectPath, 'go.mod')) {
      return this.detectGo(projectPath);
    }

    // Rust
    if (this.fileExists(projectPath, 'Cargo.toml')) {
      return this.detectRust(projectPath);
    }

    // Java/Kotlin
    if (
      this.fileExists(projectPath, 'pom.xml') ||
      this.fileExists(projectPath, 'build.gradle')
    ) {
      return this.detectJava(projectPath);
    }

    return {
      language: 'unknown',
      verifyCommands: []
    };
  }

  private static detectTypeScript(projectPath: string): LanguageConfig {
    const packageJson = this.readJSON(projectPath, 'package.json');
    const hasTSConfig = this.fileExists(projectPath, 'tsconfig.json');

    const framework = this.detectJSFramework(packageJson);
    const testFramework = this.detectTestFramework(packageJson);
    const buildTool = this.detectBuildTool(projectPath);

    const commands: string[] = [];

    if (hasTSConfig) {
      commands.push('npx tsc --noEmit');
    }

    if (packageJson.scripts?.lint) {
      commands.push('npm run lint');
    }

    if (testFramework) {
      commands.push(this.getTestCommand(testFramework));
    }

    if (packageJson.scripts?.build) {
      commands.push('npm run build');
    }

    return {
      language: hasTSConfig ? 'typescript' : 'javascript',
      framework,
      testFramework,
      buildTool,
      verifyCommands: commands
    };
  }

  private static detectPython(projectPath: string): LanguageConfig {
    const framework = this.detectPythonFramework(projectPath);
    const testFramework = this.detectPythonTestFramework(projectPath);

    return {
      language: 'python',
      framework,
      testFramework,
      verifyCommands: [
        'mypy .',
        'pylint **/*.py',
        testFramework === 'pytest' ? 'pytest' : 'python -m unittest'
      ]
    };
  }

  private static detectGo(projectPath: string): LanguageConfig {
    return {
      language: 'go',
      verifyCommands: ['go vet ./...', 'golint ./...', 'go test ./...', 'go build']
    };
  }

  private static detectRust(projectPath: string): LanguageConfig {
    return {
      language: 'rust',
      verifyCommands: ['cargo clippy', 'cargo test', 'cargo build']
    };
  }

  private static detectJava(projectPath: string): LanguageConfig {
    const isMaven = this.fileExists(projectPath, 'pom.xml');
    const isGradle = this.fileExists(projectPath, 'build.gradle');

    return {
      language: 'java',
      buildTool: isMaven ? 'maven' : isGradle ? 'gradle' : 'unknown',
      verifyCommands: isMaven
        ? ['mvn verify', 'mvn test', 'mvn package']
        : ['./gradlew check', './gradlew test', './gradlew build']
    };
  }

  private static detectJSFramework(packageJson: any): string | undefined {
    const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };

    if (deps.react) return 'react';
    if (deps.vue) return 'vue';
    if (deps['@angular/core']) return 'angular';
    if (deps.svelte) return 'svelte';
    if (deps.next) return 'next';
    if (deps.nuxt) return 'nuxt';

    return undefined;
  }

  private static detectTestFramework(packageJson: any): string | undefined {
    const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };

    if (deps.vitest) return 'vitest';
    if (deps.jest) return 'jest';
    if (deps.mocha) return 'mocha';
    if (deps.ava) return 'ava';

    return undefined;
  }

  private static detectBuildTool(projectPath: string): string | undefined {
    if (this.fileExists(projectPath, 'vite.config.ts')) return 'vite';
    if (this.fileExists(projectPath, 'webpack.config.js')) return 'webpack';
    if (this.fileExists(projectPath, 'rollup.config.js')) return 'rollup';

    return undefined;
  }

  private static detectPythonFramework(projectPath: string): string | undefined {
    // Check for framework-specific files
    if (this.fileExists(projectPath, 'manage.py')) return 'django';
    if (this.fileExists(projectPath, 'app.py') || this.fileExists(projectPath, 'wsgi.py'))
      return 'flask';

    // Check requirements.txt
    if (this.fileExists(projectPath, 'requirements.txt')) {
      const requirements = fs.readFileSync(
        path.join(projectPath, 'requirements.txt'),
        'utf-8'
      );
      if (requirements.includes('fastapi')) return 'fastapi';
      if (requirements.includes('django')) return 'django';
      if (requirements.includes('flask')) return 'flask';
    }

    return undefined;
  }

  private static detectPythonTestFramework(projectPath: string): string {
    if (this.fileExists(projectPath, 'pytest.ini')) return 'pytest';
    if (this.fileExists(projectPath, 'setup.cfg')) {
      const setup = fs.readFileSync(path.join(projectPath, 'setup.cfg'), 'utf-8');
      if (setup.includes('[tool:pytest]')) return 'pytest';
    }
    return 'pytest'; // Default
  }

  private static getTestCommand(framework: string): string {
    const commands: Record<string, string> = {
      vitest: 'npx vitest run',
      jest: 'npm test',
      mocha: 'npm test',
      ava: 'npm test'
    };
    return commands[framework] || 'npm test';
  }

  private static fileExists(projectPath: string, filename: string): boolean {
    return fs.existsSync(path.join(projectPath, filename));
  }

  private static readJSON(projectPath: string, filename: string): any {
    const filePath = path.join(projectPath, filename);
    if (!fs.existsSync(filePath)) return {};
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  }
}
```

### 4. CLI Entry Point

```typescript
// cli/src/index.ts

import { Command } from 'commander';
import { StateCommands } from './commands/state';
import { TaskCommands } from './commands/tasks';
import { PRDCommands } from './commands/prd';
import { DetectCommands } from './commands/detect';
import { VerifyCommands } from './commands/verify';
import { BreakdownCommands } from './commands/breakdown';

const program = new Command();

program
  .name('ralph-dev')
  .description('Foreman CLI - Efficient operations for AI agents')
  .version('2.1.0');

// State management
const state = program.command('state').description('Manage ralph-dev state');
StateCommands.register(state);

// Task management
const tasks = program.command('tasks').description('Manage tasks');
TaskCommands.register(tasks);

// PRD operations
const prd = program.command('prd').description('PRD operations');
PRDCommands.register(prd);

// Language detection
const detect = program.command('detect').description('Detect project configuration');
DetectCommands.register(detect);

// Verification
const verify = program.command('verify').description('Run verification');
VerifyCommands.register(verify);

// Breakdown
const breakdown = program.command('breakdown').description('Task breakdown operations');
BreakdownCommands.register(breakdown);

program.parse();
```

---

## Usage in Skills

### Example: Phase 3 Implementation Skill

```markdown
# skills/phase-3-implement/SKILL.md

## Implementation Loop

```bash
# Use CLI for efficient task iteration

while true; do
  # Get next task (CLI is much faster than parsing files)
  TASK_JSON=$(ralph-dev tasks next --json)

  if [ "$TASK_JSON" = "null" ]; then
    echo "✅ All tasks complete"
    break
  fi

  TASK_ID=$(echo $TASK_JSON | jq -r '.id')
  TASK_TITLE=$(echo $TASK_JSON | jq -r '.title')

  echo "⏳ Starting task: $TASK_ID - $TASK_TITLE"

  # Spawn implementer agent (skill uses fresh context)
  result=$(invoke_implementer_agent "$TASK_ID")

  # Update task using CLI (much faster than file editing)
  if [ "$result_status" = "success" ]; then
    ralph-dev tasks done "$TASK_ID" \
      --duration "$result_duration" \
      --files "$result_files"
    echo "✅ Task complete"
  else
    ralph-dev tasks fail "$TASK_ID" \
      --reason "$result_error"
    echo "❌ Task failed"
  fi

  # Show progress (CLI formats it nicely)
  ralph-dev tasks progress
done
```
```

---

## Testing

```bash
# Run tests
npm test

# Watch mode
npm test -- --watch

# Coverage
npm test -- --coverage
```

---

## Next Steps

1. ✅ Implement core commands (state, tasks)
2. ✅ Add language detection
3. ✅ Add PRD parsing
4. ✅ Add verification logic
5. ✅ Write tests
6. ✅ Update skills to use CLI
7. ✅ Document all commands

---

**The CLI provides the efficient foundation for Foreman skills!**
