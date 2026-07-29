import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { AgentContextManager } from '../src/context/AgentContextManager';
import { LLMSessionSummarizer } from '../src/memory/LLMSessionSummarizer';
import { SimpleSessionSummarizer } from '../src/memory/SimpleSessionSummarizer';
import { SessionSummarizer } from '../src/memory/SessionSummarizer';
import { EchoModelAdapter } from '../src/model/EchoModelAdapter';
import { AgentMessage } from '../src/runtime/AgentMessage';

@Suite('Agent context compaction')
export class ContextCompactionTest {
    private makeMessages(count: number): AgentMessage[] {
        const messages: AgentMessage[] = [];
        for (let i = 0; i < count; i++) {
            messages.push({
                id: `m${i}`,
                role: 'assistant',
                content: `This is test message number ${i} with some content that takes up space.`,
                createdAt: Date.now() + i
            });
        }
        return messages;
    }

    private makeLongMessages(count: number): AgentMessage[] {
        const messages: AgentMessage[] = [];
        for (let i = 0; i < count; i++) {
            messages.push({
                id: `m${i}`,
                role: 'assistant',
                content: `Step ${i}: Refactored the authentication module to support OAuth2.0 and JWT token refresh. Moved hardcoded secrets from src/auth/login.ts to environment variables. Added rate limiting middleware to the login endpoint. Updated tests for coverage.`,
                createdAt: Date.now() + i
            });
        }
        return messages;
    }

    private makeToolMessages(count: number): AgentMessage[] {
        const messages: AgentMessage[] = [];
        messages.push({
            id: 'sys',
            role: 'system',
            content: 'You are a helpful coding agent with access to file operations, git, and shell tools.',
            createdAt: 1
        });
        for (let i = 0; i < count; i++) {
            messages.push({
                id: `u${i}`,
                role: 'user',
                content: `Refactor the authentication module to support OAuth2.0 and JWT token refresh. The current implementation in src/auth/login.ts uses a hardcoded secret which needs to be moved to environment variables. Also add rate limiting middleware to the login endpoint.`,
                createdAt: Date.now() + i * 3
            });
            messages.push({
                id: `a${i}`,
                role: 'assistant',
                content: `I'll look into the auth module and plan the refactoring. First, let me examine the current structure.`,
                createdAt: Date.now() + i * 3 + 1,
                metadata: {
                    toolCalls: [{ id: `tc${i}`, name: 'read_file' }]
                }
            });
            messages.push({
                id: `t${i}`,
                role: 'tool',
                name: 'read_file',
                toolCallId: `tc${i}`,
                content: `{"files": ["src/auth/login.ts", "src/auth/middleware.ts", "src/config/env.ts"]}`,
                createdAt: Date.now() + i * 3 + 2
            });
        }
        return messages;
    }

    @Test('shouldCompact returns false when threshold is 0')
    async shouldCompactDisabled() {
        const ctx = new AgentContextManager();
        ctx.configure({ maxHistoryTokens: 32000 });
        expect(ctx.shouldCompact([])).toEqual(false);
        expect(ctx.shouldCompact(this.makeMessages(100))).toEqual(false);
    }

    @Test('shouldCompact returns false when messages are below threshold')
    async shouldCompactBelowThreshold() {
        const ctx = new AgentContextManager();
        ctx.configure({ maxHistoryTokens: 32000 });
        ctx.setSummarizer(new SimpleSessionSummarizer(), 50);
        expect(ctx.shouldCompact(this.makeMessages(10))).toEqual(false);
        expect(ctx.shouldCompact(this.makeMessages(49))).toEqual(false);
    }

    @Test('shouldCompact returns false when message threshold is met but token footprint is still small')
    async shouldCompactDefersSmallHistory() {
        const ctx = new AgentContextManager();
        ctx.configure({ maxHistoryTokens: 32000, compactionMinTokens: 1000 });
        ctx.setSummarizer(new SimpleSessionSummarizer(), 5);
        expect(ctx.shouldCompact(this.makeMessages(10))).toEqual(false);
    }

