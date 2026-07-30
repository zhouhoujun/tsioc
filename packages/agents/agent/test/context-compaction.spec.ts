import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { AgentContextManager, StashedContext, CompactionLevel } from '../src/context/AgentContextManager';
import { LLMSessionSummarizer } from '../src/memory/LLMSessionSummarizer';
import { SimpleSessionSummarizer } from '../src/memory/SimpleSessionSummarizer';
import { SessionSummarizer } from '../src/memory/SessionSummarizer';
import { EchoModelAdapter } from '../src/model/EchoModelAdapter';
import { AgentMessage } from '../src/runtime/AgentMessage';

/**
 * Test-only interface exposing package-internal members of AgentContextManager
 * that tests need to verify behavior without (ctx as any) casts.
 */
interface TestAgentContextManager {
    originalMessageStore: Map<string, StashedContext>;
    dynamicCompactionMinTokens: number;
    dynamicRecentWindow: number;
    tokenGrowthHistory: Array<{ timestamp: number; beforeTokens: number; messageCount: number }>;
    consecutiveHighGrowthWindows: number;
    consecutiveLowGrowthWindows: number;
    adaptiveEnabled: boolean;
    recordTokenGrowth(beforeTokens: number, messageCount: number): void;
    adjustBudget(): void;
    aggressivePrune(messages: AgentMessage[]): AgentMessage[];
    readonly effectiveCompactionMinTokens: number;
    readonly effectiveRecentWindow: number;
    isErrorContextMessage(msg: AgentMessage): boolean;
    selectCompactionLevel(estimatedTokens: number): CompactionLevel;
}

