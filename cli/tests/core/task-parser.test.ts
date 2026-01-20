import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TaskParser } from '../../src/core/task-parser';
import * as fs from 'fs-extra';
import * as path from 'path';

describe('TaskParser', () => {
  const testDir = path.join(__dirname, '../../test-fixtures-task-parser');
  const validTaskFile = path.join(testDir, 'valid-task.md');
  const invalidTaskFile = path.join(testDir, 'invalid-task.md');
  const indexFile = path.join(testDir, 'index.json');

  beforeEach(() => {
    fs.ensureDirSync(testDir);
  });

  afterEach(() => {
    fs.removeSync(testDir);
  });

  describe('parseTaskFile', () => {
    it('should parse a valid task file with all fields', () => {
      const taskContent = `---
id: auth.login.api
module: auth
priority: 1
status: pending
estimatedMinutes: 30
dependencies:
  - setup.database
testRequirements:
  unit:
    required: true
    pattern: "**/*.test.ts"
  e2e:
    required: false
    pattern: "**/*.e2e.ts"
---

# Implement Login API Endpoint

## Acceptance Criteria

1. POST /api/login endpoint accepts email and password
2. Returns JWT token on successful authentication
3. Returns 401 on invalid credentials
4. Rate limiting implemented (5 attempts per minute)

## Notes

Use bcrypt for password hashing. JWT should expire in 24 hours.
`;

      fs.writeFileSync(validTaskFile, taskContent);

      const task = TaskParser.parseTaskFile(validTaskFile);

      expect(task.id).toBe('auth.login.api');
      expect(task.module).toBe('auth');
      expect(task.priority).toBe(1);
      expect(task.status).toBe('pending');
      expect(task.estimatedMinutes).toBe(30);
      expect(task.dependencies).toEqual(['setup.database']);
      expect(task.testRequirements).toEqual({
        unit: {
          required: true,
          pattern: '**/*.test.ts',
        },
        e2e: {
          required: false,
          pattern: '**/*.e2e.ts',
        },
      });
      expect(task.description).toBe('Implement Login API Endpoint');
      expect(task.acceptanceCriteria).toHaveLength(4);
      expect(task.acceptanceCriteria[0]).toBe('POST /api/login endpoint accepts email and password');
      expect(task.notes).toContain('Use bcrypt');
    });

    it('should parse a minimal task file', () => {
      const taskContent = `---
id: simple.task
module: simple
priority: 5
status: pending
---

# Simple Task

## Acceptance Criteria

1. Task is completed
`;

      fs.writeFileSync(validTaskFile, taskContent);

      const task = TaskParser.parseTaskFile(validTaskFile);

      expect(task.id).toBe('simple.task');
      expect(task.module).toBe('simple');
      expect(task.priority).toBe(5);
      expect(task.status).toBe('pending');
      expect(task.description).toBe('Simple Task');
      expect(task.acceptanceCriteria).toEqual(['Task is completed']);
      expect(task.estimatedMinutes).toBeUndefined();
      expect(task.dependencies).toBeUndefined();
      expect(task.notes).toBeUndefined();
    });

    it('should throw error for invalid format (missing frontmatter)', () => {
      const taskContent = `# Task without frontmatter

## Acceptance Criteria

1. This should fail
`;

      fs.writeFileSync(invalidTaskFile, taskContent);

      expect(() => TaskParser.parseTaskFile(invalidTaskFile)).toThrow('Invalid task file format');
    });

    it('should handle task with no acceptance criteria', () => {
      const taskContent = `---
id: no.criteria
module: test
priority: 1
status: pending
---

# Task Without Criteria
`;

      fs.writeFileSync(validTaskFile, taskContent);

      const task = TaskParser.parseTaskFile(validTaskFile);

      expect(task.acceptanceCriteria).toEqual([]);
    });
  });

  describe('parseIndex', () => {
    it('should parse existing index.json file', () => {
      const indexContent = {
        version: '1.0.0',
        updatedAt: '2024-01-18T10:00:00Z',
        metadata: {
          projectGoal: 'Build authentication system',
          languageConfig: {
            language: 'typescript',
            framework: 'express',
          },
        },
        tasks: {
          'auth.login': {
            status: 'completed',
            priority: 1,
            module: 'auth',
            description: 'Login endpoint',
            filePath: 'auth/login.md',
          },
          'auth.logout': {
            status: 'pending',
            priority: 2,
            module: 'auth',
            description: 'Logout endpoint',
          },
        },
      };

      fs.writeJSONSync(indexFile, indexContent);

      const index = TaskParser.parseIndex(indexFile);

      expect(index.version).toBe('1.0.0');
      expect(index.metadata.projectGoal).toBe('Build authentication system');
      expect(index.metadata.languageConfig.language).toBe('typescript');
      expect(index.tasks['auth.login'].status).toBe('completed');
      expect(index.tasks['auth.logout'].status).toBe('pending');
    });

    it('should return default structure for non-existent file', () => {
      const nonExistentPath = path.join(testDir, 'non-existent.json');

      const index = TaskParser.parseIndex(nonExistentPath);

      expect(index.version).toBe('1.0.0');
      expect(index.metadata.projectGoal).toBe('');
      expect(index.tasks).toEqual({});
      expect(index.updatedAt).toBeDefined();
    });

    it('should handle empty tasks object', () => {
      const indexContent = {
        version: '1.0.0',
        updatedAt: '2024-01-18T10:00:00Z',
        metadata: {
          projectGoal: 'Empty project',
        },
        tasks: {},
      };

      fs.writeJSONSync(indexFile, indexContent);

      const index = TaskParser.parseIndex(indexFile);

      expect(index.tasks).toEqual({});
    });
  });
});