    @Test('shouldCompact returns true when messages exceed threshold')
    async shouldCompactAboveThreshold() {
        const ctx = new AgentContextManager();
        ctx.configure({ maxHistoryTokens: 32000, compactionMinTokens: 100 });
        ctx.setSummarizer(new SimpleSessionSummarizer(), 5);
        expect(ctx.shouldCompact(this.makeMessages(10))).toEqual(true);
        expect(ctx.shouldCompact(this.makeMessages(5))).toEqual(true);
    }

    @Test('compactHistory returns unchanged when threshold not met')
    async compactNotTriggered() {
        const ctx = new AgentContextManager();
        ctx.configure({ maxHistoryTokens: 32000 });
        ctx.setSummarizer(new SimpleSessionSummarizer(), 20);
        const messages = this.makeMessages(5);
        const result = await ctx.compactHistory(messages);
        expect(result.length).toEqual(5);
        expect(result).toBe(messages);
    }

    @Test('compactHistory returns unchanged when no summarizer set')
    async compactNoSummarizer() {
        const ctx = new AgentContextManager();
        ctx.configure({ maxHistoryTokens: 32000 });
        const messages = this.makeMessages(20);
        const result = await ctx.compactHistory(messages);
        expect(result.length).toEqual(20);
        expect(result).toBe(messages);
    }

    @Test('prepareHistory compacts older tool output summaries before full history pruning is needed')
    async prepareHistoryCompactsOlderToolOutput() {
        const ctx = new AgentContextManager();
        ctx.configure({ maxHistoryTokens: 32000, maxToolResults: 8000, recentMessageWindow: 2, compactionMinTokens: 1000 });
        ctx.setSummarizer(new SimpleSessionSummarizer(), 50);
        const largeToolPayload = JSON.stringify({
            path: '.',
            entries: Array.from({ length: 12 }, (_, index) => ({ name: `feature-${index + 1}.ts`, path: `src/feature-${index + 1}.ts` })),
            truncated: true
        });
        const messages: AgentMessage[] = [
            { id: 'sys', role: 'system', content: 'You are a coding agent.', createdAt: 1 },
            { id: 'u1', role: 'user', content: 'Inspect the workspace and continue the migration plan.', createdAt: 2 },
            {
                id: 't1',
                role: 'tool',
                name: 'list_dir',
                content: largeToolPayload,
                createdAt: 3,
                metadata: {
                    receipt: {
                        outputSummary: '. · 12 entries · src/feature-1.ts, src/feature-2.ts, src/feature-3.ts +9 more · truncated'
                    }
                }
            },
            { id: 'a1', role: 'assistant', content: 'I found the relevant files and will keep refining the migration.', createdAt: 4 },
            { id: 'u2', role: 'user', content: '继续', createdAt: 5 }
        ];

        const prepared = await ctx.prepareHistory(messages);
        const toolMessage = prepared.messages.find(message => message.id === 't1');

        expect(prepared.report.strategy).toEqual('pruned');
        expect(prepared.report.toolMessagesCompacted).toEqual(1);
        expect(toolMessage?.content).toContain('[summary]');
        expect(toolMessage?.content).toContain('12 entries');
        expect(toolMessage?.content.length).toBeLessThan(messages[2].content.length);
    }

    @Test('compactHistory returns messages when old section is small')
    async compactSmallOldSection() {
        const ctx = new AgentContextManager();
        ctx.configure({ maxHistoryTokens: 32000 });
        ctx.setSummarizer(new SimpleSessionSummarizer(), 2);
        const messages = this.makeMessages(3);
        const result = await ctx.compactHistory(messages);
        expect(result.length).toEqual(3);
    }