function asTestCtx(ctx: AgentContextManager): TestAgentContextManager {
    return ctx as unknown as TestAgentContextManager;
}

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
    /* --- language-aware token estimation --- */

    @Test('estimateTokens handles CJK-heavy text more accurately than length/4')
    async estimateTokensCjkAccuracy() {
        const ctx = new AgentContextManager();
        // Chinese text tokens ~1.8 chars per token, English ~4 chars per token
        const cjkText = '设计一个跨平台在线考试系统，并给出数据库表设计、接口设计、权限模型、部署架构和监考流程。';
        const asciiText = 'Design a cross-platform online examination system with database schema, API design, permission model, deployment architecture and proctoring workflow.';

        const cjkTokens = ctx.estimateTokens(cjkText);
        const asciiTokens = ctx.estimateTokens(asciiText);

        // CJK text (61 chars) should be ~34 tokens, old method gave 15
        expect(cjkTokens).toBeGreaterThan(20);
        // ASCII text (168 chars) should be ~44 tokens  
        expect(asciiTokens).toBeGreaterThan(30);

        // Mixed text should account for both character types
        const mixedText = `${cjkText} ${asciiText}`;
        const mixedTokens = ctx.estimateTokens(mixedText);
        // combined should be more than either alone
        expect(mixedTokens).toBeGreaterThan(cjkTokens);
        expect(mixedTokens).toBeGreaterThan(asciiTokens);
    }

    @Test('estimateTokens returns at least 1 for any non-empty input')
    async estimateTokensMinimum() {
        const ctx = new AgentContextManager();
        expect(ctx.estimateTokens('a')).toEqual(1);
        expect(ctx.estimateTokens('中')).toEqual(1);
    }

    @Test('estimateTokens returns 0 for empty input')
    async estimateTokensEmpty() {
        const ctx = new AgentContextManager();
        expect(ctx.estimateTokens('')).toEqual(0);
        expect(ctx.estimateTokens('   ')).toBeGreaterThan(0);
    }

    /* --- narrowed error context detection --- */

    @Test('isErrorContextMessage does not flag messages that merely mention error')
    async errorContextNoFalsePositive() {
        const ctx = new AgentContextManager();
        // These should NOT be flagged as error context - they only mention the word
        const cleanMessages: AgentMessage[] = [
            { id: 'm1', role: 'assistant', content: 'The previous error is now fixed in the latest commit.', createdAt: 1 },
            { id: 'm2', role: 'assistant', content: 'Let me check if there is any error in the build output.', createdAt: 2 },
            { id: 'm3', role: 'assistant', content: 'The build completed without any error.', createdAt: 3 },
            { id: 'm4', role: 'assistant', content: 'I found a failed test and fixed it.', createdAt: 4 },
            { id: 'm5', role: 'assistant', content: 'Retrying the failed step after fixing the configuration.', createdAt: 5 }
        ];

        for (const msg of cleanMessages) {
            const result = asTestCtx(ctx).isErrorContextMessage(msg);
            expect(result).toEqual(false);
        }
    }

    @Test('isErrorContextMessage still flags actual errors in metadata')
    async errorContextFlagsMetadataErrors() {
        const ctx = new AgentContextManager();
        const errorMessages: AgentMessage[] = [
            {
                id: 'm1', role: 'tool', name: 'project_intel',
                content: 'normal output',
                createdAt: 1,
                metadata: { error: 'validation failed' }
            },
            {
                id: 'm2', role: 'tool', name: 'read_file',
                content: '{"files":[]}',
                createdAt: 2,
                metadata: { receipt: { status: 'error', error: 'file not found' } }
            },
            {
                id: 'm3', role: 'tool', name: 'write_file',
                content: '{"error":"permission denied"}',
                createdAt: 3
            },
            {
                id: 'm4', role: 'assistant',
                content: 'Error: The migration step failed because the target branch does not exist.',
                createdAt: 4
            }
        ];

        for (const msg of errorMessages) {
            const result = asTestCtx(ctx).isErrorContextMessage(msg);
            expect(result).toEqual(true);
        }
    }

    /* --- budget-aware pruneHistory --- */

    @Test('pruneHistory uses budget-aware recent window instead of hardcoded 20')
    async pruneHistoryBudgetAwareWindow() {
        const ctx = new AgentContextManager();
        ctx.configure({ maxHistoryTokens: 2000, maxToolResults: 200 });
        const messages: AgentMessage[] = [];
        for (let i = 0; i < 40; i++) {
            messages.push({ id: `m${i}`, role: 'assistant', content: `Step ${i}: some repeated content that adds up over many iterations `.repeat(3), createdAt: i });
        }
        const result = ctx.pruneHistory(messages);
        // budget 2000 with ~4 chars/token ≈ 8000 chars budget → should keep fewer than 40
        expect(result.length).toBeLessThan(30);
        expect(result.length).toBeGreaterThan(0);
        const recentIds = new Set(result.map(m => m.id));
        // last message should always be present
        expect(recentIds.has('m39')).toEqual(true);
    }

    @Test('pruneHistory respects very small budget')
    async pruneHistorySmallBudget() {
        const ctx = new AgentContextManager();
        ctx.configure({ maxHistoryTokens: 200, maxToolResults: 80 });
        const messages: AgentMessage[] = [];
        for (let i = 0; i < 20; i++) {
            messages.push({ id: `m${i}`, role: 'assistant', content: `Item ${i}: `.repeat(10), createdAt: i });
        }
        const result = ctx.pruneHistory(messages);
        expect(result.length).toBeLessThan(10);
        expect(result.length).toBeGreaterThan(0);
    }

    /* --- progressive compression levels --- */

    @Test('selectCompactionLevel returns light when tokens are well within budget')
    async selectLevelLight() {
        const ctx = new AgentContextManager();
        ctx.configure({ maxHistoryTokens: 32000 });
        expect(asTestCtx(ctx).selectCompactionLevel(5000)).toEqual('light');
        expect(asTestCtx(ctx).selectCompactionLevel(10000)).toEqual('light');
        expect(asTestCtx(ctx).selectCompactionLevel(19000)).toEqual('light');
    }

    @Test('selectCompactionLevel returns medium when tokens approach budget')
    async selectLevelMedium() {
        const ctx = new AgentContextManager();
        ctx.configure({ maxHistoryTokens: 32000 });
        expect(asTestCtx(ctx).selectCompactionLevel(25000)).toEqual('medium');
        expect(asTestCtx(ctx).selectCompactionLevel(40000)).toEqual('medium');
        expect(asTestCtx(ctx).selectCompactionLevel(47999)).toEqual('medium');
    }

    @Test('selectCompactionLevel returns deep when tokens far exceed budget')
    async selectLevelDeep() {
        const ctx = new AgentContextManager();
        ctx.configure({ maxHistoryTokens: 32000 });
        expect(asTestCtx(ctx).selectCompactionLevel(48001)).toEqual('deep');
        expect(asTestCtx(ctx).selectCompactionLevel(100000)).toEqual('deep');
    }

    @Test('prepareHistory report includes level field')
    async reportIncludesLevel() {
        const ctx = new AgentContextManager();
        ctx.configure({ maxHistoryTokens: 32000, compactionMinTokens: 500 });
        ctx.setSummarizer(new SimpleSessionSummarizer(), 50);
        const messages = this.makeToolMessages(8);
        const prepared = await ctx.prepareHistory(messages);
        expect(prepared.report.level).toBeDefined();
        expect(['light', 'medium', 'deep']).toContain(prepared.report.level);
    }

    @Test('prepareHistory report includes compressionRatio')
    async reportIncludesCompressionRatio() {
        const ctx = new AgentContextManager();
        ctx.configure({ maxHistoryTokens: 32000, compactionMinTokens: 500 });
        ctx.setSummarizer(new SimpleSessionSummarizer(), 50);
        const messages = this.makeToolMessages(8);
        const prepared = await ctx.prepareHistory(messages);
        expect(typeof prepared.report.compressionRatio).toEqual('number');
        expect(prepared.report.compressionRatio).toBeGreaterThanOrEqual(0);
    }

    @Test('prepareHistory report includes cumulativeTokenSavings')
    async reportIncludesCumulativeTokenSavings() {
        const ctx = new AgentContextManager();
        ctx.configure({ maxHistoryTokens: 32000, compactionMinTokens: 500 });
        ctx.setSummarizer(new SimpleSessionSummarizer(), 50);
        const messages = this.makeToolMessages(8);
        const prepared = await ctx.prepareHistory(messages);
        expect(typeof prepared.report.cumulativeTokenSavings).toEqual('number');
        expect(prepared.report.cumulativeTokenSavings).toBeGreaterThanOrEqual(0);
    }

    /* --- selective detail recovery --- */

    @Test('prepareHistory with sessionId stashes original messages')
    async stashesWithSessionId() {
        const ctx = new AgentContextManager();
        ctx.configure({ maxHistoryTokens: 32000, compactionMinTokens: 200 });
        ctx.setSummarizer(new SimpleSessionSummarizer(), 10);
        const messages = this.makeToolMessages(10);
        await ctx.prepareHistory(messages, 'test-session');
        expect(ctx.hasCompactedContent('test-session')).toEqual(true);
        expect(ctx.hasCompactedContent('other-session')).toEqual(false);
    }

    @Test('prepareHistory without sessionId does not stash')
    async doesNotStashWithoutSessionId() {
        const ctx = new AgentContextManager();
        ctx.configure({ maxHistoryTokens: 32000, compactionMinTokens: 500 });
        ctx.setSummarizer(new SimpleSessionSummarizer(), 50);
        const messages = this.makeToolMessages(5);
        await ctx.prepareHistory(messages);
        expect(ctx.hasCompactedContent('test-session')).toEqual(false);
    }

    @Test('recoverDetail returns undefined when session has no compacted content')
    async recoverEmptySession() {
        const ctx = new AgentContextManager();
        const result = ctx.recoverDetail('nonexistent', 'some query');
        expect(result).toBeUndefined();
    }

    @Test('clearCompactedContent removes stashed content')
    async clearStashedContent() {
        const ctx = new AgentContextManager();
        ctx.configure({ maxHistoryTokens: 32000, compactionMinTokens: 200 });
        ctx.setSummarizer(new SimpleSessionSummarizer(), 10);
        const messages = this.makeToolMessages(10);
        await ctx.prepareHistory(messages, 'test-session');
        expect(ctx.hasCompactedContent('test-session')).toEqual(true);
        ctx.clearCompactedContent('test-session');
        expect(ctx.hasCompactedContent('test-session')).toEqual(false);
    }

    /* --- aggressive prune (deep level) --- */

    @Test('aggressivePrune keeps system + minimal anchors + recent only')
    async aggressivePruneMinimal() {
        const ctx = new AgentContextManager();
        const messages: AgentMessage[] = [
            { id: 'sys', role: 'system', content: 'You are a coding agent.', createdAt: 1 },
            { id: 'u1', role: 'user', content: 'Long goal text '.repeat(30), createdAt: 2 },
            { id: 'a1', role: 'assistant', content: 'Some reply '.repeat(20), createdAt: 3 },
            { id: 'u2', role: 'user', content: '继续', createdAt: 4 },
            { id: 'a2', role: 'assistant', content: 'Another reply '.repeat(20), createdAt: 5 },
            { id: 'u3', role: 'user', content: '继续', createdAt: 6 },
            { id: 'a3', role: 'assistant', content: 'Yet another reply '.repeat(20), createdAt: 7 },
            { id: 'u4', role: 'user', content: '继续', createdAt: 8 },
            { id: 'a4', role: 'assistant', content: 'Reply 4 '.repeat(20), createdAt: 9 },
            { id: 'u5', role: 'user', content: '继续', createdAt: 10 },
            { id: 'a5', role: 'assistant', content: 'Reply 5 '.repeat(20), createdAt: 11 },
            { id: 'u6', role: 'user', content: '继续', createdAt: 12 },
            { id: 'a6', role: 'assistant', content: 'Reply 6 '.repeat(20), createdAt: 13 },
            { id: 'u7', role: 'user', content: '继续', createdAt: 14 },
            { id: 'a7', role: 'assistant', content: 'Reply 7 '.repeat(20), createdAt: 15 }
        ];
        const result: AgentMessage[] = asTestCtx(ctx).aggressivePrune(messages);
        // Must keep system message
        expect(result.some(m => m.id === 'sys')).toEqual(true);
        // Must keep last few messages (recent window)
        expect(result.some(m => m.id === 'a7')).toEqual(true);
        // Should drop most intermediate messages
        expect(result.length).toBeLessThan(messages.length);
    }

    /* --- adaptive budget adjustment --- */

    @Test('adaptive budget disabled by default, uses base compactionMinTokens')
    async adaptiveDisabledByDefault() {
        const ctx = new AgentContextManager();
        ctx.configure({ maxHistoryTokens: 32000, compactionMinTokens: 1000 });
        // Not setting adaptiveBudget → defaults to false
        expect(asTestCtx(ctx).adaptiveEnabled).toEqual(false);
        expect(asTestCtx(ctx).effectiveCompactionMinTokens).toEqual(1000);
        expect(asTestCtx(ctx).effectiveRecentWindow).toEqual(6);
    }

    @Test('adaptive budget enabled reduces compactionMinTokens on high growth')
    async adaptiveReducesThresholdOnHighGrowth() {
        const ctx = new AgentContextManager();
        ctx.configure({
            maxHistoryTokens: 32000,
            compactionMinTokens: 2000,
            adaptiveBudget: true,
            adaptiveCompactionMin: 200
        });

        // Simulate high growth: push history entries with growing token counts
        for (let i = 0; i < 5; i++) {
            asTestCtx(ctx).recordTokenGrowth(5000 + i * 12000, 10 + i * 2);
        }
        asTestCtx(ctx).adjustBudget();

        // High growth (>10000 avg per turn) should halve the threshold
        expect(asTestCtx(ctx).dynamicCompactionMinTokens).toBeLessThan(2000);
        expect(asTestCtx(ctx).dynamicCompactionMinTokens).toBeGreaterThanOrEqual(200);
    }

    @Test('adaptive budget keeps baseline on moderate growth')
    async adaptiveKeepsBaselineOnModerateGrowth() {
        const ctx = new AgentContextManager();
        ctx.configure({
            maxHistoryTokens: 32000,
            compactionMinTokens: 2000,
            adaptiveBudget: true
        });

        // Moderate growth (avg delta ~2000/turn): not high, not plateau → baseline
        for (let i = 0; i < 5; i++) {
            asTestCtx(ctx).recordTokenGrowth(1000 + i * 2000, 5 + i);
        }
        asTestCtx(ctx).adjustBudget();

        expect(asTestCtx(ctx).dynamicCompactionMinTokens).toEqual(2000);
    }

    @Test('adaptive budget increases recent window on follow-up patterns')
    async adaptiveWidensWindowOnFollowUps() {
        const ctx = new AgentContextManager();
        ctx.configure({
            maxHistoryTokens: 32000,
            recentMessageWindow: 6,
            adaptiveBudget: true,
            adaptiveRecentWindowMax: 20
        });

        // Simulate follow-up pattern: message count barely grows each turn
        for (let i = 0; i < 5; i++) {
            asTestCtx(ctx).recordTokenGrowth(1000 + i * 200, 3);
        }
        asTestCtx(ctx).adjustBudget();

        // High follow-up ratio (>60%) should widen the window
        expect(asTestCtx(ctx).dynamicRecentWindow).toBeGreaterThan(6);
        expect(asTestCtx(ctx).dynamicRecentWindow).toBeLessThanOrEqual(20);
    }

    @Test('configure resets adaptive tracking state')
    async adaptiveResetsOnConfigure() {
        const ctx = new AgentContextManager();
        ctx.configure({ maxHistoryTokens: 32000, adaptiveBudget: true });
        asTestCtx(ctx).recordTokenGrowth(10000, 10);
        asTestCtx(ctx).recordTokenGrowth(25000, 12);
        expect(asTestCtx(ctx).tokenGrowthHistory.length).toEqual(2);

        // Reconfigure → resets
        ctx.configure({ maxHistoryTokens: 32000, adaptiveBudget: true });
        expect(asTestCtx(ctx).tokenGrowthHistory.length).toEqual(0);
        expect(asTestCtx(ctx).dynamicCompactionMinTokens).toEqual(1200);
    }

    @Test('adaptive budget with fewer than 4 data points does not adjust')
    async adaptiveSkipsWithInsufficientData() {
        const ctx = new AgentContextManager();
        ctx.configure({
            maxHistoryTokens: 32000,
            compactionMinTokens: 2000,
            adaptiveBudget: true
        });

        asTestCtx(ctx).recordTokenGrowth(1000, 5);
        asTestCtx(ctx).recordTokenGrowth(20000, 8);
        asTestCtx(ctx).recordTokenGrowth(35000, 10);
        asTestCtx(ctx).adjustBudget();

        // Only 3 data points (< 4 deltas needed) → no adjustment
        expect(asTestCtx(ctx).dynamicCompactionMinTokens).toEqual(2000);
    }
}

