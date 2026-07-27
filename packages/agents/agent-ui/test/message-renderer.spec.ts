import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import {
    renderAgentConsoleMessageItems,
    resolveAgentConsoleMessageStatus,
    resolveAgentConsoleMessageStatusLabel,
    resolveMessageTemplateKind
} from '../src';

@Suite('Agent console message renderers')
export class AgentConsoleMessageRendererDispatchTest {
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
        expect(items[0].lines[0].lineStyle?.background).toEqual(undefined);
        expect(items[1].lines[0].content).toEqual('world');
        expect(items[1].lines[0].status?.trim()).toEqual('');
        expect(items[1].lines[0].statusKind).toEqual('success');
        expect(items[1].lines[0].statusLabel).toEqual('成功');
        expect(items[1].lines[0].role).toEqual('• ');
        expect(items[1].lines[0].meta).toEqual('');
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

    @Test('keeps streaming assistant content as plain text until completion')
    renderStreamingAssistantAsPlainText() {
        const items = renderAgentConsoleMessageItems([
            {
                id: 'a1',
                role: 'assistant',
                content: '**bold**\n```ts\nconst x = 1;\n```',
                createdAt: 1,
                metadata: { streaming: true }
            }
        ] as any);

        expect(items[0].lines[0].content).toEqual('**bold**');
        expect(items[0].lines[0].status?.trim()).toEqual('');
        expect(items[0].lines[0].statusKind).toEqual('running');
        expect(items[0].lines[0].statusStyle?.color).toBeTruthy();
        expect(items[0].lines.some(line => line.content.includes('```ts'))).toBe(true);
        expect(items[0].lines.some(line => line.content.includes('const x = 1;'))).toBe(true);
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
}