    @Test('compactHistory produces a system summary message for large history')
    async compactProducesSummary() {
        class RecordingSummarizer extends SessionSummarizer {
            lastMessages: AgentMessage[] = [];
            async summarize(messages: AgentMessage[]): Promise<string> {
                this.lastMessages = messages;
                return 'The user made several requests about refactoring. Key files modified: /src/app.ts.';
            }
        }
        const summarizer = new RecordingSummarizer();
        const ctx = new AgentContextManager();
        ctx.configure({ maxHistoryTokens: 32000, compactionMinTokens: 200 });
        ctx.setSummarizer(summarizer, 3);
        const messages = this.makeToolMessages(8);

        const result = await ctx.compactHistory(messages);

        expect(result).not.toBe(messages);
        expect(result.some(m => m.role === 'system' && m.content.includes('Context Summary'))).toEqual(true);
        expect(result.filter(m => m.role === 'system').length).toBeGreaterThanOrEqual(1);
        const recent = result.filter(m => m.id?.startsWith('u') || m.id?.startsWith('a') || m.id?.startsWith('t'));
        expect(recent.length).toBeGreaterThan(0);
        expect(result.some(m => m.id === 'u0')).toEqual(true);
        expect(result.some(m => m.id === 'a0')).toEqual(false);
    }

    @Test('compactHistory respects configurable recent message window')
    async compactRespectsRecentMessageWindow() {
        class RecordingSummarizer extends SessionSummarizer {
            async summarize(_messages: AgentMessage[]): Promise<string> {
                return 'Compressed conversation history.';
            }
        }
        const ctx = new AgentContextManager();
        ctx.configure({ maxHistoryTokens: 32000, compactionMinTokens: 200, recentMessageWindow: 2 });
        ctx.setSummarizer(new RecordingSummarizer(), 3);
        const messages: AgentMessage[] = [
            { id: 'sys', role: 'system', content: 'You are a coding agent.', createdAt: 1 },
            { id: 'a-1', role: 'assistant', content: 'First long answer '.repeat(20), createdAt: 2 },
            { id: 'a-2', role: 'assistant', content: 'Second long answer '.repeat(20), createdAt: 3 },
            { id: 'a-3', role: 'assistant', content: 'Third long answer '.repeat(20), createdAt: 4 },
            { id: 'a-4', role: 'assistant', content: 'Fourth long answer '.repeat(20), createdAt: 5 }
        ];

        const result = await ctx.compactHistory(messages);

        expect(result.some(message => message.id === 'a-1')).toEqual(false);
        expect(result.some(message => message.id === 'a-2')).toEqual(false);
        expect(result.some(message => message.id === 'a-3')).toEqual(true);
        expect(result.some(message => message.id === 'a-4')).toEqual(true);
        expect(result.some(message => message.role === 'system' && message.content.includes('Context Summary'))).toEqual(true);
    }

    @Test('compactHistory keeps tool call pairs intact when recent window starts inside a tool exchange')
    async compactKeepsRecentToolCallPairsIntact() {
        class RecordingSummarizer extends SessionSummarizer {
            async summarize(_messages: AgentMessage[]): Promise<string> {
                return 'Compressed conversation history.';
            }
        }
        const ctx = new AgentContextManager();
        ctx.configure({ maxHistoryTokens: 32000, compactionMinTokens: 120, recentMessageWindow: 2 });
        ctx.setSummarizer(new RecordingSummarizer(), 4);
        const messages: AgentMessage[] = [
            { id: 'sys', role: 'system', content: 'You are a coding agent.', createdAt: 1 },
            { id: 'u1', role: 'user', content: 'Inspect the repository and continue the refactor plan.'.repeat(6), createdAt: 2 },
            { id: 'a1', role: 'assistant', content: 'I will scan the workspace structure first.'.repeat(6), createdAt: 3 },
            {
                id: 'a2',
                role: 'assistant',
                content: 'I am listing the relevant source files now.',
                createdAt: 4,
                metadata: {
                    toolCalls: [{ id: 'tc-list', name: 'list_dir' }]
                }
            },
            {
                id: 't2',
                role: 'tool',
                name: 'list_dir',
                toolCallId: 'tc-list',
                content: JSON.stringify({
                    path: 'src',
                    entries: ['src/app.ts', 'src/runtime.ts', 'src/router.ts']
                }),
                createdAt: 5,
                metadata: {
                    receipt: {
                        outputSummary: 'src · 3 entries · src/app.ts, src/runtime.ts, src/router.ts'
                    }
                }
            },
            { id: 'a3', role: 'assistant', content: 'Next I will patch the router branch.'.repeat(6), createdAt: 6 }
        ];

        const result = await ctx.compactHistory(messages);

        expect(result.some(message => message.id === 'a2')).toEqual(true);
        expect(result.some(message => message.id === 't2')).toEqual(true);
        expect(result.some(message => message.role === 'system' && message.content.includes('Context Summary'))).toEqual(true);
    }