@Suite('Agent cross-session experience synthesis')
export class CrossSessionSynthesisTest {
    private makeManager(): AgentContextManager {
        const ctx = new AgentContextManager();
        ctx.configure({
            maxHistoryTokens: 32000,
            compactionMinTokens: 2000,
            stashTTL: 0, // disable TTL for cross-session tests
        });
        return ctx;
    }

    private stashMessages(
        ctx: AgentContextManager,
        sessionId: string,
        messages: AgentMessage[],
        level: 'light' | 'medium' | 'deep' = 'light',
        timestamp?: number,
    ): void {
        const store = asTestCtx(ctx).originalMessageStore as Map<string, any>;
        store.set(sessionId, {
            messages,
            timestamp: timestamp ?? Date.now(),
            level,
        });
    }

    private makeMsg(overrides: Partial<AgentMessage> & { id: string }): AgentMessage {
        return {
            role: 'user',
            content: '',
            createdAt: Date.now(),
            ...overrides,
        };
    }

    @Test('listCompactedSessions returns known session IDs')
    testListCompactedSessions() {
        const ctx = this.makeManager();
        const store = asTestCtx(ctx).originalMessageStore as Map<string, any>;
        expect(ctx.listCompactedSessions()).toEqual([]);

        store.set('s1', { messages: [], timestamp: 1, level: 'light' });
        store.set('s2', { messages: [], timestamp: 2, level: 'medium' });
        expect(ctx.listCompactedSessions().sort()).toEqual(['s1', 's2']);
    }

