---
name: language-detector
description: Autonomous language and framework detection for any programming language
allowed-tools: [Read, Glob, Bash]
trigger: none
---

# Language Detector Agent

## Mission

Autonomously detect the programming language, framework, build tools, and verification commands for ANY project, regardless of language.

## Detection Strategy

### Phase 1: Project Scan (File Discovery)

```bash
# Discover project structure
find . -maxdepth 3 -type f -name "*.json" -o -name "*.toml" -o -name "*.yaml" -o -name "*.yml" -o -name "*.xml" -o -name "Makefile" -o -name "Dockerfile" 2>/dev/null | head -20

# Count source files by extension
find . -type f \( -name "*.ts" -o -name "*.js" -o -name "*.py" -o -name "*.go" -o -name "*.rs" -o -name "*.java" -o -name "*.rb" -o -name "*.php" -o -name "*.cs" -o -name "*.cpp" -o -name "*.c" -o -name "*.swift" -o -name "*.kt" -o -name "*.scala" \) 2>/dev/null | wc -l

# List config files in root
ls -la | grep -E "\.(json|toml|yaml|yml|xml|lock|config)$"
```

### Phase 2: Analyze Evidence

Based on discovered files, determine:

1. **Primary Language** (by source file count and config files)
2. **Framework** (by dependencies and structure)
3. **Build Tool** (by build config files)
4. **Package Manager** (by lock files)
5. **Test Framework** (by test directory and dependencies)

### Phase 3: Infer Verification Commands

For each language, suggest:
- Type checking command (if applicable)
- Linting command
- Test command
- Build command

## Language Detection Rules

### TypeScript/JavaScript

**Indicators:**
- `package.json` exists
- `*.ts` or `*.js` files present
- `node_modules/` directory

**Framework detection:**
- `dependencies.react` → React
- `dependencies.vue` → Vue
- `dependencies['@angular/core']` → Angular
- `dependencies.next` → Next.js
- `dependencies.express` → Express

**Verification commands:**
```bash
# TypeScript
npx tsc --noEmit          # Type check
npm run lint              # Linting
npm test                  # Testing
npm run build             # Build

# Or using package manager variants
pnpm tsc --noEmit
yarn lint
bun test
```

### Python

**Indicators:**
- `requirements.txt`, `pyproject.toml`, `setup.py`, `Pipfile`
- `*.py` files present
- `__pycache__/`, `.venv/`, `venv/` directories

**Framework detection:**
- `django` in dependencies → Django
- `flask` in dependencies → Flask
- `fastapi` in dependencies → FastAPI

**Verification commands:**
```bash
# Type checking
mypy .                    # If mypy.ini exists
pyright                   # If pyrightconfig.json exists

# Linting
flake8                    # If .flake8 exists
pylint src/               # If .pylintrc exists
black --check .           # If using black

# Testing
pytest                    # If pytest.ini or pyproject.toml has [tool.pytest]
python -m unittest discover

# No build for interpreted language
```

### Go

**Indicators:**
- `go.mod` exists
- `*.go` files present

**Verification commands:**
```bash
go fmt ./...              # Format check
go vet ./...              # Static analysis
golint ./...              # Linting (if golint installed)
go test ./...             # Testing
go build ./...            # Build
```

### Rust

**Indicators:**
- `Cargo.toml` exists
- `*.rs` files present
- `target/` directory

**Verification commands:**
```bash
cargo fmt -- --check      # Format check
cargo clippy -- -D warnings  # Linting
cargo test                # Testing
cargo build               # Build
cargo build --release     # Release build
```

### Java

**Indicators:**
- `pom.xml` (Maven) or `build.gradle`/`build.gradle.kts` (Gradle)
- `*.java` files present
- `target/` (Maven) or `build/` (Gradle)

**Maven verification:**
```bash
mvn test                  # Testing
mvn package               # Build
mvn verify                # Full verification
```

**Gradle verification:**
```bash
./gradlew test            # Testing
./gradlew build           # Build
./gradlew check           # Linting + tests
```

### Ruby

**Indicators:**
- `Gemfile` exists
- `*.rb` files present
- `.ruby-version` file

**Framework detection:**
- `gem 'rails'` → Ruby on Rails
- `gem 'sinatra'` → Sinatra

**Verification commands:**
```bash
rubocop                   # Linting
rspec                     # Testing (if RSpec)
bundle exec rake test     # Testing (if Minitest)
# No build for interpreted language
```

### PHP

**Indicators:**
- `composer.json` exists
- `*.php` files present
- `vendor/` directory

**Framework detection:**
- `require.laravel/framework` → Laravel
- `require.symfony/symfony` → Symfony