    @Test('compactHistory preserves the latest substantive user request outside the recent window')
    async compactPreservesLatestSubstantiveUserRequest() {
        class RecordingSummarizer extends SessionSummarizer {
            async summarize(_messages: AgentMessage[]): Promise<string> {
                return 'Compressed conversation history.';
            }
        }
        const ctx = new AgentContextManager();
        ctx.configure({ maxHistoryTokens: 32000, compactionMinTokens: 200 });
        ctx.setSummarizer(new RecordingSummarizer(), 4);
        const longGoal = '设计一个跨平台在线考试系统，并给出数据库表设计、接口设计、权限模型、部署架构和监考流程。'.repeat(6);
        const longReply = '这里继续补充系统设计细节，包括模块拆分、调用链路、边界条件、失败恢复和可观测性方案。'.repeat(5);
        const messages: AgentMessage[] = [
            { id: 'sys', role: 'system', content: 'You are a coding agent.', createdAt: 1 },
            { id: 'u-goal', role: 'user', content: longGoal, createdAt: 2 },
            { id: 'a-1', role: 'assistant', content: longReply, createdAt: 3 },
            { id: 'u-2', role: 'user', content: '继续', createdAt: 4 },
            { id: 'a-2', role: 'assistant', content: longReply, createdAt: 5 },
            { id: 'u-3', role: 'user', content: '继续', createdAt: 6 },
            { id: 'a-3', role: 'assistant', content: longReply, createdAt: 7 },
            { id: 'u-4', role: 'user', content: '继续', createdAt: 8 },
            { id: 'a-4', role: 'assistant', content: longReply, createdAt: 9 },
            { id: 'u-5', role: 'user', content: '继续', createdAt: 10 },
            { id: 'a-5', role: 'assistant', content: longReply, createdAt: 11 },
            { id: 'u-6', role: 'user', content: '继续', createdAt: 12 },
            { id: 'a-6', role: 'assistant', content: longReply, createdAt: 13 }
        ];

        const result = await ctx.compactHistory(messages);

        expect(result.some(message => message.id === 'u-goal')).toEqual(true);
        expect(result.some(message => message.role === 'system' && message.content.includes('Context Summary'))).toEqual(true);
        expect(result.some(message => message.id === 'u-2')).toEqual(false);
    }

    @Test('compactHistory preserves the root goal together with later substantive follow-up')
    async compactPreservesRootGoalAndFollowUpGoal() {
        class RecordingSummarizer extends SessionSummarizer {
            async summarize(_messages: AgentMessage[]): Promise<string> {
                return 'Compressed conversation history.';
            }
        }
        const ctx = new AgentContextManager();
        ctx.configure({ maxHistoryTokens: 32000, compactionMinTokens: 200 });
        ctx.setSummarizer(new RecordingSummarizer(), 4);
        const rootGoal = '设计一个跨平台在线考试系统，并给出数据库表设计、接口设计、权限模型、部署架构和监考流程。'.repeat(4);
        const followUpGoal = '补充项目主线、项目索引和跨会话聚合策略。'.repeat(6);
        const longReply = '继续补充系统主线、阶段拆分、任务恢复和跨会话聚合实现细节。'.repeat(8);
        const messages: AgentMessage[] = [
            { id: 'sys', role: 'system', content: 'You are a coding agent.', createdAt: 1 },
            { id: 'u-root', role: 'user', content: rootGoal, createdAt: 2 },
            { id: 'a-1', role: 'assistant', content: longReply, createdAt: 3 },
            { id: 'u-2', role: 'user', content: '继续', createdAt: 4 },
            { id: 'a-2', role: 'assistant', content: longReply, createdAt: 5 },
            { id: 'u-follow', role: 'user', content: followUpGoal, createdAt: 6 },
            { id: 'a-3', role: 'assistant', content: longReply, createdAt: 7 },
            { id: 'u-4', role: 'user', content: '继续', createdAt: 8 },
            { id: 'a-4', role: 'assistant', content: longReply, createdAt: 9 },
            { id: 'u-5', role: 'user', content: '继续', createdAt: 10 },
            { id: 'a-5', role: 'assistant', content: longReply, createdAt: 11 }
        ];

        const result = await ctx.compactHistory(messages);

        expect(result.some(message => message.id === 'u-root')).toEqual(true);
        expect(result.some(message => message.id === 'u-follow')).toEqual(true);
        expect(result.some(message => message.id === 'u-2')).toEqual(false);
        expect(result.some(message => message.role === 'system' && message.content.includes('Context Summary'))).toEqual(true);
    }

