import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import {
    defaultAgentConsoleOptions,
    defaultAgentConsoleTheme,
    renderAgentConsoleMessageItems,
    resolveAgentConsoleMessageStatus,
    resolveAgentConsoleMessageStatusLabel,
    resolveMessageTemplateKind
} from '../src';

@Suite('Agent console message renderers')
export class AgentConsoleMessageRendererDispatchTest {
    @Test('uses the same 400-character preview budget for tool runs and inline tool messages')
    useConsistentToolPreviewBudget() {
        expect(defaultAgentConsoleOptions.toolRunSummaryMaxLength).toEqual(400);
    }

    @Test('input and user themes do not paint a trailing background cell')
    noTrailingBackgroundCell() {
        expect(defaultAgentConsoleTheme.inputShell).toContain('padding: 1em 0 1em 1ch');
        expect(defaultAgentConsoleTheme.messagesUser).toContain('padding: 0 0 0 1ch');
        expect(defaultAgentConsoleTheme.inputShell).toContain('background: #1b2128');
        expect(defaultAgentConsoleTheme.messagesUser).toContain('background: #1b2128');
        expect(defaultAgentConsoleTheme.messagesSelected).toContain('background: #13202b');
        const items = renderAgentConsoleMessageItems([
            { id: 'u1', role: 'user', content: 'hello', createdAt: 1 }
        ] as any);
        expect(items[0].lines[0].itemStyle?.padding).toEqual('0em 0 0em 1ch');
    }

    @Test('dispatches message template kinds by role and metadata')
    renderTemplateKinds() {
        const messages = [
            { id: 'u1', role: 'user', content: 'hello', createdAt: 1 },
            { id: 'a1', role: 'assistant', content: '**world**', createdAt: 2 },
            { id: 't1', role: 'tool', content: '{"ok":true}', createdAt: 3 },
            { id: 'e1', role: 'assistant', content: 'Error: boom', createdAt: 4, metadata: { error: true } },
            { id: 's1', role: 'system', content: 'ready', createdAt: 5 }
        ] as any;

        const items = renderAgentConsoleMessageItems(messages, {
            selectedMessageId: '',
            messagesFocused: true
        });

        expect(items.map(item => item.templateKind)).toEqual(['user', 'assistant', 'tool', 'error', 'system']);
        expect(items[0].lines[0].content).toEqual('hello');
        expect(items[0].lines[0].status?.trim()).toEqual('');
        expect(items[0].itemStyle.background).toEqual('#1b2128');
        expect(items[0].lines[0].itemStyle?.padding).toEqual('0em 0 0em 1ch');
        expect(items[0].lines[0].lineStyle?.background).toEqual(undefined);
        expect(items[1].lines[0].content).toEqual('world');
        expect(items[1].lines[0].status?.trim()).toEqual('');
        expect(items[1].lines[0].statusKind).toEqual('success');
        expect(items[1].lines[0].statusLabel).toEqual('成功');
        expect(items[1].lines[0].role).toEqual('');
        expect(items[1].lines[0].tokens.at(-1)?.text).toEqual(' (1ms)');
        expect(items[1].itemStyle.background).toEqual(undefined);
        expect(items[3].lines[0].tokens[0]?.style.color).toBeTruthy();
        expect(items[3].lines[0].status?.trim()).toEqual('');
        expect(items[3].lines[0].statusKind).toEqual('error');
    }

    @Test('resolves error template before assistant role')
    resolveErrorTemplate() {
        expect(resolveMessageTemplateKind({
            id: 'e1',
            role: 'assistant',
            content: 'boom',
            createdAt: 1,
            metadata: { error: true }
        } as any)).toEqual('error');
    }

    @Test('summarizes tool json content without rendering raw json')
    renderToolSummaryContent() {
        const items = renderAgentConsoleMessageItems([
            {
                id: 't1',
                role: 'tool',
                name: 'read_file',
                content: '{"path":"src/index.ts","truncated":false}',
                createdAt: 1,
                metadata: {
                    receipt: {
                        toolName: 'read_file'
                    }
                }
            }
        ] as any);

        expect(items[0].lines[0].content).toEqual('src/index.ts');
        expect(items[0].lines[0].content.includes('{')).toEqual(false);
    }

