# ComfyUI 工作流调试器：调试 ComfyUI 工作流、报错与节点问题 (ComfyUI Workflow Debugger)

[🌐 English](README.md) | [🇨🇳 简体中文](README.zh.md)

**https://comfy-workflow-debugger.netlify.app/**

## 维护记录

| 维护日期 | 维护人 | 维护内容 | 备注/状态 |
| :--- | :--- | :--- | :--- |
| 2026-08-05 | Claude | 同步 ComfyUI 后端节点定义与 ComfyUI_frontend 派生类型（共 788 个节点，sourceMap 25 种类型/752 条，conversionMap 21 种类型/362 条） | 已同步且测试通过 |
| 2026-07-28 | Claude | 同步 ComfyUI 后端节点定义与 ComfyUI_frontend 派生类型（共 781 个节点，sourceMap 25 种类型/740 条，conversionMap 21 种类型/352 条） | 已同步且测试通过 |
| 2026-06-10 | Antigravity | 同步 ComfyUI 后端节点定义与 ComfyUI_frontend 派生类型（共 690 个节点，sourceMap 25 种类型，conversionMap 21 种类型） | 已同步且测试通过 |
| 2026-06-03 | Antigravity | 同步 ComfyUI 后端节点定义与 ComfyUI_frontend 派生类型（共 690 个节点，sourceMap 25 种类型，conversionMap 21 种类型） | 已同步且测试通过 |
| 2026-05-25 | Antigravity | 同步 ComfyUI 后端与 ComfyUI_frontend 节点定义及类型，更新 UploadPanel 静态分析提示文本 | 已同步且测试通过 |


**ComfyUI Workflow Debugger** 是一款免费了的、离线优先的浏览器端工具，专门用于解决您的 **ComfyUI 工作流损坏、图表加载失败和节点连接报错**。如果您的 ComfyUI 工作流无法执行、显示红色未安装节点、出现连线类型不匹配，或者抛出加载错误，本工具可以在不需要本地安装 ComfyUI 的情况下，立即为您诊断并修复 JSON 文件。

一款免费的、基于浏览器的工具，可用于检查您的 ComfyUI 工作流问题并自动修复它们 —— 无需安装 ComfyUI。非常适合进行 **ComfyUI 问题排查 (ComfyUI troubleshooting)**、**工作流分析 (workflow analysis)** 以及 **节点故障诊断 (node failure diagnosis)**。

## 截图与演示

![ComfyUI Workflow Debugger](<src/assets/ComfyUI Workflow Debugger-KL.png>)
*ComfyUI Workflow Debugger —— 诊断与自动修复面板*

<video src="https://github.com/kaili-yang/ComfyUI-Workflow-Debugger/raw/main/src/assets/workflow%20debugger%20intro%20video.mp4" controls width="800">
  您的浏览器不支持 video 标签，请查看
  <code>src/assets/workflow debugger intro video.mp4</code> 观看演示视频。
</video>

*快速演示：上传工作流、查看诊断结果、一键自动修复问题*

## 如何使用

**步骤 1 — 上传您的工作流**

打开应用程序并拖拽您的 ComfyUI 工作流 `.json` 文件，或点击浏览上传。支持标准图格式（*Save*）和 API 格式（*Save (API Format)*）。

**步骤 2 — 查看诊断**

该工具会立即扫描您的工作流并列出发现的所有问题（按严重程度分组）：阻止工作流运行的错误（Error）、可能导致意外结果的警告（Warning）以及提示信息（Info）。

**步骤 3 — 修复问题**

- 点击 **Fix All** 一键修复所有可修复的问题
- 或者，如果您想要更多控制，可以逐个类别进行修复

**步骤 4 — 下载修复后的工作流**

下载修复后的工作流 JSON 并将其重新加载到 ComfyUI 中。

**可选：** 连接到正在运行的 ComfyUI 实例，以同时检查特定于您的配置的缺失自定义节点和无效参数值。

---

## 场景诊断与使用案例 (Scenario-Based Diagnostics & Use Cases)

### ComfyUI 工作流调试 (ComfyUI Workflow Debugging)
*诊断工作流中的结构和连接流错误，使它们恢复平稳运行。*
- **损坏的连接** —— 指向已不存在的链接或节点的导线。
- **死循环** —— 节点之间会导致无法执行的循环依赖。
- **孤立节点** —— 对输出没有任何影响的无连接节点。

### ComfyUI 报错排查 (ComfyUI Error Troubleshooting)
*解决运行时崩溃、格式错误和错误配置的图表设置。*
- **无效参数值** —— 会在运行时导致错误的空值或超出范围的值。
- **无输出节点** —— 没有 Save Image 或其他输出节点的工作流，这会导致无法产生任何结果。
- **过期的文件引用** —— 指向已被移动或删除的文件路径的图像或视频路径。

