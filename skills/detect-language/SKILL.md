---
name: detect-language
description: Autonomous language and framework detection for any programming language. Use when user asks to "detect language", "what language is this project", or when initializing ralph-dev for a new project.
allowed-tools: [Read, Glob, Bash]
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

**IMPORTANT:** This skill requires the Ralph-dev CLI. It will build automatically on first use.

```bash
# Bootstrap CLI - runs automatically, builds if needed
source ${CLAUDE_PLUGIN_ROOT}/shared/bootstrap-cli.sh

# Verify CLI is ready
echo "✓ CLI initialized"
echo ""
```

### Step 1: Scan Project Structure

Discover the project structure and configuration files:

```bash
echo "🔍 Scanning project structure..."
echo ""

# List root directory files
echo "📁 Root directory:"
ls -la
echo ""

# Find config files (depth 2)
echo "📄 Configuration files:"
find . -maxdepth 2 -type f \( \
  -name 'package.json' \
  -o -name '*.toml' \
  -o -name '*.gradle' \
  -o -name 'pom.xml' \
  -o -name 'Gemfile' \
  -o -name 'composer.json' \
  -o -name 'go.mod' \
  -o -name '*.csproj' \
  -o -name '*.sln' \
  -o -name 'CMakeLists.txt' \
  -o -name 'Makefile' \
  -o -name 'Package.swift' \
  -o -name 'build.sbt' \
\) 2>/dev/null
echo ""

# Count source files by extension
echo "📊 Source file counts:"
for ext in ts js tsx jsx py go rs java rb php cs cpp c swift kt kts scala; do
  count=$(find . -name "*.$ext" -type f 2>/dev/null | wc -l | tr -d ' ')
  if [ "$count" -gt 0 ]; then
    echo "  $ext: $count files"
  fi
done
echo ""
```

### Step 2: Analyze Evidence

Based on discovered files, read and analyze the key configuration file:

**TypeScript/JavaScript detection:**
```bash
if [ -f "package.json" ]; then
  echo "📦 Analyzing package.json..."
  cat package.json | jq '{
    name: .name,
    dependencies: .dependencies,
    devDependencies: .devDependencies,
    scripts: .scripts
  }' 2>/dev/null || cat package.json
  echo ""
fi
```

**Python detection:**
```bash
if [ -f "pyproject.toml" ]; then
  echo "🐍 Analyzing pyproject.toml..."
  cat pyproject.toml
  echo ""
elif [ -f "requirements.txt" ]; then
  echo "🐍 Analyzing requirements.txt..."
  cat requirements.txt
  echo ""
fi
```

**Go detection:**
```bash
if [ -f "go.mod" ]; then
  echo "🔵 Analyzing go.mod..."
  cat go.mod
  echo ""
fi
```

**Rust detection:**
```bash
if [ -f "Cargo.toml" ]; then
  echo "🦀 Analyzing Cargo.toml..."
  cat Cargo.toml
  echo ""
fi
```

**Java (Maven) detection:**
```bash
if [ -f "pom.xml" ]; then
  echo "☕ Analyzing pom.xml..."
  cat pom.xml | grep -A 5 "<dependencies>" | head -20
  echo ""
fi
```

**Java (Gradle) detection:**
```bash
if [ -f "build.gradle" ] || [ -f "build.gradle.kts" ]; then
  echo "☕ Analyzing Gradle build file..."
  cat build.gradle* 2>/dev/null | head -30
  echo ""
fi
```

**Ruby detection:**
```bash
if [ -f "Gemfile" ]; then
  echo "💎 Analyzing Gemfile..."
  cat Gemfile
  echo ""
fi
```

**PHP detection:**
```bash
if [ -f "composer.json" ]; then
  echo "🐘 Analyzing composer.json..."
  cat composer.json | jq '{
    name: .name,
    require: .require,
    "require-dev": ."require-dev"
  }' 2>/dev/null || cat composer.json
  echo ""
fi
```

**C# detection:**
```bash
if [ -f "*.csproj" ] 2>/dev/null; then
  echo "🔷 Analyzing C# project..."
  cat *.csproj | head -30
  echo ""
fi
```

**Swift detection:**
```bash
if [ -f "Package.swift" ]; then
  echo "🍎 Analyzing Package.swift..."
  cat Package.swift
  echo ""
fi
```

**Scala detection:**
```bash
if [ -f "build.sbt" ]; then
  echo "🔴 Analyzing build.sbt..."
  cat build.sbt
  echo ""
fi
```

### Step 3: Determine Language, Framework, and Tools

Based on the evidence gathered, determine:

1. **Primary Language** - The language with most source files and clear config presence
2. **Framework** - Detected from dependencies (React, Django, Express, etc.)
3. **Build Tool** - Identified from build config files (Vite, Webpack, Cargo, etc.)
4. **Package Manager** - Found from lock files (pnpm-lock.yaml, yarn.lock, etc.)
5. **Test Framework** - Extracted from dependencies and test directory structure