    @Test('renders streaming assistant markdown without a literal cursor block')
    renderStreamingAssistantMarkdown() {
        const items = renderAgentConsoleMessageItems([
            {
                id: 'a1',
                role: 'assistant',
                content: '**bold**\n```ts\nconst x = 1;\n```',
                createdAt: 1,
                metadata: { streaming: true }
            }
        ] as any);

        expect(items[0].lines[0].content).toEqual('bold');
        expect(items[0].lines[0].status?.trim()).toEqual('');
        expect(items[0].lines[0].statusKind).toEqual('running');
        expect(items[0].lines[0].statusStyle?.color).toBeTruthy();
        expect(items[0].lines.some(line => line.prefix === '│ ' && line.content.includes('const x = 1;'))).toBe(true);
        expect(items[0].lines.some(line => line.content.includes('```ts'))).toBe(false);
        expect(items[0].lines.some(line => line.content.includes('▍'))).toBe(false);
    }

    @Test('renders an unclosed streaming fence as plain text without a literal cursor block')
    renderStreamingUnclosedFenceAsText() {
        const items = renderAgentConsoleMessageItems([
            {
                id: 'a2',
                role: 'assistant',
                content: 'before\n```ts\nconst y = 2;',
                createdAt: 1,
                metadata: { streaming: true }
            }
        ] as any);

        expect(items[0].lines[0].content).toEqual('before');
        expect(items[0].lines.some(line => line.content.includes('```ts'))).toBe(true);
        expect(items[0].lines.some(line => line.content.includes('const y = 2;'))).toBe(true);
        expect(items[0].lines.some(line => line.prefix === '│ ')).toBe(false);
        expect(items[0].lines.some(line => line.content.includes('▍'))).toBe(false);
    }

    @Test('renders a neutral placeholder for an empty streaming assistant message')
    renderStreamingEmptyMessagePlaceholder() {
        const items = renderAgentConsoleMessageItems([
            {
                id: 'a3',
                role: 'assistant',
                content: '',
                createdAt: 1,
                metadata: { streaming: true }
            }
        ] as any);

        expect(items[0].lines.length).toEqual(1);
        expect(items[0].lines[0].content).toEqual('…');
        expect(items[0].lines[0].statusKind).toEqual('running');
    }

    @Test('never appends an assistant streaming cursor to user timeline rows')
    userTimelineRowHasNoStreamingCursor() {
        const items = renderAgentConsoleMessageItems([{
            id: 'u-stream', role: 'user', content: 'typed prompt', createdAt: 1,
            metadata: { streaming: true }
        }] as any, { streaming: true, timelineMode: true });
        expect(items[0].lines.map(line => line.content).join('')).toEqual('typed prompt');
        expect(items[0].lines.some(line => line.content.includes('▍'))).toBe(false);
    }

    @Test('shows factual elapsed time for events and final replies')
    timelineRowsShowDurations() {
        const items = renderAgentConsoleMessageItems([
            { id: 'u1', role: 'user', content: 'question', createdAt: 1_000 },
            {
                id: 'e1', role: 'assistant', content: 'Read file', createdAt: 1_500,
                metadata: { uiKind: 'event', uiEventType: 'tool_completed', status: 'success', elapsedMs: 250 }
            },
            { id: 'a1', role: 'assistant', content: 'answer', createdAt: 3_500 }
        ] as any, { timelineMode: true });
        expect(items[1].lines.at(-1)?.tokens.at(-1)?.text).toEqual(' (250ms)');
        expect(items[2].lines.at(-1)?.tokens.at(-1)?.text).toEqual(' (2.5s)');
        expect(items[1].lines.at(-1)?.tokens.at(-1)?.style.color).toEqual('#6e7681');
    }

    @Test('keeps user input raw instead of markdown-formatting it')
    renderUserInputAsRawPlainText() {
        const items = renderAgentConsoleMessageItems([
            {
                id: 'u1',
                role: 'user',
                content: '**not heading**\n1. keep raw',
                createdAt: 1
            }
        ] as any);

        expect(items[0].lines[0].content).toEqual('**not heading**');
        expect(items[0].lines[1].content).toEqual('1. keep raw');
    }