    @Test('extractSessionPatterns extracts goal from first substantive user message')
    testExtractGoal() {
        const ctx = this.makeManager();
        this.stashMessages(ctx, 's1', [
            this.makeMsg({ id: 'm1', role: 'user', content: '继续', createdAt: 10 }),
            this.makeMsg({ id: 'm2', role: 'user', content: '帮我写一个 Express 路由', createdAt: 20 }),
            this.makeMsg({ id: 'm3', role: 'assistant', content: 'Here is the route.', createdAt: 30 }),
        ], 'light', 1000);

        const patterns = ctx.extractSessionPatterns('s1');
        const goals = patterns.filter(p => p.type === 'goal');
        expect(goals.length).toBe(1);
        expect(goals[0].content).toContain('Express');
        expect(goals[0].sourceSessionIds).toEqual(['s1']);
    }

    @Test('extractSessionPatterns extracts tool patterns for frequently used tools')
    testExtractToolPatterns() {
        const ctx = this.makeManager();
        this.stashMessages(ctx, 's1', [
            this.makeMsg({ id: 'm1', role: 'user', content: 'Refactor the auth module', createdAt: 10 }),
            this.makeMsg({
                id: 'm2', role: 'assistant', content: 'Looking...', createdAt: 20,
                metadata: { toolCalls: [{ id: 't1', name: 'read_file' }, { id: 't2', name: 'grep' }] }
            }),
            this.makeMsg({ id: 'm3', role: 'user', content: '继续', createdAt: 30 }),
            this.makeMsg({
                id: 'm4', role: 'assistant', content: 'Done...', createdAt: 40,
                metadata: { toolCalls: [{ id: 't3', name: 'read_file' }, { id: 't4', name: 'write_file' }] }
            }),
        ], 'light', 1000);

        const patterns = ctx.extractSessionPatterns('s1');
        const tools = patterns.filter(p => p.type === 'tool_pattern');
        expect(tools.length).toBe(1);
        expect(tools[0].content).toContain('read_file');
        // read_file used 2 times — only tool with count >= 2
        expect(tools[0].content).toMatch(/2 times/);
    }

