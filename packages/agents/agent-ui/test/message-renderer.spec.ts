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
            selectedMessageId: 'a1',
            messagesFocused: true
        });

        expect(items.map(item => item.templateKind)).toEqual(['user', 'assistant', 'tool', 'error', 'system']);
        expect(items[0].lines[0].content).toEqual('hello');
        expect(items[0].lines[0].status?.trim()).toEqual('');
        expect(items[1].lines[0].content).toEqual('world');
        expect(items[1].lines[0].status?.trim()).toEqual('●');
        expect(items[1].lines[0].statusKind).toEqual('success');
        expect(items[1].lines[0].statusLabel).toEqual('成功');
        expect(items[1].lines[0].role).toEqual('› agent');
        expect(items[3].lines[0].tokens[0]?.style.color).toBeTruthy();
        expect(items[3].lines[0].status?.trim()).toEqual('●');
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
        expect(items[0].lines[0].status?.trim()).toEqual('●');
        expect(items[0].lines[0].statusKind).toEqual('running');
        expect(items[0].lines[0].statusStyle?.color).toBeTruthy();
        expect(items[0].lines.some(line => line.content.includes('```ts'))).toBe(true);
        expect(items[0].lines.some(line => line.content.includes('const x = 1;'))).toBe(true);
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
