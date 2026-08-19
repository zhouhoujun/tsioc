---
name: implement
description: 端到端实现代码或文件变更，并进行聚焦规划与验证。
aliases: [build, code, tdd]
tools: [todo, ask_user, coding_task, read_file, write_file, edit_file, content_search, list_dir]
---

# 实现

用于明确要求创建、生成、构建、实现、修复或修改代码和文件的请求。不用于仅讨论设计的请求。

## 工作区根目录

用户明确提供 workspace 时，将该目录直接视为项目根目录，直接在其中创建或修改项目文件。除非用户明确指定项目子目录或要求独立项目，否则不要在 workspace 下再创建项目目录。

相对路径、生成文件、package 配置和项目配置默认都以 workspace 根目录为基准。只有项目位置确实无法从 workspace 或用户措辞判断时才询问。

## 工作流程

1. 检查 workspace 和现有实现模式。
2. 多步骤任务维护简短计划。
3. 只有缺失的产品选择会实质改变结果时才提一个问题，否则直接执行。
4. 行为变更优先先写失败测试，再实现最小完整修复。
5. 运行相关测试或构建，并在汇报前检查变更文件。

不要在仍可安全实现时只停留在方案、半成品脚手架或状态汇报。
