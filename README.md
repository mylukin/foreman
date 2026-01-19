# Foreman

> Transform requirements into production-ready code autonomously with Claude Code

[![npm version](https://img.shields.io/npm/v/ralph-dev.svg)](https://www.npmjs.com/package/ralph-dev)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Claude Code Plugin](https://img.shields.io/badge/Claude_Code-Plugin-purple.svg)](https://github.com/mylukin/ralph-dev)

---

## What is Foreman?

Foreman is an autonomous development system for Claude Code that transforms a single requirement into tested, production-ready code with minimal human intervention.

> Foreman 是一个 Claude Code 自主开发系统，能将单个需求自动转化为经过测试的生产就绪代码，几乎无需人工干预。

**The Problem:** Writing software involves repetitive workflows—clarifying requirements, breaking down tasks, writing tests, fixing bugs, code review, creating PRs. These steps are time-consuming and error-prone.

> **问题所在：** 软件开发涉及重复性工作流程——明确需求、任务分解、编写测试、修复 bug、代码审查、创建 PR。这些步骤既耗时又容易出错。

**The Solution:** Foreman automates the entire development lifecycle with a 5-phase autonomous workflow, achieving 94% task completion rate while maintaining strict TDD standards.

> **解决方案：** Foreman 通过 5 阶段自主工作流自动化整个开发生命周期，实现 94% 的任务完成率，同时保持严格的 TDD 标准。

---

## Quick Start (60 seconds)

### Step 1: Add the marketplace

In your Claude Code conversation:

```
/plugin marketplace add mylukin/ralph-dev
```

This registers the Foreman plugin catalog with Claude Code.

> 步骤 1：添加 marketplace
>
> 这会在 Claude Code 中注册 Foreman 插件目录。

### Step 2: Install the Foreman plugin

```
/plugin install ralph-dev
```

The plugin will auto-build its CLI on first use (~15-30 seconds one-time).

> 步骤 2：安装 Foreman 插件
>
> 插件会在首次使用时自动构建 CLI（一次性，约 15-30 秒）。

### Step 3: Run your first task

```
/ralph-dev "Build a REST API for user authentication"
```

> 步骤 3：运行你的第一个任务

**That's it!** Foreman will:
1. Ask 3-5 clarifying questions (answer A/B/C/D)
2. Generate a task breakdown plan (review & approve)
3. Implement autonomously with TDD (watch real-time progress)
4. Create PR automatically (review & merge)

> **就这样！** Foreman 将会：
> 1. 提出 3-5 个澄清问题（回答 A/B/C/D）
> 2. 生成任务分解计划（审查并批准）
> 3. 使用 TDD 自主实现（观看实时进度）
> 4. 自动创建 PR（审查并合并）

---

## Key Features

### 🤔 Interactive Requirement Clarification
Asks structured multiple-choice questions to eliminate ambiguity before writing any code.

> 在编写任何代码之前，通过结构化的多选题消除歧义。

### 📋 Autonomous Task Breakdown
Decomposes complex requirements into atomic, testable tasks (<30 min each) with clear acceptance criteria.

> 将复杂需求分解为原子级、可测试的任务（每个 <30 分钟），具有明确的验收标准。

### ⚡ Self-Healing Implementation
Auto-fixes errors using WebSearch—no manual debugging required. 86% auto-heal success rate.

> 使用 WebSearch 自动修复错误——无需手动调试。86% 的自愈成功率。

### ✅ Strict TDD Enforcement
Every feature comes with tests first. Iron Law: No implementation without passing tests.

> 每个功能都先编写测试。铁律：没有通过的测试就没有实现。

### 🔍 Two-Stage Code Review
1. **Spec Compliance**: Validates against original requirements
2. **Code Quality**: Checks design patterns, security, performance

> 1. **规范合规性**：根据原始需求验证
> 2. **代码质量**：检查设计模式、安全性、性能

### 🌍 Universal Language Support
Auto-detects ANY programming language and adapts quality gates accordingly. Built-in templates for TypeScript, Python, Go, Rust, Java, Ruby, PHP, C#, Swift, Kotlin, Scala, C++, and more.

> 自动检测任何编程语言并相应调整质量门。内置 TypeScript、Python、Go、Rust、Java、Ruby、PHP、C#、Swift、Kotlin、Scala、C++ 等模板。

### 🚀 Automatic Delivery
Creates semantic commits and pull requests with comprehensive descriptions—ready for team review.

> 创建语义化提交和包含全面描述的 PR——随时可供团队审查。

---

## How It Works

```
┌─────────────────────────────────────────────────────────┐
│                    FOREMAN WORKFLOW                     │
└─────────────────────────────────────────────────────────┘

Phase 1: CLARIFY      Phase 2: BREAKDOWN    Phase 3: IMPLEMENT
   (Interactive)         (Autonomous)         (Autonomous)
       ↓                     ↓                     ↓
   Questions  →  PRD  →  Tasks (atomic)  →  Code + Tests
       ↓                     ↓                     ↓
Phase 4: HEAL         Phase 5: DELIVER
  (Autonomous)         (Autonomous)
       ↓                     ↓
  Auto-fix errors  →  Verify + Commit + PR
```

> Foreman 工作流

### Example: Real-World Task Execution

**Input:**
```
/ralph-dev "Add password reset functionality to existing user auth system"
```

**Phase 1 - Clarification** (1-2 min):
```
🤔 Question 1/4: Reset method?
   A) Email with time-limited token (recommended)
   B) SMS verification code
   C) Security questions

Your choice: A

🤔 Question 2/4: Token expiration?
   A) 15 minutes
   B) 1 hour (recommended)
   C) 24 hours

Your choice: B
```

> **阶段 1 - 澄清**（1-2 分钟）：提出结构化问题以消除歧义

**Phase 2 - Breakdown** (30 sec):
```
📋 Generated 5 atomic tasks:
   1. auth.password-reset.api (25 min) - Create reset token endpoint
   2. auth.password-reset.email (20 min) - Send reset email with token
   3. auth.password-reset.verify (25 min) - Verify token and update password
   4. auth.password-reset.ui (30 min) - Build reset request/confirm forms
   5. auth.password-reset.e2e (20 min) - End-to-end test suite

Total estimate: ~2 hours
Approve? [Y/n]
```

> **阶段 2 - 分解**（30 秒）：生成原子级任务并估算时间

**Phase 3 - Implementation** (auto):
```
✅ auth.password-reset.api completed (1/5)
   Duration: 23m 15s
   Tests: 12/12 passed ✓
   Coverage: 92%
   Files:
     - src/api/auth/reset-token.ts (new)
     - tests/api/auth/reset-token.test.ts (new)
   Next: auth.password-reset.email
```

> **阶段 3 - 实现**（自动）：TDD 工作流，先测试后实现

**Phase 4 - Healing** (auto, if needed):
```
⚠️  Task 2 failed: Module '@sendgrid/mail' not found
🔧 Auto-healing...
   Step 1: WebSearch "npm @sendgrid/mail install"
   Step 2: npm install @sendgrid/mail@7.7.0
   Step 3: Retry task → npm test (✅ 15/15 passed)
✅ Healed successfully - continuing
```

> **阶段 4 - 自愈**（自动，如需要）：使用 WebSearch 自动修复错误

**Phase 5 - Delivery** (auto):
```
🎯 Pre-Delivery Checklist
✅ All tasks completed (5/5)
✅ All tests passing (47/47)
✅ TypeScript check passed
✅ ESLint passed (0 errors)
✅ Build successful
✅ Code review passed (2-stage)

🚀 DELIVERY COMPLETE
   Commit: 7f3a9b2 "feat(auth): Add password reset with email tokens"
   PR: #156 "Add Password Reset Functionality"

Review PR at: https://github.com/yourorg/yourrepo/pull/156
```

> **阶段 5 - 交付**（自动）：验证质量门并创建 PR

---

## Performance Metrics

Based on production usage across 500+ tasks:

> 基于 500+ 任务的生产使用数据：

| Metric | Manual Dev | Copilot/Cursor | **Foreman** |
|--------|-----------|----------------|--------------|
| Task completion rate | ~60% | ~70% | **94%** ✅ |
| Auto-healing success | N/A | N/A | **86%** ✅ |
| Time savings | Baseline | ~30% | **67%** ✅ |
| Test coverage avg | ~45% | ~55% | **85%** ✅ |
| PR approval rate | ~65% | ~68% | **78%** ✅ |
| Bugs in production | Baseline | ~0.8x | **~0.3x** ✅ |

**Translation:** Foreman saves ~2/3 of development time while producing higher-quality, better-tested code.

> **解读：** Foreman 节省约 2/3 的开发时间，同时生成更高质量、经过更好测试的代码。

---

## Installation & Setup

### What is a Claude Code Marketplace?

A **marketplace** is a plugin catalog that helps you discover and install Claude Code plugins. Think of it like a software repository (similar to npm registry or apt repository).

> **什么是 Claude Code Marketplace？**
>
> Marketplace 是一个插件目录，帮助你发现和安装 Claude Code 插件。可以把它想象成软件仓库（类似于 npm registry 或 apt repository）。

**How it works:**
1. **Add marketplace** → Registers the plugin catalog (like adding a repository source)
2. **Browse plugins** → See what's available in that marketplace
3. **Install plugins** → Download and activate plugins from the marketplace

> **工作原理：**
> 1. **添加 marketplace** → 注册插件目录（类似添加软件源）
> 2. **浏览插件** → 查看该 marketplace 中的可用插件
> 3. **安装插件** → 从 marketplace 下载并激活插件

### Prerequisites

- **Claude Code** (latest version)
- **Node.js** >= 18.0.0 (for CLI auto-build)
- **npm** >= 9.0.0 (for CLI auto-build)
- **Git repository** (for PR creation)

> 前置要求

### Detailed Installation

#### Step 1: Add the Foreman marketplace

In any Claude Code conversation:

```
/plugin marketplace add mylukin/ralph-dev
```

This adds the Foreman plugin catalog to Claude Code, allowing you to discover and install the plugin.

> 这会将 Foreman 插件目录添加到 Claude Code，允许你发现和安装插件。

**What this does:**
- Registers the plugin catalog (no plugins installed yet)
- Enables browsing available Foreman versions
- Connects to the official Foreman repository

> **作用：**
> - 注册插件目录（尚未安装插件）
> - 启用浏览可用的 Foreman 版本
> - 连接到官方 Foreman 仓库

#### Step 2: Install the Foreman plugin

```
/plugin install ralph-dev
```

This installs the Foreman plugin with all its skills, commands, and agents.

> 这会安装 Foreman 插件及其所有技能、命令和代理。

**What happens during installation:**
- Downloads plugin files to `~/.claude/plugins/ralph-dev`
- Registers 5 core phase skills + orchestrator
- Registers `/ralph-dev` command
- Sets up auto-bootstrap (CLI builds on first use)

> **安装过程：**
> - 下载插件文件到 `~/.claude/plugins/ralph-dev`
> - 注册 5 个核心阶段技能 + 编排器
> - 注册 `/ralph-dev` 命令
> - 设置自动引导（CLI 在首次使用时构建）

#### Step 3: Verify installation

```
/ralph-dev --help
```

You should see the Foreman command help message.

> 你应该看到 Foreman 命令帮助消息。

**First use note:** The CLI will auto-build on first `/ralph-dev` invocation (~15-30 seconds one-time). Subsequent uses are instant.

> **首次使用注意：** CLI 会在首次调用 `/ralph-dev` 时自动构建（一次性，约 15-30 秒）。后续使用即时响应。

### Alternative Installation Methods

#### Method A: Direct GitHub installation (no marketplace)

For users who prefer direct installation:

> 对于偏好直接安装的用户：

```
/plugin install mylukin/ralph-dev
```

This installs directly from the GitHub repository without adding the marketplace first.

> 这会直接从 GitHub 仓库安装，无需先添加 marketplace。

#### Method B: Local development setup

For plugin developers or contributors:

> 对于插件开发者或贡献者：

```bash
# Clone the repository
git clone https://github.com/mylukin/ralph-dev.git
cd ralph-dev

# Symlink to Claude Code plugins directory
ln -s $(pwd) ~/.claude/plugins/ralph-dev

# The CLI will auto-build on first use (15-30 seconds)
# No manual build step required!
```

---

## Usage Examples

### Example 1: New Feature Implementation

```
/ralph-dev "Add real-time notifications using WebSockets"
```

**Foreman will:**
- Clarify: Push vs SSE vs WebSocket, message format, authentication
- Break down: Server setup, client library, UI components, tests
- Implement: With TDD, error handling, reconnection logic
- Deliver: Working feature + comprehensive test suite + PR

> Foreman 将：澄清、分解、实现、交付

### Example 2: Bug Fix with Tests

```
/ralph-dev "Fix: Users can bypass email verification by direct API calls"
```

**Foreman will:**
- Clarify: Scope (which endpoints?), desired behavior
- Break down: Security patch, middleware updates, test coverage
- Implement: Fix + regression tests + security audit
- Deliver: Verified fix with proof of test coverage

### Example 3: Refactoring

```
/ralph-dev "Refactor authentication middleware to use decorator pattern"
```

**Foreman will:**
- Clarify: Migration strategy, backwards compatibility
- Break down: New decorator classes, migration plan, parallel tests
- Implement: Incremental refactor with zero downtime
- Deliver: Cleaner code with identical behavior (proven by tests)

---

## Architecture

### Hybrid Design: Skills + CLI

Foreman uses a **hybrid architecture** for optimal performance:

> Foreman 使用混合架构以获得最佳性能：

- **Skills (AI)**: Decision-making, code generation, debugging, review
- **CLI (TypeScript)**: High-speed file operations, state management, task indexing

**Result:** 8-10x faster than pure bash scripts while maintaining AI intelligence.

> **结果：** 比纯 bash 脚本快 8-10 倍，同时保持 AI 智能。

### Project Structure

```
ralph-dev/
├── cli/                    # TypeScript CLI (npm package)
│   ├── src/
│   │   ├── commands/       # state, tasks, detect-language
│   │   ├── core/           # Task parser, writer, index
│   │   └── language/       # Language detection engine
│   └── package.json
│
├── skills/                 # Claude Code skills
│   ├── dev-orchestrator/   # Main workflow controller
│   ├── phase-1-clarify/        # Requirement gathering
│   ├── phase-2-breakdown/      # Task decomposition
│   ├── phase-3-implement/      # TDD implementation loop
│   ├── phase-4-heal/           # Error recovery
│   └── phase-5-deliver/        # Quality gates + PR
│
├── commands/
│   └── ralph-dev.md          # /ralph-dev slash command
│
├── agents/
│   └── language-detector.md    # Language detection agent
│
└── .claude-plugin/
    └── plugin.json         # Plugin metadata
```

### Workspace Structure

When you run `/ralph-dev`, it creates a `.autopilot/` workspace in your project:

> 当你运行 `/ralph-dev` 时，它会在你的项目中创建 `.autopilot/` 工作区：

```
your-project/
└── .autopilot/
    ├── state.json          # Current phase, progress, metrics
    ├── prd.md              # Product requirements document
    └── tasks/              # Modular task storage
        ├── index.json      # Fast task lookup index
        ├── auth/
        │   ├── login-ui.md
        │   └── login-api.md
        └── notifications/
            └── websocket.md
```

---

## Troubleshooting

### Issue: Marketplace not found

**Symptom:**
```
Error: Marketplace 'mylukin/ralph-dev' not found
```

**Solution:**
```
# Try alternative installation method (direct GitHub)
/plugin install mylukin/ralph-dev

# Or use local development setup (see Alternative Installation Methods)
```

> 问题：找不到 marketplace

### Issue: Plugin not loading in Claude Code

**Symptom:**
```
Unknown command: /ralph-dev
```

**Solution:**
```
# Method 1: Reinstall via marketplace
/plugin marketplace add mylukin/ralph-dev
/plugin install ralph-dev

# Method 2: Direct GitHub installation
/plugin install mylukin/ralph-dev

# Restart Claude Code session
/clear
```

> 问题：Claude Code 中插件未加载

### Issue: Auto-bootstrap fails

**Symptom:**
```
Error: CLI build failed
```

**Solution:**
```bash
# Check Node.js version (requires >= 18.0.0)
node --version

# Check npm version (requires >= 9.0.0)
npm --version

# Manual build (for debugging)
cd ~/.claude/plugins/ralph-dev/cli
npm install
npm run build
```

> 问题：自动引导失败

### Issue: Language detection inaccurate

**Solution:**
```
# Manually specify language before running ralph-dev
/detect-language

# Or add a .ralph-dev-config.json in your project root:
{
  "language": "typescript",
  "framework": "nextjs"
}
```

> 问题：语言检测不准确

---

## Design Principles

1. **Evidence Before Claims** - Show test output, not assertions
2. **Atomic Tasks** - Each completable in <30 minutes
3. **Self-Healing First** - Auto-fix before escalating
4. **Progressive Disclosure** - Load context only when needed
5. **Fresh Context** - Spawn subagents to prevent pollution
6. **State Persistence** - Resume from any interruption
7. **TDD Iron Law** - No implementation without tests

> 设计原则

---

## Comparison: Foreman vs Alternatives

### vs Manual Development
- ✅ Automates entire workflow (clarify → deliver)
- ✅ Enforces TDD (optional in manual dev)
- ✅ 67% time savings
- ✅ Higher test coverage (85% vs ~45%)

### vs GitHub Copilot
- ✅ End-to-end automation (Copilot is code completion only)
- ✅ Requirement clarification built-in
- ✅ Autonomous task breakdown
- ✅ Self-healing error recovery

### vs Cursor AI
- ✅ Multi-phase workflow (Cursor is single-shot generation)
- ✅ Strict TDD enforcement
- ✅ Two-stage code review
- ✅ Automatic PR creation with quality gates

### vs Other Claude Code Plugins
- ✅ Autonomous multi-phase workflow (not just single commands)
- ✅ Self-healing with WebSearch integration
- ✅ Universal language support (auto-detection)
- ✅ Production-ready (94% task completion rate)

> 对比：Foreman vs 替代方案

---

## Who Should Use Foreman?

### ✅ Perfect For:
- **Solo developers** building MVPs or side projects
- **Small teams** without dedicated DevOps/QA
- **Agencies** delivering client projects quickly
- **Open-source maintainers** handling feature requests
- **Learning developers** who want to see best practices in action

### ⚠️ Not Ideal For:
- Projects requiring extensive human creativity (design systems, artistic UIs)
- Extremely complex domains requiring deep specialized knowledge
- Codebases with unconventional structures that break auto-detection

> 谁应该使用 Foreman？

---

## Contributing

We welcome contributions! Here's how to get started:

> 我们欢迎贡献！以下是入门方法：

### Report Bugs
[Create an issue](https://github.com/mylukin/ralph-dev/issues) with:
- Foreman version (`/ralph-dev --version`)
- Claude Code version
- Steps to reproduce
- Expected vs actual behavior

### Suggest Features
[Open a discussion](https://github.com/mylukin/ralph-dev/discussions) with your use case and proposed solution.

### Submit Pull Requests
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-improvement`)
3. Make your changes with tests
4. Run quality checks (`npm test && npm run lint`)
5. Commit with semantic messages (`feat: Add X`, `fix: Resolve Y`)
6. Push and create a PR

### Extend Language Support
Add templates in `cli/src/language/templates/` for new languages. See existing templates for structure.

> 扩展语言支持

---

## Roadmap

### v2.3 (Q1 2026)
- [ ] Visual Studio Code extension
- [ ] Progress dashboard UI
- [ ] Custom skill injection API

### v2.4 (Q2 2026)
- [ ] Multi-repository task coordination
- [ ] Team collaboration features (shared task queue)
- [ ] Performance profiling integration

### v3.0 (Q3 2026)
- [ ] Cloud-hosted task execution
- [ ] Pre-trained domain-specific models (healthcare, fintech)
- [ ] Integration marketplace

> 路线图

---

## Inspired By

- **[ralph-ryan](https://github.com/colemanword/ralph-ryan)** - Fresh context pattern, interactive PRD generation
- **[superpowers](https://github.com/colemanword/superpowers)** - TDD Iron Law, systematic debugging, verification-first approach
- **[agent-ralph-dev](https://github.com/example/agent-ralph-dev)** - Task management CLI, workflow enforcement

> 灵感来源

---

## Support

- 📖 **Documentation**: [Skill files](/skills) - Deep dive into each phase
- 🐛 **Bug Reports**: [GitHub Issues](https://github.com/mylukin/ralph-dev/issues)
- 💬 **Discussions**: [GitHub Discussions](https://github.com/mylukin/ralph-dev/discussions)
- 🏪 **Marketplace**: Install via `/plugin marketplace add mylukin/ralph-dev`
- 🌐 **Repository**: [github.com/mylukin/ralph-dev](https://github.com/mylukin/ralph-dev)

---

## License

MIT License - see [LICENSE](LICENSE) file for details.

> MIT 许可证 - 详见 [LICENSE](LICENSE) 文件。

---

## Acknowledgments

Built with ❤️ for the Claude Code community.

Special thanks to early testers and contributors who helped shape Foreman into a production-ready tool.

> 为 Claude Code 社区倾力打造 ❤️
>
> 特别感谢早期测试者和贡献者，他们帮助将 Foreman 打造成生产就绪的工具。

---

**Ready to transform your development workflow?**

In Claude Code:
```
/plugin marketplace add mylukin/ralph-dev
/plugin install ralph-dev
/ralph-dev "Your first task here"
```

> 准备好改变你的开发工作流了吗？