**Detection Rules:**

**TypeScript/JavaScript:**
- Indicators: `package.json`, `*.ts`/`*.js` files, `node_modules/`
- Framework detection: Check dependencies for `react`, `vue`, `@angular/core`, `next`, `express`
- Package manager: Check for `pnpm-lock.yaml`, `yarn.lock`, `package-lock.json`, `bun.lockb`
- Build tool: Check for `vite.config.*`, `webpack.config.*`, `tsconfig.json`
- Test framework: Check for `jest`, `vitest`, `mocha`, `jasmine` in devDependencies

**Python:**
- Indicators: `pyproject.toml`, `requirements.txt`, `*.py` files
- Framework detection: Check for `django`, `flask`, `fastapi` in dependencies
- Test framework: Check for `pytest`, `unittest` configuration

**Go:**
- Indicators: `go.mod`, `*.go` files
- Standard tooling: `go test`, `go build`

**Rust:**
- Indicators: `Cargo.toml`, `*.rs` files, `target/` directory
- Standard tooling: `cargo test`, `cargo build`

**Java:**
- Indicators: `pom.xml` (Maven) or `build.gradle*` (Gradle), `*.java` files
- Build tool: Maven or Gradle based on config file

**Ruby:**
- Indicators: `Gemfile`, `*.rb` files
- Framework detection: Check for `rails`, `sinatra` in Gemfile

**PHP:**
- Indicators: `composer.json`, `*.php` files, `vendor/` directory
- Framework detection: Check for `laravel/framework`, `symfony/symfony`

**C#:**
- Indicators: `*.csproj` or `*.sln`, `*.cs` files
- Standard tooling: `dotnet` commands

**C/C++:**
- Indicators: `CMakeLists.txt`, `Makefile`, `*.c`/`*.cpp` files
- Build tool: CMake or Make

**Swift:**
- Indicators: `Package.swift`, `*.swift` files
- Standard tooling: `swift build`, `swift test`

**Kotlin:**
- Indicators: `*.kt` files, Gradle with Kotlin plugin
- Build tool: Gradle

**Scala:**
- Indicators: `build.sbt`, `*.scala` files
- Build tool: sbt

### Step 4: Suggest Verification Commands

Based on the detected language and tools, suggest appropriate verification commands:

**TypeScript/JavaScript:**
```bash
# Type checking
npx tsc --noEmit          # If tsconfig.json exists

# Linting
npm run lint              # If lint script in package.json

# Testing
npm test                  # Or pnpm test, yarn test, bun test
npx vitest run            # If vitest configured

# Building
npm run build             # If build script exists
```

**Python:**
```bash
# Type checking
mypy .                    # If mypy configured
pyright                   # If pyright configured

# Linting
flake8                    # If .flake8 exists
pylint src/               # If .pylintrc exists
black --check .           # If using black

# Testing
pytest                    # If pytest configured
python -m unittest discover
```

**Go:**
```bash
go fmt ./...              # Format check
go vet ./...              # Static analysis
golint ./...              # Linting (if installed)
go test ./...             # Testing
go build ./...            # Build
```

**Rust:**
```bash
cargo fmt -- --check      # Format check
cargo clippy -- -D warnings  # Linting
cargo test                # Testing
cargo build               # Build
cargo build --release     # Release build
```

**Java (Maven):**
```bash
mvn test                  # Testing
mvn package               # Build
mvn verify                # Full verification
```

**Java (Gradle):**
```bash
./gradlew test            # Testing
./gradlew build           # Build
./gradlew check           # Linting + tests
```

**Ruby:**
```bash
rubocop                   # Linting
rspec                     # Testing (RSpec)
bundle exec rake test     # Testing (Minitest)
```

**PHP:**
```bash
./vendor/bin/phpcs        # Linting
./vendor/bin/phpstan      # Static analysis
./vendor/bin/phpunit      # Testing
```

**C#:**
```bash
dotnet format --verify-no-changes  # Format check
dotnet test               # Testing
dotnet build              # Build
```

**C/C++ (CMake):**
```bash
cmake -B build && cmake --build build
ctest --test-dir build
```

**Swift:**
```bash
swift build               # Build
swift test                # Testing
```

**Kotlin:**
```bash
./gradlew test
./gradlew build
./gradlew detekt          # If detekt configured
```

**Scala:**
```bash
sbt test                  # Testing
sbt compile               # Build
sbt scalafmt              # Format check
```

### Step 5: Build Structured Result

Create a JSON object with detection results:

```json
{
  "language": "<detected-language>",
  "confidence": 0.95,
  "evidence": [
    "<evidence-item-1>",
    "<evidence-item-2>",
    "..."
  ],
  "framework": "<detected-framework or null>",
  "frameworkVersion": "<version or null>",
  "buildTool": "<detected-build-tool or null>",
  "packageManager": "<detected-package-manager or null>",
  "testFramework": "<detected-test-framework or null>",
  "verifyCommands": [
    "<command-1>",
    "<command-2>",
    "..."
  ],
  "additionalInfo": {
    "hasTypeChecking": true/false,
    "hasLinting": true/false,
    "hasTesting": true/false,
    "hasBuild": true/false,
    "monorepo": false
  }
}
```