### ComfyUI 节点故障诊断 (ComfyUI Node Failure Diagnosis)
*排查自定义节点、类型兼容性及节点状态。*
- **类型不匹配** —— 期望不同数据类型的节点之间的连接。
- **禁用的节点** —— 在其他节点仍依赖其输出时，被静音或旁路的节点。
- **缺失的自定义节点** *（需要连接服务器）* —— 在您的 ComfyUI 实例中未安装的节点类型。

---

## 自动修复

点击 **Fix** 可以一键自动修复所有可修复的问题：

- **移除损坏的连接** —— 清除悬空导线并重新映射可恢复的连接
- **重新启用禁用的节点** —— 恢复工作流仍需要的静音或旁路节点
- **插入类型转换器** —— 在不匹配的连接之间添加适当的转换节点，以使数据能正确流动
- **连接未连接的输入** —— 将可用的输出连接到没有插入任何东西的必填输入
- **重置无效值** —— 用安全默认值替换空值或 Null 参数值
- **恢复文件引用** —— 用占位测试数据替换缺失的文件路径，以便工作流可以运行

## 常见问题与排查指南 (FAQ & Common Troubleshooting Questions)

### 如何调试损坏的 ComfyUI 工作流？ (How to debug broken ComfyUI workflows?)
要调试损坏的 ComfyUI 工作流，请将您的工作流导出为 `.json` 文件（无论是标准格式还是 API 格式），然后将其拖入 **ComfyUI 工作流调试器** 中。该工具将在您的浏览器本地运行全面的静态分析，标记损坏的连接、类型不匹配和孤立节点，并允许您一键完成自动修复。

### 为什么我的 ComfyUI 工作流加载失败？ (Why does my ComfyUI graph fail to load?)
ComfyUI 工作流加载失败通常是因为 JSON 结构损坏、指向已删除节点的悬空导线，或者缺失自定义节点模式定义。通过将其加载到此调试器中，静态分析器可以绕过 ComfyUI 的常规加载门槛，直接检测出底层的结构性错误，并导出一个 ComfyUI 可以成功读取的修复版本。

### 如何在工作流中找到导致失败的节点？ (How to find the failing node in a workflow?)
当 ComfyUI 运行失败时，在庞大的工作流中手动寻找导致失败的具体节点是非常痛苦的。本调试器会按节点类型和 ID 分组列出所有的诊断错误，高亮显示类型不匹配的连线，并对导致整个执行链中断的禁用节点（Muted Nodes）向您发出警报。

---

## 节点模式更新