    @Test('extractSessionPatterns extracts error patterns from assistant/tool messages')
    testExtractErrors() {
        const ctx = this.makeManager();
        this.stashMessages(ctx, 's1', [
            this.makeMsg({ id: 'm1', role: 'user', content: 'Fix the API', createdAt: 10 }),
            this.makeMsg({
                id: 'm2', role: 'assistant',
                content: 'Cannot connect to database: connection timeout. The connection failed with error code 10060.',
                createdAt: 20,
            }),
        ], 'light', 1000);

        const patterns = ctx.extractSessionPatterns('s1');
        const errors = patterns.filter(p => p.type === 'error');
        expect(errors.length).toBe(1);
        expect(errors[0].content).toContain('Cannot');
    }

    @Test('extractSessionPatterns extracts "I prefer" preferences')
    testExtractPreferences() {
        const ctx = this.makeManager();
        this.stashMessages(ctx, 's1', [
            this.makeMsg({ id: 'm1', role: 'user', content: 'I prefer TypeScript over JavaScript.', createdAt: 10 }),
            this.makeMsg({ id: 'm2', role: 'user', content: '继续', createdAt: 20 }),
        ], 'light', 1000);

        const patterns = ctx.extractSessionPatterns('s1');
        const prefs = patterns.filter(p => p.type === 'preference');
        expect(prefs.length).toBe(1);
        expect(prefs[0].content).toContain('TypeScript');
    }