### Step 6: Save Results Using CLI

After building the JSON result, save it using the ralph-dev CLI:

```bash
# Build JSON result string
RESULT=$(cat <<'EOF'
{
  "language": "typescript",
  "confidence": 0.95,
  "evidence": [
    "package.json exists",
    "tsconfig.json exists",
    "47 .ts files found"
  ],
  "framework": "react",
  "frameworkVersion": "18.2.0",
  "buildTool": "vite",
  "packageManager": "pnpm",
  "testFramework": "vitest",
  "verifyCommands": [
    "npx tsc --noEmit",
    "pnpm run lint",
    "pnpm test",
    "pnpm run build"
  ],
  "additionalInfo": {
    "hasTypeChecking": true,
    "hasLinting": true,
    "hasTesting": true,
    "hasBuild": true,
    "monorepo": false
  }
}
EOF
)

# Save using CLI
ralph-dev detect-ai-save "$RESULT"
```

### Step 7: Display Summary to User

```markdown
✅ Language Detection Complete

Language: TypeScript
Framework: React 18.2.0
Build Tool: Vite
Package Manager: pnpm
Test Framework: Vitest
Confidence: 95%

Evidence:
- package.json exists
- tsconfig.json exists
- 47 .ts files found
- node_modules/ directory present

Verification Commands:
1. npx tsc --noEmit       # Type checking
2. pnpm run lint          # Linting
3. pnpm test              # Testing
4. pnpm run build         # Building

Configuration saved to .ralph-dev/tasks/index.json
```

## Edge Cases

### Monorepo Detection

If multiple config files found in subdirectories, detect as monorepo:

```json
{
  "language": "multiple",
  "monorepo": true,
  "packages": [
    {
      "path": "packages/frontend",
      "language": "typescript",
      "framework": "react"
    },
    {
      "path": "packages/backend",
      "language": "go"
    }
  ],
  "verifyCommands": [
    "# Frontend",
    "cd packages/frontend && npm test",
    "# Backend",
    "cd packages/backend && go test ./..."
  ]
}
```

### Multi-Language Projects

If significant files from multiple languages exist:

```json
{
  "language": "typescript",
  "secondaryLanguages": ["python", "go"],
  "explanation": "Primary language is TypeScript (web frontend), with Python for ML scripts and Go for backend services",
  "verifyCommands": [
    "# TypeScript frontend",
    "npm test",
    "# Python ML",
    "pytest ml/",
    "# Go backend",
    "cd backend && go test ./..."
  ]
}
```

### Unknown/Custom Build Systems

If no recognized build system detected:

```json
{
  "language": "detected_from_files",
  "confidence": 0.6,
  "warning": "Custom build system detected. Manual configuration may be needed.",
  "evidence": ["Makefile with custom targets", "shell scripts in build/"],
  "verifyCommands": [
    "make test",
    "make build"
  ],
  "recommendation": "Review Makefile for correct test and build targets"
}
```

## Example Execution Flow

```markdown
User: /detect-language

🔍 Scanning project structure...

📁 Root directory:
- package.json ✓
- tsconfig.json ✓
- vite.config.ts ✓
- .eslintrc.js ✓
- pnpm-lock.yaml ✓

📊 Source file counts:
  ts: 47 files
  tsx: 12 files
  js: 3 files

📦 Analyzing package.json...
{
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  },
  "devDependencies": {
    "vite": "^4.0.0",
    "vitest": "^0.34.0",
    "@typescript-eslint/eslint-plugin": "^5.0.0"
  },
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "test": "vitest run",
    "lint": "eslint src/"
  }
}

📊 Analysis:
- Primary language: TypeScript (95% confidence)
- Framework: React 18.2.0
- Build tool: Vite
- Package manager: pnpm
- Test framework: Vitest

✅ Language Detection Complete

Language: TypeScript
Framework: React 18.2.0
Build Tool: Vite
Package Manager: pnpm
Test Framework: Vitest
Confidence: 95%

Verification Commands:
1. npx tsc --noEmit       # Type checking
2. pnpm run lint          # ESLint
3. pnpm test              # Vitest
4. pnpm run build         # Vite build

💾 Saved configuration to .ralph-dev/tasks/index.json
```

## Rules

1. **Always scan first** - Don't assume, always look at actual files
2. **Use evidence** - Base conclusions on concrete file presence and content
3. **Confidence scoring** - If uncertain, lower confidence score
4. **Handle edge cases** - Monorepos, multi-language, custom builds
5. **Practical commands** - Suggest commands that actually work in this project
6. **No hallucination** - Only suggest tools/commands if evidence exists

## Integration

This skill is invoked by:
- User running: `/detect-language`
- Ralph-dev orchestrator during initialization
- CLI command: `ralph-dev detect --ai`