内置的节点定义直接源自 [官方 ComfyUI 仓库](https://github.com/comfyanonymous/ComfyUI) —— 这是 ComfyUI 自身使用的相同数据源。不包含任何二级或第三方数据。

ComfyUI 核心遵循每周发布周期（通常是周一）。本工具在 ComfyUI 发布后的每周二同步内置节点定义。如果 ComfyUI 延迟发布，此处的定义更新也会相应延迟。

为了始终针对您 ComfyUI 实例中安装的确切节点进行检查，请将工具连接到您正在运行缺陷检查的 ComfyUI 服务器 —— 这将完全绕过内置定义。

---

## 开源贡献指南 (Contributing)

感谢你关注并愿意为 **ComfyUI Workflow Debugger** 做出贡献！  
我们欢迎社区提交缺陷报告、功能建议、文档改进与 Pull Request——这与 [Vue](https://github.com/vuejs/core/blob/main/.github/contributing.md)、[Vite](https://github.com/vitejs/vite/blob/main/CONTRIBUTING.md)、[Node.js](https://github.com/nodejs/node/blob/main/CONTRIBUTING.md) 等知名开源项目的协作方式一致。

> 英文版逐步流程见 [`CONTRIBUTING.md`](./CONTRIBUTING.md)。

### 行为准则 (Code of Conduct)

参与本项目即表示你同意以尊重的方式与他人协作。  
任何骚扰、歧视或敌对行为都不可接受。  
若遇到不当行为，请通过 [GitHub Issues](https://github.com/kaili-yang/ComfyUI-Workflow-Debugger/issues) 私下联系维护者，或联系 [Kaili Yang](https://github.com/kaili-yang)。

### 你可以贡献的方向

| 类型 | 示例 |
| --- | --- |
| **缺陷修复** | 错误的分析结果、界面异常、不正确的自动修复 |
| **新功能** | 新的诊断项、新的自动修复策略、体验优化 |
| **文档** | README、指南、注释、翻译 |
| **Schema 同步** | 与官方 ComfyUI 内置节点定义保持一致 |
| **测试与样例** | 在 `test data/`、`workflow/` 中补充可复现问题的样例工作流 |

不知道从哪开始？浏览 [open issues](https://github.com/kaili-yang/ComfyUI-Workflow-Debugger/issues)，优先查看 `good first issue`、`help wanted` 等标签。

### 本地开发环境

**前置要求：** Node.js 20+（或当前 LTS）与 [pnpm](https://pnpm.io/)。

```bash
git clone git@github.com:kaili-yang/ComfyUI-Workflow-Debugger.git
cd ComfyUI-Workflow-Debugger
pnpm install
pnpm dev          # http://localhost:5177/
```

常用命令：

```bash
pnpm build        # 类型检查 + 生产构建
pnpm preview      # 预览生产构建
```

技术栈：**Vue 3 + TypeScript + Vite + Tailwind CSS**。  
静态分析与自动修复逻辑在 `src/lib/`（纯函数）；界面在 `src/components/`。

### 分支与 Pull Request 流程

1. **Fork** 本仓库，并 clone 你的 fork。
2. 从 `main` 创建主题分支：
   ```bash
   git checkout -b fix/describe-your-change
   # 或
   git checkout -b feat/describe-your-change
   ```
3. 保持提交聚焦，尽量让一个 PR 只做一件事。
4. 提交前确认可以构建：`pnpm build`。
5. 推送分支，并向  
   [kaili-yang/ComfyUI-Workflow-Debugger](https://github.com/kaili-yang/ComfyUI-Workflow-Debugger) 的 `main` 发起 **Pull Request**。
6. 在 PR 中说明：**改了什么、为什么、如何验证**。
7. 根据 review 反馈继续修改，维护者确认后合并。

#### Pull Request 检查清单

- [ ] 解决真实问题，或带来明确价值
- [ ] 尽量把 UI 改动与分析/修复逻辑改动分开
- [ ] 新诊断放在 `src/lib/checks/`，并保持 **纯函数**（不修改输入）
- [ ] 新自动修复放在 `src/lib/fixes/`，并在对应 issue 上设置 `fixable: true`
- [ ] 保持 `fixer.ts` 中的修复顺序（`fixGhostLinks` 必须在 `fixLinkTypeMetadata` 之前）
- [ ] 不要提交密钥、API Key 或含隐私路径的工作流
- [ ] `pnpm build` 通过

### 编码约定

- 同一 PR 内避免无关的大范围重构；优先清晰、小范围的改动。
- Vue 组件不要塞分析逻辑；检查与修复放到 `src/lib/`。
- 复用 `src/types/workflow.ts` 中已有类型。
- 跟随周边代码的命名与格式；不要顺手格式化无关文件。
- Check：返回 `Issue[]`，不要突变 `GraphAnalysisContext`。
- Fix：接收已克隆的工作流对象，返回修改数量（或结构化结果）。

更详细的 check/fix 扩展说明见 [`CLAUDE.md`](./CLAUDE.md)。

### Commit 信息

使用简短、祈使语气的标题（接近 Conventional Commits）：

```
feat: detect stale media refs in API-format workflows
fix: correct link type metadata after ghost-link removal
docs: clarify contribution workflow
chore: sync node schema from latest ComfyUI backend
style: polish Step 2 empty-state minimap
```

- 若希望出现在 GitHub 贡献墙，commit 的 **author email** 必须是 GitHub 账号已验证的邮箱（本仓库维护者使用：`Kelly Yang <124ykl@gmail.com>`）。
- 不要在 commit message 中写入密钥或个人隐私。

### 报告缺陷

请在 Issue 中包含：

1. **ComfyUI Workflow Debugger** 版本 / commit（或线上 Netlify 构建时间）
2. 浏览器与操作系统
3. 使用的是 **离线分析** 还是已 **连接 ComfyUI 服务器**
4. 可复现问题的 **最小工作流 JSON**（请脱敏隐私路径）
5. 期望行为 vs 实际行为（截图更好）

### 功能建议

请在 Issue 中说明：

- 用户遇到的问题（而不仅是设想的方案）
- 你希望如何验收该功能
- 是否依赖连接 ComfyUI 服务器

### 许可证 (License)

本项目以 **[GNU Affero General Public License v3.0 only](https://www.gnu.org/licenses/agpl-3.0.html)**（`AGPL-3.0-only`）发布，详见 `package.json`。

提交贡献（包括补丁、Pull Request、文档）即表示你同意将该贡献以相同的 AGPL-3.0-only 条款授权，并且你有权以该条款提交。

### 维护者与联系方式

- **作者 / 维护者：** [Kaili Yang](https://github.com/kaili-yang)（`Kelly Yang <124ykl@gmail.com>`）
- **仓库：** [github.com/kaili-yang/ComfyUI-Workflow-Debugger](https://github.com/kaili-yang/ComfyUI-Workflow-Debugger)
- **在线演示：** [comfy-workflow-debugger.netlify.app](https://comfy-workflow-debugger.netlify.app/)

非缺陷、非功能类的问题也可以开 Issue（请使用清晰标题）。无论贡献大小，我们都非常感谢。