    @Test('formats standalone headings, code blocks, and structured lists with clearer hierarchy')
    renderStructuredAssistantReply() {
        const items = renderAgentConsoleMessageItems([
            {
                id: 'a1',
                role: 'assistant',
                content: `**Implementation Plan**\n功能有 1. 题库， 2. 随机组合试卷；3. 评分\n\`\`\`ts\nconst score = 100;\n\`\`\``,
                createdAt: 1
            }
        ] as any);

        expect(items[0].lines[0].content).toEqual('Implementation Plan');
        expect(items[0].lines[0].tone).toEqual('heading');
        expect(items[0].lines.some(line => line.content === '功能有')).toBe(true);
        expect(items[0].lines.some(line => line.prefix === '1. ' && line.content === '题库')).toBe(true);
        expect(items[0].lines.some(line => line.prefix === '2. ' && line.content === '随机组合试卷')).toBe(true);
        expect(items[0].lines.some(line => line.prefix === '3. ' && line.content === '评分')).toBe(true);
        expect(items[0].lines.some(line => line.prefix === '│ ' && line.content.includes('const score = 100;'))).toBe(true);
    }

    @Test('drops marker-only streaming fragments from compact markdown replies')
    dropsMarkerOnlyFragments() {
        const items = renderAgentConsoleMessageItems([{
            id: 'a1',
            role: 'assistant',
            content: '正文\n1.\n   -\n2. 完整条目\n   - 子项',
            createdAt: 1
        }] as any);
        expect(items[0].lines.map(line => `${line.prefix || ''}${line.content}`))
            .toEqual(['正文', '2. 完整条目', '   • 子项']);
    }

    @Test('resolves shared reply statuses and localized labels')
    resolveReplyStatuses() {
        expect(resolveAgentConsoleMessageStatus({
            id: 'a1',
            role: 'assistant',
            content: 'done',
            createdAt: 1
        } as any)).toEqual('success');

        expect(resolveAgentConsoleMessageStatus({
            id: 'a2',
            role: 'assistant',
            content: '',
            createdAt: 2,
            metadata: { streaming: true }
        } as any)).toEqual('running');

        expect(resolveAgentConsoleMessageStatus({
            id: 't1',
            role: 'tool',
            content: 'boom',
            createdAt: 3,
            metadata: { error: true }
        } as any)).toEqual('failed');

        expect(resolveAgentConsoleMessageStatusLabel('success', {
            success: 'Success'
        })).toEqual('Success');
    }

    @Test('uses different colors for success and error status dots')
    renderStatusColors() {
        const items = renderAgentConsoleMessageItems([
            {
                id: 'a1',
                role: 'assistant',
                content: 'done',
                createdAt: 1
            },
            {
                id: 'e1',
                role: 'assistant',
                content: 'Error: boom',
                createdAt: 2,
                metadata: { error: true }
            }
        ] as any);

        expect(items[0].lines[0].statusStyle?.color).toBeTruthy();
        expect(items[1].lines[0].statusStyle?.color).toBeTruthy();
        expect(items[0].lines[0].statusStyle?.color).not.toEqual(items[1].lines[0].statusStyle?.color);
    }

    @Test('omits user timestamps while preserving timestamp display for assistant messages')
    renderTimestampsInMeta() {
        const createdAt = new Date(2026, 0, 15, 9, 5).getTime();
        const items = renderAgentConsoleMessageItems([
            { id: 'u1', role: 'user', content: 'hi', createdAt },
            { id: 'a1', role: 'assistant', content: 'hello', createdAt }
        ] as any, { showTimestamps: true });

        expect(items[0].lines[0].meta).toEqual('');
        expect(items[1].lines[0].meta).toContain('09:05');

        const without = renderAgentConsoleMessageItems([
            { id: 'u2', role: 'user', content: 'hi', createdAt }
        ] as any, { showTimestamps: false });
        expect(without[0].lines[0].meta).toEqual('');
    }

