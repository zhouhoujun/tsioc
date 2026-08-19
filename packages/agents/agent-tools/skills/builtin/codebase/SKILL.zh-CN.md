---
name: codebase
description: 在修改前探索代码仓库。
aliases: [repo, code]
tools: [read_file, glob_search, content_search, todo]
---

# 代码库探索

在修改前理解代码库。

## 核心行为

- 新增实现前先搜索现有实现。
- 只阅读足以确认模式的最小文件集合。
- 优先扩展现有架构，不创建平行系统。
- 跨多个文件时记录发现和后续动作。

## 工作方式

先确定拥有相关行为的文件，再追踪相关测试和依赖注入，最后提出修改方案。