    @Test('compactHistory preserves the latest error context outside the recent window')
    async compactPreservesLatestErrorContext() {
        class RecordingSummarizer extends SessionSummarizer {
            async summarize(_messages: AgentMessage[]): Promise<string> {
                return 'Compressed conversation history.';
            }
        }
        const ctx = new AgentContextManager();
        ctx.configure({ maxHistoryTokens: 32000, compactionMinTokens: 200 });
        ctx.setSummarizer(new RecordingSummarizer(), 4);
        const longGoal = '修复 agent 长消息上下文丢失问题，并确保多轮继续后仍能保留任务目标、失败原因和后续待办。'.repeat(5);
        const longReply = '继续补充修复方案，包含消息折叠、压缩策略、错误保留和会话主线恢复逻辑。'.repeat(5);
        const messages: AgentMessage[] = [
            { id: 'sys', role: 'system', content: 'You are a coding agent.', createdAt: 1 },
            { id: 'u-goal', role: 'user', content: longGoal, createdAt: 2 },
            { id: 'a-1', role: 'assistant', content: longReply, createdAt: 3 },
            {
                id: 't-error',
                role: 'tool',
                name: 'project_intel',
                toolCallId: 'tc-error',
                content: '{"error":"Tool \\"project_intel\\" input validation failed: $.action is required"}',
                createdAt: 4,
                metadata: {
                    error: 'Tool "project_intel" input validation failed: $.action is required',
                    receipt: { status: 'error', error: 'Tool "project_intel" input validation failed: $.action is required' }
                }
            },
            { id: 'u-2', role: 'user', content: '继续', createdAt: 5 },
            { id: 'a-2', role: 'assistant', content: longReply, createdAt: 6 },
            { id: 'u-3', role: 'user', content: '继续', createdAt: 7 },
            { id: 'a-3', role: 'assistant', content: longReply, createdAt: 8 },
            { id: 'u-4', role: 'user', content: '继续', createdAt: 9 },
            { id: 'a-4', role: 'assistant', content: longReply, createdAt: 10 },
            { id: 'u-5', role: 'user', content: '继续', createdAt: 11 },
            { id: 'a-5', role: 'assistant', content: longReply, createdAt: 12 },
            { id: 'u-6', role: 'user', content: '继续', createdAt: 13 },
            { id: 'a-6', role: 'assistant', content: longReply, createdAt: 14 }
        ];

        const result = await ctx.compactHistory(messages);

        expect(result.some(message => message.id === 't-error')).toEqual(true);
        expect(result.some(message => message.role === 'system' && message.content.includes('Context Summary'))).toEqual(true);
    }