    @Test('extractSessionPatterns returns empty array for unknown session')
    testUnknownSession() {
        const ctx = this.makeManager();
        expect(ctx.extractSessionPatterns('no-such')).toEqual([]);
    }

    @Test('synthesizeExperiences merges patterns across sessions')
    testCrossSessionMerge() {
        const ctx = this.makeManager();
        const ts = 1000;

        this.stashMessages(ctx, 's1', [
            this.makeMsg({ id: 'm1', role: 'user', content: 'I prefer async/await over callbacks.', createdAt: 10 }),
        ], 'light', ts);

        this.stashMessages(ctx, 's2', [
            this.makeMsg({ id: 'm2', role: 'user', content: 'I prefer async/await over callbacks.', createdAt: 20 }),
        ], 'light', ts + 100);

        const report = ctx.synthesizeExperiences();
        expect(report.totalSessions).toBe(2);
        expect(report.processedSessions).toBe(2);
        // Message is both a "goal" (first substantive) and "preference" (I prefer…)
        // → 2 pattern types, each deduplicated across sessions
        const prefs = report.patterns.filter(p => p.type === 'preference');
        expect(prefs.length).toBe(1);
        expect(prefs[0].sourceSessionIds).toEqual(['s1', 's2']);
        expect(prefs[0].confidence).toBeGreaterThan(0.6); // boosted from 0.6
        const goals = report.patterns.filter(p => p.type === 'goal');
        expect(goals.length).toBe(1);
        expect(goals[0].sourceSessionIds).toEqual(['s1', 's2']);
    }

