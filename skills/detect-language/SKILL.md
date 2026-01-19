---
name: detect-language
description: Autonomous language and framework detection for any programming language. Use when user asks to "detect language", "what language is this project", or when initializing ralph-dev for a new project.
allowed-tools: [Read, Glob, Bash, Task]
user-invocable: true
---

# Language Detection Skill

## Overview

Autonomously detect the programming language, framework, build tools, and verification commands for ANY project.

自主检测任何项目的编程语言、框架、构建工具和验证命令。

## When to Use

- User asks: "What language is this project?"
- User asks: "Detect my project configuration"
- Initializing ralph-dev for a new project
- User runs: `/detect-language`

## Execution

### Step 0: Initialize CLI (Automatic)

**IMPORTANT:** This skill requires the Foreman CLI. It will build automatically on first use.

> **重要：**此技能需要 Foreman CLI。首次使用时将自动构建。

```bash
# Bootstrap CLI - runs automatically, builds if needed
source ${CLAUDE_PLUGIN_ROOT}/shared/bootstrap-cli.sh

# Verify CLI is ready
echo "✓ CLI initialized"
echo ""
```

### Step 1: Delegate to Language Detector

Delegate to the `language-detector` agent:

```
Use Task tool with:
  subagent_type: "general-purpose"
  description: "Detect project language"
  prompt: "You are the language-detector agent.

Your mission: Detect the programming language, framework, and build tools for this project.

PROJECT ROOT: $PWD

Follow these steps:

### Step 1: Scan Project Structure

Run these commands to gather evidence:

```bash
# List root directory files
ls -la

# Find config files (depth 2)
find . -maxdepth 2 -type f \( -name 'package.json' -o -name '*.toml' -o -name '*.gradle' -o -name 'pom.xml' -o -name 'Gemfile' -o -name 'composer.json' -o -name 'go.mod' -o -name '*.csproj' -o -name '*.sln' -o -name 'CMakeLists.txt' -o -name 'Makefile' -o -name 'Package.swift' -o -name 'build.sbt' \) 2>/dev/null

# Count source files by extension
for ext in ts js tsx jsx py go rs java rb php cs cpp c swift kt kts scala; do
  count=\$(find . -name \"*.\$ext\" -type f 2>/dev/null | wc -l
  if [ \$count -gt 0 ]; then
    echo \"\$ext: \$count files\"
  fi
done
```

### Step 2: Analyze Key Config Files

Based on what you found, read the most important config file(s):

- If `package.json` exists → Read it to detect framework and tools
- If `pyproject.toml` or `requirements.txt` exists → Read for Python framework
- If `go.mod` exists → Read for Go modules
- If `Cargo.toml` exists → Read for Rust crates
- If `pom.xml` or `build.gradle` exists → Read for Java dependencies
- If `Gemfile` exists → Read for Ruby gems
- If `composer.json` exists → Read for PHP packages
- And so on...

### Step 3: Determine Language and Tools

Based on evidence, determine:

1. **Primary language** (the one with most source files + config presence)
2. **Framework** (from dependencies in config)
3. **Build tool** (from config file type: vite, webpack, cargo, gradle, etc.)
4. **Package manager** (from lock files: pnpm-lock.yaml, yarn.lock, Gemfile.lock, etc.)
5. **Test framework** (from dependencies and test directory)

### Step 4: Suggest Verification Commands

For the detected language, suggest appropriate verification commands:

**TypeScript/JavaScript:**
- Type check: `npx tsc --noEmit` (if tsconfig.json exists)
- Lint: `npm run lint` (if eslint configured)
- Test: `npm test` or `npx vitest run`
- Build: `npm run build`

**Python:**
- Type check: `mypy .` (if mypy configured)
- Lint: `flake8` or `pylint src/`
- Test: `pytest` or `python -m unittest discover`

**Go:**
- Format: `go fmt ./...`
- Lint: `go vet ./...`
- Test: `go test ./...`
- Build: `go build ./...`

**Rust:**
- Format: `cargo fmt -- --check`
- Lint: `cargo clippy -- -D warnings`
- Test: `cargo test`
- Build: `cargo build`

**Java (Maven):**
- Test: `mvn test`
- Build: `mvn package`

**Java (Gradle):**
- Test: `./gradlew test`
- Build: `./gradlew build`

**Ruby:**
- Lint: `rubocop`
- Test: `rspec` or `bundle exec rake test`

**PHP:**
- Lint: `./vendor/bin/phpcs`
- Test: `./vendor/bin/phpunit`

**C#:**
- Format: `dotnet format --verify-no-changes`
- Test: `dotnet test`
- Build: `dotnet build`

**And so on for other languages...**

### Step 5: Return Structured Result

Output a JSON object with this exact format:

```json
{
  \"language\": \"<detected-language>\",
  \"confidence\": 0.95,
  \"evidence\": [
    \"<evidence-item-1>\",
    \"<evidence-item-2>\"
  ],
  \"framework\": \"<detected-framework or null>\",
  \"frameworkVersion\": \"<version or null>\",
  \"buildTool\": \"<detected-build-tool or null>\",
  \"packageManager\": \"<detected-package-manager or null>\",
  \"testFramework\": \"<detected-test-framework or null>\",
  \"verifyCommands\": [
    \"<command-1>\",
    \"<command-2>\"
  ],
  \"additionalInfo\": {
    \"hasTypeChecking\": true/false,
    \"hasLinting\": true/false,
    \"hasTesting\": true/false,
    \"hasBuild\": true/false,
    \"monorepo\": true/false
  }
}
```

IMPORTANT: Output ONLY the JSON, no additional text before or after.
"
```

## Post-Processing

After the agent returns the JSON result:

1. **Parse the JSON** output from the agent
2. **Save to index**:
   ```bash
   # Extract JSON from agent output
   RESULT='<json-output-from-agent>'

   # Save using CLI
   ralph-dev detect-ai-save "$RESULT"
   ```
3. **Display to user**:
   ```markdown
   ✅ Language Detection Complete

   Language: TypeScript
   Framework: React 18.2.0
   Build Tool: Vite
   Confidence: 95%

   Verification Commands:
   1. npx tsc --noEmit
   2. npm run lint
   3. npm test
   4. npm run build
   ```

## Example Invocation

```markdown
User: /detect-language