    @Test('compactHistory preserves the latest stateful tool result outside the recent window')
    async compactPreservesLatestStatefulToolResult() {
        class RecordingSummarizer extends SessionSummarizer {
            async summarize(_messages: AgentMessage[]): Promise<string> {
                return 'Compressed conversation history.';
            }
        }
        const ctx = new AgentContextManager();
        ctx.configure({ maxHistoryTokens: 32000, compactionMinTokens: 200 });
        ctx.setSummarizer(new RecordingSummarizer(), 4);
        const longGoal = '补齐多 worker 结果聚合，并在上下文压缩后保留关键任务状态。'.repeat(8);
        const longReply = '继续补充 review、worker report 和跨会话聚合细节。'.repeat(10);
        const messages: AgentMessage[] = [
            { id: 'sys', role: 'system', content: 'You are a coding agent.', createdAt: 1 },
            { id: 'u-goal', role: 'user', content: longGoal, createdAt: 2 },
            { id: 'a-1', role: 'assistant', content: longReply, createdAt: 3 },
            {
                id: 't-state',
                role: 'tool',
                name: 'coding_task',
                toolCallId: 'tc-state',
                content: JSON.stringify({
                    task: {
                        id: 'task-1',
                        title: 'Review task',
                        status: 'completed',
                        actions: [{ id: 'edit-1' }],
                        result: {
                            workers: [{ workerId: 'worker-1' }, { workerId: 'worker-2' }],
                            report: {
                                summary: '2 worker diff(s) captured',
                                nextSteps: ['review diff', 'verify changes'],
                                artifacts: ['diff', 'checkpoint:checkpoint-task-1']
                            }
                        }
                    }
                }),
                createdAt: 4
            },
            { id: 'u-2', role: 'user', content: '继续', createdAt: 5 },
            { id: 'a-2', role: 'assistant', content: longReply, createdAt: 6 },
            { id: 'u-3', role: 'user', content: '继续', createdAt: 7 },
            { id: 'a-3', role: 'assistant', content: longReply, createdAt: 8 },
            { id: 'u-4', role: 'user', content: '继续', createdAt: 9 },
            { id: 'a-4', role: 'assistant', content: longReply, createdAt: 10 },
            { id: 'u-5', role: 'user', content: '继续', createdAt: 11 },
            { id: 'a-5', role: 'assistant', content: longReply, createdAt: 12 },
            { id: 'u-6', role: 'user', content: '继续', createdAt: 13 },
            { id: 'a-6', role: 'assistant', content: longReply, createdAt: 14 }
        ];

        const result = await ctx.compactHistory(messages);

        expect(result.some(message => message.id === 't-state')).toEqual(true);
        expect(result.some(message => message.role === 'system' && message.content.includes('Context Summary'))).toEqual(true);
    }

    @Test('compactHistory falls back to pruneHistory when summarizer fails')
    async compactFallsBackOnError() {
        class FailingSummarizer extends SessionSummarizer {
            async summarize(_messages: AgentMessage[]): Promise<string> {
                throw new Error('summarization failed');
            }
        }
        const ctx = new AgentContextManager();
        ctx.configure({ maxHistoryTokens: 100 });
        ctx.setSummarizer(new FailingSummarizer(), 2);
        const messages = this.makeLongMessages(20);
        const result = await ctx.compactHistory(messages);
        expect(result.length).toBeLessThan(20);
        expect(result.length).toBeGreaterThan(0);
    }

    @Test('pruneHistory replaces oversized tool output with compact summary')
    async pruneHistoryCompactsLargeToolOutput() {
        const ctx = new AgentContextManager();
        ctx.configure({ maxHistoryTokens: 200, maxToolResults: 80 });
        const messages: AgentMessage[] = [
            { id: 'sys', role: 'system', content: 'You are a coding agent.', createdAt: 1 },
            { id: 'u1', role: 'user', content: 'Inspect the workspace.', createdAt: 2 },
            {
                id: 't1',
                role: 'tool',
                name: 'list_dir',
                content: JSON.stringify({
                    path: '.',
                    entries: Array.from({ length: 12 }, (_, index) => ({ name: `file-${index + 1}.ts`, path: `src/file-${index + 1}.ts` })),
                    truncated: true
                }),
                createdAt: 3,
                metadata: {
                    receipt: {
                        outputSummary: '. · 12 entries · src/file-1.ts, src/file-2.ts, src/file-3.ts +9 more · truncated'
                    }
                }
            },
            { id: 'a1', role: 'assistant', content: 'I found the files.', createdAt: 4 }
        ];

        const result = ctx.pruneHistory(messages);
        const toolMessage = result.find(message => message.id === 't1');

        expect(toolMessage?.content).toContain('[summary]');
        expect(toolMessage?.content).toContain('12 entries');
        expect(toolMessage?.content.length).toBeLessThan(messages[2].content.length);
    }