    @Test('synthesizeExperiences respects sessionIds filter')
    testSessionFilter() {
        const ctx = this.makeManager();
        this.stashMessages(ctx, 's1', [
            this.makeMsg({ id: 'm1', role: 'user', content: 'I prefer tabs.', createdAt: 10 }),
        ], 'light', 1000);
        this.stashMessages(ctx, 's2', [
            this.makeMsg({ id: 'm2', role: 'user', content: 'I prefer spaces.', createdAt: 20 }),
        ], 'light', 1001);

        const report = ctx.synthesizeExperiences({ sessionIds: ['s1'] });
        expect(report.totalSessions).toBe(1);
        expect(report.processedSessions).toBe(1);
        const prefs = report.patterns.filter(p => p.type === 'preference');
        expect(prefs.length).toBe(1);
        expect(prefs[0].content).toContain('tabs');
        // The message also yields a 'goal' pattern from first substantive user msg
        expect(report.patterns.length).toBe(2);
    }

    @Test('synthesizeExperiences respects maxPatterns')
    testMaxPatterns() {
        const ctx = this.makeManager();
        this.stashMessages(ctx, 's1', [
            this.makeMsg({ id: 'm1', role: 'user', content: 'Goal one', createdAt: 10 }),
            this.makeMsg({ id: 'm2', role: 'user', content: '继续', createdAt: 20 }),
        ], 'light', 1000);
        this.stashMessages(ctx, 's2', [
            this.makeMsg({ id: 'm3', role: 'user', content: 'Goal two', createdAt: 30 }),
        ], 'light', 1001);

        const full = ctx.synthesizeExperiences();
        expect(full.patterns.length).toBe(2);

        const limited = ctx.synthesizeExperiences({ maxPatterns: 1 });
        expect(limited.patterns.length).toBe(1);
    }

    @Test('synthesizeExperiences sorts by confidence then multi-session then newest')
    testSortOrder() {
        const ctx = this.makeManager();
        this.stashMessages(ctx, 's1', [
            this.makeMsg({ id: 'm1', role: 'user', content: 'Refactor the auth module.', createdAt: 10 }),
            // Only 2 error terms → confidence 0.7, single-session
            this.makeMsg({ id: 'm2', role: 'assistant', content: 'Cannot connect: timeout.', createdAt: 20 }),
        ], 'light', 1000);
        this.stashMessages(ctx, 's2', [
            this.makeMsg({ id: 'm3', role: 'user', content: 'Refactor the auth module.', createdAt: 30 }),
        ], 'light', 1001);

        const report = ctx.synthesizeExperiences();
        // 2 dedup'd patterns: goal (0.7+boost→0.8, multi-session), error (0.7, single-session)
        // Sort: 0.8 > 0.7 → goal first
        expect(report.patterns.length).toBe(2);
        expect(report.patterns[0].type).toBe('goal');
        expect(report.patterns[0].sourceSessionIds.length).toBe(2);
        expect(report.patterns[0].confidence).toBeGreaterThanOrEqual(0.79);
        expect(report.patterns[1].type).toBe('error');
        expect(report.patterns[1].sourceSessionIds.length).toBe(1);
    }