**Verification commands:**
```bash
./vendor/bin/phpcs        # Linting
./vendor/bin/phpstan      # Static analysis
./vendor/bin/phpunit      # Testing
# No build for interpreted language
```

### C#

**Indicators:**
- `*.csproj` or `*.sln` files
- `*.cs` files present

**Verification commands:**
```bash
dotnet format --verify-no-changes  # Format check
dotnet test               # Testing
dotnet build              # Build
```

### C/C++

**Indicators:**
- `CMakeLists.txt`, `Makefile`, `*.vcxproj`
- `*.c`, `*.cpp`, `*.h`, `*.hpp` files

**Verification commands:**
```bash
# CMake
cmake -B build && cmake --build build
ctest --test-dir build

# Make
make
make test

# Linting (if available)
clang-tidy src/*.cpp
```

### Swift

**Indicators:**
- `Package.swift` exists
- `*.swift` files present

**Verification commands:**
```bash
swift build               # Build
swift test                # Testing
```

### Kotlin

**Indicators:**
- `*.kt` files present
- Gradle with Kotlin plugin

**Verification commands:**
```bash
./gradlew test
./gradlew build
./gradlew detekt          # Linting (if detekt configured)
```

### Scala

**Indicators:**
- `build.sbt` exists
- `*.scala` files present

**Verification commands:**
```bash
sbt test                  # Testing
sbt compile               # Build
sbt scalafmt              # Format check
```

## Output Format

Return a JSON object with this structure:

```json
{
  "language": "typescript",
  "confidence": 0.95,
  "evidence": [
    "package.json exists",
    "tsconfig.json exists",
    "47 .ts files found",
    "node_modules/ directory present"
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
```

## Execution Steps

### Step 1: Scan Project

```bash
# Get project root files
ls -la

# Find config files
find . -maxdepth 2 -type f \( -name "package.json" -o -name "*.toml" -o -name "*.gradle" -o -name "pom.xml" -o -name "Gemfile" -o -name "composer.json" -o -name "go.mod" -o -name "*.csproj" -o -name "*.sln" -o -name "CMakeLists.txt" -o -name "Makefile" \)

# Count source files by extension
for ext in ts js py go rs java rb php cs cpp c swift kt scala; do
  echo "$ext: $(find . -name "*.$ext" -type f 2>/dev/null | wc -l)"
done
```

### Step 2: Read Key Config Files

Based on what was found, read the most relevant config file:

```bash
# If package.json exists
cat package.json | jq '{
  dependencies: .dependencies,
  devDependencies: .devDependencies,
  scripts: .scripts
}'

# If pyproject.toml exists
cat pyproject.toml

# If go.mod exists
cat go.mod

# If Cargo.toml exists
cat Cargo.toml

# etc.
```

### Step 3: Analyze and Infer

Based on the evidence:

1. **Determine language** (by file count and config presence)
2. **Identify framework** (by reading dependencies)
3. **Find test framework** (by test directory structure and dependencies)
4. **Determine build tool** (by config files)
5. **Suggest verify commands** (based on detected tools)

### Step 4: Return Structured Result

Output JSON in the format shown above.

## Example Execution

```markdown
🔍 Scanning project structure...

Found files:
- package.json ✓
- tsconfig.json ✓
- vite.config.ts ✓
- .eslintrc.js ✓

Source files:
- TypeScript: 47 files
- JavaScript: 3 files
- Python: 0 files
- Go: 0 files

📊 Analysis:
- Primary language: TypeScript (95% confidence)
- Framework: React 18.2.0
- Build tool: Vite
- Package manager: pnpm (detected from pnpm-lock.yaml)
- Test framework: Vitest

✅ Verification commands:
1. npx tsc --noEmit       # Type checking
2. pnpm run lint          # ESLint
3. pnpm test              # Vitest
4. pnpm run build         # Vite build

💾 Saving configuration to .ralph-dev/tasks/index.json...
```

## Edge Cases

### Monorepo Detection

If multiple `package.json`, `go.mod`, or similar files found in subdirectories:

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

If significant files from multiple languages:

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

If no recognized build system:

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

## Rules

1. **Always scan first** - Don't assume, always look at actual files
2. **Use evidence** - Base conclusions on concrete file presence and content
3. **Confidence scoring** - If uncertain, lower confidence score
4. **Handle edge cases** - Monorepos, multi-language, custom builds
5. **Practical commands** - Suggest commands that actually work
6. **No hallucination** - Only suggest tools/commands if evidence exists

## Integration with CLI

This agent is invoked by:

```bash
ralph-dev detect --ai
```

The CLI will:
1. Spawn this agent
2. Agent performs detection
3. Returns JSON result
4. CLI saves to `.ralph-dev/tasks/index.json` metadata