    @Test('timeline events show completion duration without a start timestamp')
    renderTimelineCompletionDuration() {
        const createdAt = new Date(2026, 0, 15, 9, 5).getTime();
        const running = renderAgentConsoleMessageItems([{
            id: 'event-running',
            role: 'assistant',
            content: 'Reading files',
            createdAt,
            metadata: { uiKind: 'event', uiEventType: 'tool_invoked', uiEventLabel: 'tool', status: 'running' }
        }] as any, { showTimestamps: true });
        expect(running[0].lines[0].meta).not.toContain('09:05');

        const completed = renderAgentConsoleMessageItems([{
            id: 'event-completed',
            role: 'assistant',
            content: 'Read files',
            createdAt,
            metadata: { uiKind: 'event', uiEventType: 'tool_completed', uiEventLabel: 'tool', status: 'success', durationMs: 1250 }
        }] as any, { showTimestamps: true });
        expect(completed[0].lines[0].tokens.at(-1)?.text).toEqual(' (1.3s)');
        expect(completed[0].lines[0].meta).not.toContain('09:05');
    }

    @Test('timeline event rows use compact hierarchy markers')
    renderTimelineEventHierarchy() {
        const items = renderAgentConsoleMessageItems([{
            id: 'event-tool', role: 'assistant', content: 'Read src/index.ts', createdAt: 1,
            metadata: { uiKind: 'event', uiEventType: 'tool_completed', status: 'success' }
        }] as any, { timelineMode: true });
        expect(items[0].lines[0].role).not.toContain('├─');
        expect(items[0].lines[0].status).toBeTruthy();
        expect(items[0].lines[0].content).toEqual('Read src/index.ts');
    }

    @Test('hides tool output content when showToolOutput is disabled')
    renderToolOutputHidden() {
        const message = {
            id: 't1',
            role: 'tool',
            name: 'read_file',
            content: '{"path":"src/a.ts","truncated":false}',
            createdAt: 1,
            metadata: { receipt: { toolName: 'read_file' } }
        };

        const hidden = renderAgentConsoleMessageItems([message] as any, { showToolOutput: false });
        expect(hidden[0].lines[0].content).toEqual('');

        const visible = renderAgentConsoleMessageItems([message] as any, { showToolOutput: true });
        expect(visible[0].lines[0].content).toEqual('src/a.ts');
    }

    @Test('keeps a larger tool output preview while message detail can use the original content')
    renderToolOutputPreviewAndDetailContent() {
        const content = 'x'.repeat(401);
        const message = {
            id: 't1',
            role: 'tool',
            name: 'terminal',
            content,
            createdAt: 1,
            metadata: { receipt: { toolName: 'terminal' } }
        };
        const preview = renderAgentConsoleMessageItems([message] as any, { showToolOutput: true });
        expect(preview[0].lines[0].content).toEqual(`${'x'.repeat(400)}...[truncated]`);
        expect(message.content).toEqual(content);
    }

    @Test('renders failed and blocked plan items with explicit status and reason')
    renderPlanFailureAndBlockReasons() {
        const items = renderAgentConsoleMessageItems([{
            id: '__plan_todo_inline__',
            role: 'assistant',
            content: '',
            createdAt: 1,
            metadata: {
                uiKind: 'plan-todo',
                planItems: [
                    { id: 'failed', content: 'Run verification', status: 'failed', error: 'test command failed' },
                    { id: 'blocked', content: 'Deploy', status: 'pending', blockedBy: ['failed'], blockedReason: 'awaiting verification' }
                ]
            }
        }] as any);

        const content = items[0].lines.map(line => line.content).join('\n');
        expect(content).toContain('[✗] Run verification · failed: test command failed');
        expect(content).toContain('[⏸] Deploy · blocked: awaiting verification');
    }

    @Test('shows the username label when showUsername is enabled')
    renderUsernameLabels() {
        const items = renderAgentConsoleMessageItems([
            { id: 'u1', role: 'user', content: 'hi', createdAt: 1 },
            { id: 'a1', role: 'assistant', content: 'ok', createdAt: 2 }
        ] as any, { showUsername: true, username: 'alice' });

        expect(items[0].lines[0].role).toContain('alice');
        expect(items[0].lines[0].role).toContain(':');
        expect(items[1].lines[0].role).toContain('agent');

        const without = renderAgentConsoleMessageItems([
            { id: 'u2', role: 'user', content: 'hi', createdAt: 1 }
        ] as any, { showUsername: false, username: 'alice' });
        expect(without[0].lines[0].role).not.toContain('alice');
    }
}