    @Test('synthesizeExperiences with empty stash yields empty report')
    testEmptyStash() {
        const ctx = this.makeManager();
        const report = ctx.synthesizeExperiences();
        expect(report.totalSessions).toBe(0);
        expect(report.processedSessions).toBe(0);
        expect(report.patterns).toEqual([]);
        expect(report.errors).toEqual([]);
    }
}

@Suite('Agent stash TTL')
export class StashTTLTest {
    private makeMsg(overrides: Partial<AgentMessage> & { id: string }): AgentMessage {
        return { role: 'user', content: '', createdAt: Date.now(), ...overrides };
    }

    @Test('hasCompactedContent returns false for expired entry')
    testExpiredEntryExcluded() {
        const ctx = new AgentContextManager();
        ctx.configure({ stashTTL: 100 }); // 100ms TTL
        const store = asTestCtx(ctx).originalMessageStore as Map<string, any>;
        store.set('s1', { messages: [], timestamp: Date.now() - 200, level: 'light' });

        expect(ctx.hasCompactedContent('s1')).toBe(false);
    }

    @Test('hasCompactedContent returns true for non-expired entry')
    testActiveEntryIncluded() {
        const ctx = new AgentContextManager();
        ctx.configure({ stashTTL: 60000 }); // 60s TTL
        const store = asTestCtx(ctx).originalMessageStore as Map<string, any>;
        store.set('s1', { messages: [], timestamp: Date.now(), level: 'light' });

        expect(ctx.hasCompactedContent('s1')).toBe(true);
    }

    @Test('listCompactedSessions excludes expired entries')
    testListExcludesExpired() {
        const ctx = new AgentContextManager();
        ctx.configure({ stashTTL: 100 });
        const store = asTestCtx(ctx).originalMessageStore as Map<string, any>;
        store.set('s1', { messages: [], timestamp: Date.now() - 200, level: 'light' });
        store.set('s2', { messages: [], timestamp: Date.now(), level: 'medium' });

        const sessions = ctx.listCompactedSessions();
        expect(sessions).toEqual(['s2']);
    }

    @Test('recoverDetail returns undefined for expired entry')
    testRecoverExcludesExpired() {
        const ctx = new AgentContextManager();
        ctx.configure({ stashTTL: 100 });
        const store = asTestCtx(ctx).originalMessageStore as Map<string, any>;
        store.set('s1', {
            messages: [this.makeMsg({ id: 'm1', content: 'hello world' })],
            timestamp: Date.now() - 200,
            level: 'light',
        });

        expect(ctx.recoverDetail('s1', 'hello')).toBeUndefined();
    }

    @Test('clearCompactedContent purges expired before delete')
    testClearPurgesExpiredFirst() {
        const ctx = new AgentContextManager();
        ctx.configure({ stashTTL: 100 });
        const store = asTestCtx(ctx).originalMessageStore as Map<string, any>;
        store.set('s1', { messages: [], timestamp: Date.now() - 200, level: 'light' });
        store.set('s2', { messages: [], timestamp: Date.now(), level: 'light' });

        // s1 is already expired — clearCompactedContent purges expired then deletes s2
        ctx.clearCompactedContent('s2');
        // After purge + delete, only s1 was already purged, s2 explicitly deleted
        expect(ctx.listCompactedSessions()).toEqual([]);
    }

    @Test('TTL=0 disables expiry')
    testTTLZeroDisablesExpiry() {
        const ctx = new AgentContextManager();
        ctx.configure({ stashTTL: 0 });
        const store = asTestCtx(ctx).originalMessageStore as Map<string, any>;
        store.set('s1', { messages: [], timestamp: 1, level: 'light' }); // very old

        expect(ctx.hasCompactedContent('s1')).toBe(true);
    }

    @Test('extractSessionPatterns purges expired before extraction')
    testExtractPurgesExpired() {
        const ctx = new AgentContextManager();
        ctx.configure({ stashTTL: 100 });
        const store = asTestCtx(ctx).originalMessageStore as Map<string, any>;
        store.set('s1', {
            messages: [this.makeMsg({ id: 'm1', role: 'user', content: 'Do something' })],
            timestamp: Date.now() - 200,
            level: 'light',
        });

        expect(ctx.extractSessionPatterns('s1')).toEqual([]);
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
