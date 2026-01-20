import { describe, it, expect } from 'vitest';
import { StructuredOutputParser, validateImplementationResult } from '../../src/core/structured-output';

describe('StructuredOutputParser', () => {
  describe('parseImplementationResult - Tool Calling Format', () => {
    it('should parse valid tool call with all fields', () => {
      const output = `
Task completed successfully!

<tool_call>
<name>report_implementation_result</name>
<input>{"task_id":"auth.signup.ui","status":"success","verification_passed":true,"tests_passing":"15/15","coverage":92,"files_modified":["src/auth/signup.ts","tests/auth/signup.test.ts"],"duration":"4m32s","acceptance_criteria_met":"3/3","confidence_score":0.95,"low_confidence_decisions":[],"notes":"Implemented signup form with validation"}</input>
</tool_call>

All done!`;

      const result = StructuredOutputParser.parseImplementationResult(output);

      expect(result.task_id).toBe('auth.signup.ui');
      expect(result.status).toBe('success');
      expect(result.verification_passed).toBe(true);
      expect(result.tests_passing).toBe('15/15');
      expect(result.coverage).toBe(92);
      expect(result.files_modified).toEqual(['src/auth/signup.ts', 'tests/auth/signup.test.ts']);
      expect(result.confidence_score).toBe(0.95);
      expect(result.notes).toBe('Implemented signup form with validation');
    });

    it('should parse tool call without optional fields', () => {
      const output = `
<tool_call>
<name>report_implementation_result</name>
<input>{"task_id":"test.task","status":"success","verification_passed":true,"tests_passing":"5/5","coverage":80,"files_modified":["test.ts"],"duration":"1m","acceptance_criteria_met":"1/1","notes":"Done"}</input>
</tool_call>`;

      const result = StructuredOutputParser.parseImplementationResult(output);

      expect(result.task_id).toBe('test.task');
      expect(result.status).toBe('success');
      expect(result.confidence_score).toBeUndefined();
      expect(result.low_confidence_decisions).toBeUndefined();
    });

    it('should parse failed task result', () => {
      const output = `
<tool_call>
<name>report_implementation_result</name>
<input>{"task_id":"auth.login","status":"failed","verification_passed":false,"tests_passing":"0/5","coverage":0,"files_modified":[],"duration":"10m","acceptance_criteria_met":"0/3","notes":"Dependency missing"}</input>
</tool_call>`;

      const result = StructuredOutputParser.parseImplementationResult(output);

      expect(result.status).toBe('failed');
      expect(result.verification_passed).toBe(false);
      expect(result.notes).toBe('Dependency missing');
    });
  });

  describe('parseImplementationResult - JSON Block Format', () => {
    it('should parse JSON block format', () => {
      const output = `
Here's the result:

\`\`\`json
{
  "task_id": "auth.login.ui",
  "status": "success",
  "verification_passed": true,
  "tests_passing": "10/10",
  "coverage": 88,
  "files_modified": ["src/login.ts"],
  "duration": "3m",
  "acceptance_criteria_met": "2/2",
  "notes": "Login implemented"
}
\`\`\`

Done!`;

      const result = StructuredOutputParser.parseImplementationResult(output);

      expect(result.task_id).toBe('auth.login.ui');
      expect(result.status).toBe('success');
      expect(result.coverage).toBe(88);
    });
  });

  describe('parseImplementationResult - Legacy YAML Format', () => {
    it('should parse legacy YAML format with comma-separated arrays', () => {
      const output = `
Task complete!

---IMPLEMENTATION RESULT---
task_id: auth.login.ui
status: success
verification_passed: true
tests_passing: 12/12
coverage: 88
files_modified: src/auth/login.ts, tests/auth/login.test.ts
duration: 3m15s
acceptance_criteria_met: 2/2
notes: Login form implemented
---END IMPLEMENTATION RESULT---

All done!`;

      const result = StructuredOutputParser.parseImplementationResult(output);

      expect(result.task_id).toBe('auth.login.ui');
      expect(result.status).toBe('success');
      expect(result.verification_passed).toBe(true);
      expect(result.coverage).toBe(88);
      expect(result.files_modified).toEqual([
        'src/auth/login.ts',
        'tests/auth/login.test.ts',
      ]);
    });

    it('should parse YAML with alternative delimiters', () => {
      const output = `
---IMPLEMENTATION RESULTS---
task_id: test.task
status: success
verification_passed: true
tests_passing: 1/1
coverage: 100
files_modified: test.ts
duration: 1m
acceptance_criteria_met: 1/1
notes: Test
---END IMPLEMENTATION RESULTS---`;

      const result = StructuredOutputParser.parseImplementationResult(output);

      expect(result.task_id).toBe('test.task');
      expect(result.status).toBe('success');
    });

    it('should parse YAML with spaced delimiters', () => {
      const output = `
--- IMPLEMENTATION RESULT ---
task_id: spaced.task
status: success
verification_passed: true
tests_passing: 5/5
coverage: 90
files_modified: file.ts
duration: 2m
acceptance_criteria_met: 1/1
notes: Spaced delimiter test
---END  IMPLEMENTATION RESULT ---`;

      const result = StructuredOutputParser.parseImplementationResult(output);

      expect(result.task_id).toBe('spaced.task');
    });
  });

  describe('parseImplementationResult - Error Cases', () => {
    it('should throw error for output without structured result', () => {
      const output = 'This is just plain text without any structured output';

      expect(() => {
        StructuredOutputParser.parseImplementationResult(output);
      }).toThrow('Agent did not return structured output');
    });

    it('should throw error for invalid schema', () => {
      const output = `
<tool_call>
<name>report_implementation_result</name>
<input>{"task_id":"test","status":"invalid_status"}</input>
</tool_call>`;

      expect(() => {
        StructuredOutputParser.parseImplementationResult(output);
      }).toThrow();
    });

    it('should throw error for missing required fields', () => {
      const output = `
<tool_call>
<name>report_implementation_result</name>
<input>{"task_id":"test"}</input>
</tool_call>`;

      expect(() => {
        StructuredOutputParser.parseImplementationResult(output);
      }).toThrow();
    });
  });

  describe('parseHealingResult', () => {
    it('should parse valid healing result', () => {
      const output = `
<tool_call>
<name>report_healing_result</name>
<input>{"task_id":"auth.login","status":"success","verification_passed":true,"attempts":1,"fix_type":"dependency","hypothesis":"Missing bcrypt dependency","solution_applied":"Installed bcrypt@5.1.0","notes":"Successfully installed missing dependency and all tests pass"}</input>
</tool_call>`;

      const result = StructuredOutputParser.parseHealingResult(output);

      expect(result.task_id).toBe('auth.login');
      expect(result.status).toBe('success');
      expect(result.verification_passed).toBe(true);
      expect(result.attempts).toBe(1);
      expect(result.fix_type).toBe('dependency');
      expect(result.hypothesis).toBe('Missing bcrypt dependency');
      expect(result.solution_applied).toBe('Installed bcrypt@5.1.0');
    });

    it('should parse healing failure', () => {
      const output = `
<tool_call>
<name>report_healing_result</name>
<input>{"task_id":"auth.login","status":"failed","verification_passed":false,"attempts":3,"fix_type":"unknown","hypothesis":"Could not determine root cause","notes":"Failed after 3 attempts"}</input>
</tool_call>`;

      const result = StructuredOutputParser.parseHealingResult(output);

      expect(result.status).toBe('failed');
      expect(result.verification_passed).toBe(false);
      expect(result.attempts).toBe(3);
      expect(result.fix_type).toBe('unknown');
    });
  });

  describe('Edge Cases', () => {
    it('should handle multiline notes in YAML', () => {
      const output = `
---IMPLEMENTATION RESULT---
task_id: test
status: success
verification_passed: true
tests_passing: 1/1
coverage: 100
files_modified: test.ts
duration: 1m
acceptance_criteria_met: 1/1
notes: This is a long note
---END IMPLEMENTATION RESULT---`;

      const result = StructuredOutputParser.parseImplementationResult(output);

      expect(result.notes).toBe('This is a long note');
    });

    it('should handle empty files_modified array', () => {
      const output = `
<tool_call>
<name>report_implementation_result</name>
<input>{"task_id":"test","status":"success","verification_passed":true,"tests_passing":"0/0","coverage":0,"files_modified":[],"duration":"1s","acceptance_criteria_met":"1/1","notes":"No files"}</input>
</tool_call>`;

      const result = StructuredOutputParser.parseImplementationResult(output);

      expect(result.files_modified).toEqual([]);
    });

    it('should handle confidence score edge values', () => {
      const output = `
<tool_call>
<name>report_implementation_result</name>
<input>{"task_id":"test","status":"success","verification_passed":true,"tests_passing":"1/1","coverage":100,"files_modified":["test.ts"],"duration":"1m","acceptance_criteria_met":"1/1","confidence_score":1.0,"low_confidence_decisions":[],"notes":"Perfect confidence"}</input>
</tool_call>`;

      const result = StructuredOutputParser.parseImplementationResult(output);

      expect(result.confidence_score).toBe(1.0);
    });
  });

  describe('YAML format parsing with delimiters', () => {
    it('should parse YAML with boolean string values', () => {
      const output = `
---IMPLEMENTATION RESULT---
task_id: test
status: success
verification_passed: true
tests_passing: 1/1
coverage: 100
files_modified: test.ts
duration: 1m
acceptance_criteria_met: 1/1
notes: Test complete
---END IMPLEMENTATION RESULT---
`;

      const result = StructuredOutputParser.parseImplementationResult(output);

      expect(result.verification_passed).toBe(true);
      expect(result.status).toBe('success');
    });

    it('should parse YAML with false boolean', () => {
      const output = `
---IMPLEMENTATION RESULT---
task_id: test
status: failed
verification_passed: false
tests_passing: 0/1
coverage: 0
files_modified: test.ts
duration: 1m
acceptance_criteria_met: 0/1
notes: Test failed
---END IMPLEMENTATION RESULT---
`;

      const result = StructuredOutputParser.parseImplementationResult(output);

      expect(result.verification_passed).toBe(false);
      expect(result.status).toBe('failed');
    });

    it('should parse YAML with numeric values', () => {
      const output = `
---IMPLEMENTATION RESULT---
task_id: test
status: success
verification_passed: true
coverage: 85
confidence_score: 0.9
tests_passing: 10/10
files_modified: test.ts
duration: 2m
acceptance_criteria_met: 1/1
notes: High coverage achieved
---END IMPLEMENTATION RESULT---
`;

      const result = StructuredOutputParser.parseImplementationResult(output);

      expect(result.coverage).toBe(85);
      expect(result.confidence_score).toBe(0.9);
    });

    it('should parse YAML with JSON array strings', () => {
      const output = `
---IMPLEMENTATION RESULT---
task_id: test
status: success
verification_passed: true
files_modified: ["file1.ts","file2.ts"]
tests_passing: 10/10
coverage: 90
duration: 3m
acceptance_criteria_met: 2/2
notes: Multiple files modified
---END IMPLEMENTATION RESULT---
`;

      const result = StructuredOutputParser.parseImplementationResult(output);

      expect(result.files_modified).toEqual(['file1.ts', 'file2.ts']);
    });

    it('should handle comma-separated arrays for files_modified', () => {
      const output = `
---IMPLEMENTATION RESULT---
task_id: test
status: success
verification_passed: true
files_modified: file1.ts, file2.ts, file3.ts
tests_passing: 15/15
coverage: 95
duration: 4m
acceptance_criteria_met: 3/3
notes: Three files updated
---END IMPLEMENTATION RESULT---
`;

      const result = StructuredOutputParser.parseImplementationResult(output);

      expect(result.files_modified).toEqual(['file1.ts', 'file2.ts', 'file3.ts']);
    });

    it('should preserve slash format for tests_passing', () => {
      const output = `
---IMPLEMENTATION RESULT---
task_id: test
status: success
verification_passed: true
tests_passing: 15/15
acceptance_criteria_met: 3/3
coverage: 100
files_modified: test.ts
duration: 2m
notes: All tests passing
---END IMPLEMENTATION RESULT---
`;

      const result = StructuredOutputParser.parseImplementationResult(output);

      expect(result.tests_passing).toBe('15/15');
      expect(result.acceptance_criteria_met).toBe('3/3');
    });

    it('should handle invalid JSON in array field gracefully', () => {
      const output = `
---IMPLEMENTATION RESULT---
task_id: test
status: success
verification_passed: true
files_modified: [invalid json
tests_passing: 1/1
coverage: 100
duration: 1m
acceptance_criteria_met: 1/1
notes: Invalid JSON handling
---END IMPLEMENTATION RESULT---
`;

      const result = StructuredOutputParser.parseImplementationResult(output);

      // When JSON parsing fails, it treats as comma-separated array
      // Since there's no comma, it returns single-element array
      expect(result.files_modified).toEqual(['[invalid json']);
    });
  });

  describe('validateImplementationResult', () => {
    it('should validate a complete valid result', () => {
      const result = {
        task_id: 'test.task',
        status: 'success' as const,
        verification_passed: true,
        tests_passing: '10/10',
        coverage: 95,
        files_modified: ['test.ts'],
        duration: '5m',
        acceptance_criteria_met: '3/3',
        confidence_score: 0.95,
        low_confidence_decisions: [],
        notes: 'All good',
      };

      const validation = validateImplementationResult(result);

      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should detect missing task_id', () => {
      const result = {
        status: 'success' as const,
        verification_passed: true,
        notes: 'test',
      } as any;

      const validation = validateImplementationResult(result);

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Missing task_id');
    });

    it('should detect missing status', () => {
      const result = {
        task_id: 'test',
        verification_passed: true,
        notes: 'test',
      } as any;

      const validation = validateImplementationResult(result);

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Missing status (must be "success" or "failed")');
    });

    it('should detect missing verification_passed', () => {
      const result = {
        task_id: 'test',
        status: 'success' as const,
        notes: 'test',
      } as any;

      const validation = validateImplementationResult(result);

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Missing verification_passed boolean');
    });

    it('should warn about inconsistent status and verification', () => {
      const result = {
        task_id: 'test',
        status: 'success' as const,
        verification_passed: false,
        notes: 'Inconsistent state',
      };

      const validation = validateImplementationResult(result);

      expect(validation.valid).toBe(true);
      expect(validation.warnings.length).toBeGreaterThan(0);
      expect(validation.warnings[0]).toContain('inconsistent');
    });

    it('should warn about low confidence score', () => {
      const result = {
        task_id: 'test',
        status: 'success' as const,
        verification_passed: true,
        notes: 'Low confidence',
        confidence_score: 0.5,
        low_confidence_decisions: ['Decision 1', 'Decision 2'],
      };

      const validation = validateImplementationResult(result);

      expect(validation.valid).toBe(true);
      expect(validation.warnings.length).toBeGreaterThan(0);
      expect(validation.warnings[0]).toContain('Low confidence score');
    });
  });
});