    @Test('compactHistory produces smaller result than pruneHistory')
    async compactSavesTokens() {
        class CompressingSummarizer extends SessionSummarizer {
            async summarize(_messages: AgentMessage[]): Promise<string> {
                return 'Compressed summary of the conversation history with key decisions.';
            }
        }
        const ctx = new AgentContextManager();
        ctx.configure({ maxHistoryTokens: 32000 });
        ctx.setSummarizer(new CompressingSummarizer(), 3);
        const messages = this.makeToolMessages(8);

        const compacted = await ctx.compactHistory(messages);
        const pruned = ctx.pruneHistory(messages);

        const compactedTokens = ctx.estimateMessages(compacted);
        const prunedTokens = ctx.estimateMessages(pruned);
        expect(compactedTokens).toBeLessThanOrEqual(prunedTokens);
    }

    @Test('LLMSessionSummarizer formats messages with tool metadata')
    async llmFormatsMessagesWithToolMetadata() {
        const messages: AgentMessage[] = [
            { id: '1', role: 'user', content: 'Fix the bug in app.ts', createdAt: 1 },
            {
                id: '2',
                role: 'assistant',
                content: 'Let me check the file.',
                createdAt: 2,
                metadata: { toolCalls: [{ id: 'tc1', name: 'read_file' }] }
            },
            {
                id: '3',
                role: 'tool',
                name: 'read_file',
                toolCallId: 'tc1',
                content: 'file content here',
                createdAt: 3
            }
        ];

        const adapter = new EchoModelAdapter();
        const summarizer = new LLMSessionSummarizer(adapter);
        const result = await summarizer.summarize(messages);
        expect(result).toBeTruthy();
        expect(result.length).toBeLessThan(500);
    }

    @Test('LLMSessionSummarizer prefers concise tool summaries over raw payloads')
    async llmPrefersToolSummaries() {
        const messages: AgentMessage[] = [
            { id: '1', role: 'user', content: 'Inspect the workspace layout.', createdAt: 1 },
            {
                id: '2',
                role: 'tool',
                name: 'list_dir',
                content: JSON.stringify({
                    path: '.',
                    entries: Array.from({ length: 10 }, (_, index) => ({ name: `feature-${index + 1}.ts`, path: `src/feature-${index + 1}.ts` }))
                }),
                createdAt: 2,
                metadata: {
                    receipt: {
                        outputSummary: '. · 10 entries · src/feature-1.ts, src/feature-2.ts, src/feature-3.ts +7 more'
                    }
                }
            }
        ];

        const adapter = new EchoModelAdapter();
        const summarizer = new LLMSessionSummarizer(adapter);
        const result = await summarizer.summarize(messages);

        expect(result).toContain('Inspect the workspace layout');
        expect(result).toContain('10 entries');
        expect(result).not.toContain('"entries"');
    }

    @Test('LLMSessionSummarizer normalizes model output into fixed summary labels')
    async llmNormalizesStructuredSummaryShape() {
        const messages: AgentMessage[] = [
            { id: '1', role: 'user', content: 'Fix routing in src/app.ts and preserve the current task goal.', createdAt: 1 },
            {
                id: '2',
                role: 'tool',
                name: 'project_intel',
                content: '{"error":"Tool \\"project_intel\\" input validation failed: $.action is required"}',
                createdAt: 2,
                metadata: {
                    error: 'Tool "project_intel" input validation failed: $.action is required'
                }
            },
            { id: '3', role: 'assistant', content: 'Next I will inspect the router flow and patch the failing branch.', createdAt: 3 }
        ];

        const summarizer = new LLMSessionSummarizer(new StaticSummaryModelAdapter(
            'We should fix routing in src/app.ts. The next step is to inspect the router flow and patch the failing branch.'
        ) as any);
        const result = await summarizer.summarize(messages);

        expect(result).toContain('Goal:');
        expect(result).toContain('Decisions:');
        expect(result).toContain('Files:');
        expect(result).toContain('Errors:');
        expect(result).toContain('Open state:');
        expect(result).toContain('src/app.ts');
        expect(result).toContain('project_intel');
    }

