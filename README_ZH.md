# Ralph-dev

[English](README.md) | [中文](README_ZH.md)

Claude Code 自主开发工作流插件，通过 5 阶段流程将自然语言需求转换为结构化的、可测试的代码。

[![npm version](https://img.shields.io/npm/v/ralph-dev.svg)](https://www.npmjs.com/package/ralph-dev)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

## 概述

Ralph-dev 通过以下方式自动化软件开发工作流：
- 将需求分解为原子化、可测试的任务
- 使用独立的代理上下文实现每个任务，强制执行 TDD
- 自动检测项目语言和框架（支持 12+ 种语言）
- 通过 CLI 驱动的任务系统管理状态和进度
- 通过基于 WebSearch 的调查自动修复错误
- 创建 git 提交和拉取请求以供代码审查

## 快速开始

```bash
# 步骤 1：全局安装 CLI
npm install -g ralph-dev

# 步骤 2：添加插件市场
/plugin marketplace add mylukin/ralph-dev

# 步骤 3：安装插件
/plugin install ralph-dev

# 步骤 4：初始化项目（安装工作流规则）
ralph-dev init

# 步骤 5：启动第一个任务
/ralph-dev "构建用户认证 REST API"
```

Ralph-dev 将引导你完成：
1. 通过结构化的多选答案澄清问题
2. 任务分解审批（在实现前审查原子任务）
3. 使用 TDD 工作流自主实现
4. 自动创建拉取请求

## 核心功能

### 交互式澄清
通过关于技术栈、架构和部署的多选问题，结构化问答消除需求歧义。

### 自主任务分解
将需求分解为存储为带有 YAML 前置元数据的 markdown 文件的原子任务，支持：
- 任务间依赖跟踪
- 细粒度进度监控
- 人类可读的任务描述
- 版本控制集成

### 多语言支持
自动检测并配置以下语言的验证命令：
- **JavaScript/TypeScript** - Node.js, Next.js, React, Vue, Angular
- **Python** - Django, Flask, FastAPI
- **Go, Rust, Java, Ruby, PHP, C#, Swift, Kotlin, Scala, C++**

### 自愈实现
当任务失败时，自动：
- 使用 WebSearch 调查错误
- 基于研究应用修复
- 重新运行验证命令
- 最多重试 5 次后升级（熔断器模式）

### 安全功能
受 [Superpowers](https://github.com/coleam00/superpowers) 启发：
1. **Gitignore 验证** - 在创建文件前自动确保 `.ralph-dev/` 被 gitignore
2. **基线测试验证** - 在开始实现前确认所有测试通过
3. **自动清理** - 交付后删除临时文件，同时保留文档

### 两阶段代码审查
在创建 PR 前：
1. **规范合规性** - 验证是否满足验收标准
2. **代码质量** - 运行类型检查、代码检查和测试

## 架构

### 5 阶段工作流

```
澄清 → 分解 → 实现 ⇄ 修复 → 交付
```

**阶段 1：澄清（CLARIFY）**
- 技能：`skills/phase-1-clarify/`
- 提出关于需求的结构化问题
- 生成产品需求文档（PRD）
- 输出：`.ralph-dev/prd.md`

**阶段 2：分解（BREAKDOWN）**
- 技能：`skills/phase-2-breakdown/`
- 将 PRD 解析为原子任务（每个 <30 分钟）
- 创建带有依赖跟踪的模块化任务文件
- 输出：`.ralph-dev/tasks/*.md` + `tasks/index.json`

**阶段 3：实现（IMPLEMENT）**
- 技能：`skills/phase-3-implement/`
- 为每个任务生成独立的代理上下文以强制执行 TDD
- 管理任务生命周期（待处理 → 进行中 → 已完成/失败）
- 失败时自动调用阶段 4

**阶段 4：修复（HEAL）**
- 技能：`skills/phase-4-heal/`
- 在阶段 3 任务失败时触发
- 使用 WebSearch 研究错误解决方案
- 应用修复并重新运行验证
- 每个错误最多 5 次重试（熔断器）

**阶段 5：交付（DELIVER）**
- 技能：`skills/phase-5-deliver/`
- 运行特定语言的质量门控
- 两阶段代码审查流程
- 创建 git 提交和拉取请求

### 目录结构

```
ralph-dev/
├── .claude-plugin/
│   └── plugin.json           # 插件元数据
├── cli/                      # TypeScript CLI（状态、任务、语言检测）
│   ├── src/
│   │   ├── commands/         # CLI 子命令
│   │   │   ├── state.ts      # 管理 .ralph-dev/state.json
│   │   │   ├── tasks.ts      # 任务 CRUD 操作
│   │   │   ├── detect.ts     # 语言检测
│   │   │   └── detect-ai.ts  # AI 驱动的检测
│   │   ├── core/
│   │   │   ├── task-parser.ts      # 解析 YAML 前置元数据
│   │   │   ├── task-writer.ts      # 写入任务文件
│   │   │   └── circuit-breaker.ts  # 熔断器故障保护模式
│   │   ├── repositories/
│   │   │   ├── task-repository.service.ts    # 任务持久化
│   │   │   ├── state-repository.service.ts   # 状态持久化
│   │   │   └── index-repository.service.ts   # 任务索引管理
│   │   └── language/
│   │       └── detector.ts   # 多语言检测
│   └── bin/
│       └── ralph-dev.js      # CLI 入口点
├── skills/
│   ├── dev-orchestrator/     # 主工作流编排器
│   ├── phase-1-clarify/      # 需求澄清
│   ├── phase-2-breakdown/    # 任务分解
│   ├── phase-3-implement/    # 实现循环
│   ├── phase-4-heal/         # 错误恢复
│   ├── phase-5-deliver/      # 质量门控 + PR 创建
│   └── detect-language/      # 基于 AI 的语言检测
├── commands/
│   └── ralph-dev.md          # 主 /ralph-dev 命令
└── shared/
    └── bootstrap-cli.sh      # 首次使用时自动构建 CLI
```

### 工作区结构

运行 `/ralph-dev` 时，会创建一个工作区目录：

```
your-project/
└── .ralph-dev/
    ├── state.json            # 当前阶段、进度跟踪
    ├── prd.md                # 产品需求文档
    ├── tasks/
    │   ├── index.json        # 任务元数据和状态
    │   ├── auth/
    │   │   ├── login.ui.md
    │   │   ├── login.api.md
    │   │   └── logout.md
    │   └── setup/
    │       └── scaffold.md
    ├── progress.log          # 审计跟踪（gitignored）
    └── debug.log             # 错误日志（gitignored）
```

**任务文件格式：**
```markdown
---
id: auth.login.ui
module: auth
priority: 2
status: pending
estimatedMinutes: 25
dependencies: [setup.scaffold]
testRequirements:
  unit:
    required: true
    pattern: "**/*.test.ts"
---

# 登录 UI 组件

## 验收标准
1. 表单显示电子邮件和密码字段
2. 提交按钮验证电子邮件格式
...
```

## 安装

### 前置要求
- Claude Code（最新版本）
- Node.js >= 18.0.0
- npm >= 9.0.0
- Git 仓库

### 安装步骤

**步骤 1：全局安装 CLI**
```bash
npm install -g ralph-dev
```

**步骤 2：添加插件市场**
```bash
/plugin marketplace add mylukin/ralph-dev
```

**步骤 3：安装插件**
```bash
/plugin install ralph-dev
```

**步骤 4：初始化项目**
```bash
ralph-dev init
```
这会将工作流规则安装到 `.claude/rules/` 目录，以便在开发过程中提供更好的 AI 指导。

**注意：** TypeScript CLI 在首次使用时自动构建。构建时间取决于系统性能。

## 使用

### 启动新任务
```bash
/ralph-dev "使用 WebSocket 添加实时通知"
```

### 恢复之前的会话
```bash
/ralph-dev resume
```

### 检查进度
```bash
/ralph-dev status
```

### 取消会话
```bash
/ralph-dev cancel
```

## CLI 参考

`ralph-dev` CLI 由技能内部使用以管理状态和任务：

```bash
# 状态管理
ralph-dev state get                    # 读取当前状态
ralph-dev state update --phase clarify # 更新阶段
ralph-dev state clear                  # 重置状态

# 任务管理
ralph-dev tasks list                   # 列出所有任务
ralph-dev tasks next --json            # 获取下一个待处理任务
ralph-dev tasks start <id>             # 标记任务为进行中
ralph-dev tasks done <id>              # 标记任务为已完成
ralph-dev tasks fail <id> --reason ""  # 标记任务为失败

# 语言检测
ralph-dev detect                       # 检测语言/框架
ralph-dev detect-ai                    # AI 驱动的检测
```

## 语言检测

Ralph-dev 自动检测项目的语言并配置验证命令：

| 语言 | 检测到的框架 | 测试框架 | 构建工具 |
|----------|-------------------|----------------|-------------|
| JavaScript/TypeScript | Next.js, React, Vue, Angular | Jest, Vitest | npm, Vite, Webpack |
| Python | Django, Flask, FastAPI | pytest, unittest | pip |
| Go | - | go test | go build |
| Rust | - | cargo test | cargo |
| Java | - | JUnit | Maven, Gradle |
| Ruby | Rails | RSpec, Minitest | bundler |
| PHP | Laravel, Symfony | PHPUnit | composer |
| C# | .NET | xunit | dotnet |
| Swift, Kotlin, Scala, C++ | 多种 | 多种 | 多种 |

检测分析：
- 包管理器文件（package.json, requirements.txt, Cargo.toml 等）
- 配置文件
- 源文件扩展名
- 项目结构模式

## 工作原理：示例流程

**用户输入：**
```bash
/ralph-dev "添加密码重置功能"
```

**阶段 1：澄清**
- 询问关于重置方法（电子邮件/短信）、令牌过期、安全要求的问题
- 生成包含用户故事和技术要求的 PRD

**阶段 2：分解**
创建如下任务：
- `auth.password-reset.ui` - 前端表单组件
- `auth.password-reset.api` - 后端 API 端点
- `auth.password-reset.email` - 电子邮件通知服务
- `auth.password-reset.tests` - 集成测试
- `auth.password-reset.docs` - API 文档

**阶段 3：实现**
对于每个任务：
1. 生成独立的代理上下文
2. 使用 TDD 实现（测试优先）
3. 运行验证命令
4. 标记任务完成或在错误时调用阶段 4

**阶段 4：修复**（如需要）
- 搜索错误解决方案
- 自动应用修复
- 重试验证

**阶段 5：交付**
- 运行完整的质量门控（类型检查、代码检查、测试、构建）
- 审查规范合规性和代码质量
- 创建带有语义化消息的 git 提交
- 生成拉取请求

## 配置

Ralph-dev 可以通过环境变量进行配置：

### 环境变量

| 变量 | 用途 | 默认值 |
|------|------|--------|
| `CI` | 启用 CI 模式运行测试（非交互） | - |
| `RALPH_DEV_WORKSPACE` | 覆盖工作区目录 | `process.cwd()` |

### CI/CD 配置

对于 CI/CD 自动化，使用 `.ralph-dev/ci-config.yml`：

```yaml
ci_mode:
  enabled: true
  auto_approve_breakdown: true
  limits:
    max_tasks: 50
    max_total_time: "4h"
```

### Git 配置
将 `.ralph-dev/` 目录添加到 `.gitignore`：
```
.ralph-dev/state.json
.ralph-dev/progress.log
.ralph-dev/debug.log
```

提交任务定义和 PRD：
```
!.ralph-dev/prd.md
!.ralph-dev/tasks/
```

**注意：** Ralph-dev 在 Phase 2 中自动验证并修复 gitignore 配置。

## 故障排除

### 插件未加载
```bash
# 重新安装插件
/plugin uninstall ralph-dev
/plugin marketplace add mylukin/ralph-dev
/plugin install ralph-dev
/clear  # 清除会话并重启
```

### 找不到 CLI
```bash
# 验证全局安装
npm list -g ralph-dev

# 如需要则重新安装
npm install -g ralph-dev
```

### 更新市场
```bash
# 更新市场以获取最新版本
/plugin marketplace update mylukin/ralph-dev
/plugin update ralph-dev
```

### CLI 构建失败
```bash
# 验证 Node.js 版本
node --version  # 应该 >= 18.0.0
npm --version   # 应该 >= 9.0.0

# 手动构建
cd ~/.claude/plugins/ralph-dev/cli
npm install
npm run build
```

### 任务未进展
```bash
# 检查当前状态
ralph-dev state get

# 查看任务状态
ralph-dev tasks list

# 如果卡住则重置
ralph-dev state clear
```

## 贡献

我们欢迎贡献：

- **Bug 报告**: [GitHub Issues](https://github.com/mylukin/ralph-dev/issues)
- **功能请求**: [GitHub Discussions](https://github.com/mylukin/ralph-dev/discussions)
- **拉取请求**:
  1. Fork 仓库
  2. 创建功能分支
  3. 为新功能添加测试
  4. 使用语义化提交消息
  5. 提交带有描述的 PR

## 开发

### 运行测试
```bash
cd cli
npm test
```

### 构建 CLI
```bash
cd cli
npm install
npm run build
```

### 插件结构
- Commands：面向用户的入口点（`/ralph-dev`）
- Skills：AI 代理工作流（5 个阶段 + 编排器）
- Agents：自主专用代理（语言检测器）
- CLI：用于状态/任务管理的 TypeScript 二进制文件

## 许可证

MIT 许可证 - 详见 [LICENSE](LICENSE) 文件。

## 支持

- 📖 [技能文档](skills/)
- 🐛 [报告问题](https://github.com/mylukin/ralph-dev/issues)
- 💬 [讨论区](https://github.com/mylukin/ralph-dev/discussions)
- 🌐 [GitHub 仓库](https://github.com/mylukin/ralph-dev)

## 致谢

为 Claude Code 插件生态系统构建。需要 Claude Code CLI 才能运行。

---

**版本：** 0.4.3
**状态：** 活跃开发
**作者：** Lukin ([email protected])