    @Test('LLMSessionSummarizer keeps multiline content under the active summary label')
    async llmNormalizesMultilineStructuredSummaryShape() {
        const messages: AgentMessage[] = [
            { id: '1', role: 'user', content: 'Preserve the task goal and fix routing in src/app.ts.', createdAt: 1 },
            { id: '2', role: 'assistant', content: 'I will inspect the failing router branch and patch it.', createdAt: 2 }
        ];

        const summarizer = new LLMSessionSummarizer(new StaticSummaryModelAdapter(
            [
                'Goal: Fix routing in src/app.ts.',
                'Keep the current task goal visible during compaction.',
                'Decisions: Inspect the router branch first.',
                'Then patch the failing path and rerun checks.',
                'Files: src/app.ts',
                'Errors: No errors recorded.',
                'Open state: Patch the router and verify the result.'
            ].join('\n')
        ) as any);
        const result = await summarizer.summarize(messages);

        expect(result).toContain('Goal: Fix routing in src/app.ts. Keep the current task goal visible during compaction.');
        expect(result).toContain('Decisions: Inspect the router branch first. Then patch the failing path and rerun checks.');
        expect(result).toContain('Files: src/app.ts');
        expect(result).toContain('Open state: Patch the router and verify the result.');
    }

    @Test('LLMSessionSummarizer falls back to naive when no model adapter')
    async llmFallsBackWithoutModel() {
        const summarizer = new LLMSessionSummarizer(null);
        const messages: AgentMessage[] = [
            { id: '1', role: 'user', content: 'Fix the bug in src/app.ts and preserve the latest task goal.', createdAt: 1 },
            { id: '2', role: 'assistant', content: 'I will inspect the runtime compaction flow and adjust the summary strategy.', createdAt: 2 },
            {
                id: '3',
                role: 'tool',
                name: 'read_file',
                content: '{"files":["src/app.ts","src/runtime/DefaultAgentRuntime.ts"]}',
                createdAt: 3
            },
            {
                id: '4',
                role: 'tool',
                name: 'project_intel',
                content: '{"error":"Tool \\"project_intel\\" input validation failed: $.action is required"}',
                createdAt: 4,
                metadata: {
                    error: 'Tool "project_intel" input validation failed: $.action is required'
                }
            },
            { id: '5', role: 'assistant', content: 'Next I will preserve the latest substantive user message during compaction.', createdAt: 5 }
        ];
        const result = await summarizer.summarize(messages);
        expect(result).toBeTruthy();
        expect(result).toContain('Goal:');
        expect(result).toContain('Decisions:');
        expect(result).toContain('Files:');
        expect(result).toContain('Errors:');
        expect(result).toContain('Open state:');
        expect(result).toContain('src/app.ts');
    }

    @Test('LLMSessionSummarizer fallback keeps root goal instead of follow-up only prompts')
    async llmFallbackKeepsRootGoalAcrossContinuePrompts() {
        const summarizer = new LLMSessionSummarizer(null);
        const messages: AgentMessage[] = [
            { id: '1', role: 'user', content: '设计一个跨平台在线考试系统，并补充数据库表设计、权限模型和部署架构。', createdAt: 1 },
            { id: '2', role: 'assistant', content: 'I will outline the architecture and then fill in the database schema.', createdAt: 2 },
            { id: '3', role: 'user', content: '继续', createdAt: 3 },
            { id: '4', role: 'assistant', content: 'Continuing the design output.', createdAt: 4 },
            { id: '5', role: 'user', content: '补充项目主线和跨会话聚合策略。', createdAt: 5 }
        ];

        const result = await summarizer.summarize(messages);

        expect(result).toContain('Goal:');
        expect(result).toContain('Root: 设计一个跨平台在线考试系统');
        expect(result).toContain('Current: 补充项目主线和跨会话聚合策略');
        expect(result).not.toContain('Goal: 继续');
    }
}

class StaticSummaryModelAdapter extends EchoModelAdapter {
    constructor(private readonly content: string) {
        super();
    }

    async complete(): Promise<any> {
        return {
            message: this.content,
            stopReason: 'end'
        };
    }
}
