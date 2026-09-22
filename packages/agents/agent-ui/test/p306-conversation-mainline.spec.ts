import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { AgentConsoleSessionState, presentAgentConsoleSessionContent, projectAgentConsoleConversationMainline } from '../src';

function message(id: string, role: 'user' | 'assistant', content: string, metadata?: Record<string, any>, parts?: any[]): any {
    return { id, role, content, createdAt: Number(id.replace(/\D/g, '')) || 1, metadata, parts };
}

@Suite('conversation mainline projection (P306)')
export class ConversationMainlineProjectionTest {
    @Test('distinguishes preamble, streaming partial and final')
    phases() {
        expect(presentAgentConsoleSessionContent(message('a1', 'assistant', 'I will inspect.', { preamble: true })).kind)
            .toEqual('assistant-preamble');
        expect(presentAgentConsoleSessionContent(message('a2', 'assistant', 'Working...', { streaming: true })).kind)
            .toEqual('assistant-partial');
        expect(presentAgentConsoleSessionContent(message('a3', 'assistant', 'Done.', { streaming: false })).kind)
            .toEqual('assistant-final');
    }

    @Test('keeps one user anchor and one final across multiple turns')
    multiTurn() {
        const projected = projectAgentConsoleConversationMainline([
            message('u1', 'user', 'First'),
            message('a1', 'assistant', 'First partial', { streaming: true }),
            message('a2', 'assistant', 'First answer', { streaming: false }),
            message('u2', 'user', 'Second'),
            message('a3', 'assistant', 'Second answer', { streaming: false })
        ]);
        expect(projected.map(item => item.id)).toEqual(['u1', 'a2', 'u2', 'a3']);
    }

    @Test('pure Q&A preserves lifecycle events and suppresses replayed final')
    replay() {
        const projected = projectAgentConsoleConversationMainline([
            message('u1', 'user', 'Explain it'),
            message('e1', 'assistant', 'Got your request', { uiKind: 'event', uiEventType: 'turn_started', status: 'running' }),
            message('a1', 'assistant', 'Final answer', { streaming: false }),
            message('a2', 'assistant', 'Final answer', { streaming: false })
        ]);
        expect(projected.map(item => item.id)).toEqual(['u1', 'e1', 'a2']);
    }

    @Test('completed response replaces a persisted partial markdown snapshot')
    persistedPartialSnapshot() {
        const shared = '我这里的实时网页搜索不可用，所以不能核验最新发布细节。下面基于确定趋势做一个谨慎判断。';
        const projected = projectAgentConsoleConversationMainline([
            message('u1', 'user', 'Agent 最新技术发展方向'),
            message('a1', 'assistant', `我先查一下近期公开资料。\n${shared}\n1.\n   -\n   -`, { streaming: false }),
            message('a2', 'assistant', `${shared}\n\n1. 从聊天助手走向可执行系统\n   - 自动写代码\n   - 自动检索资料`, { streaming: false })
        ]);
        expect(projected.map(item => item.id)).toEqual(['u1', 'a2']);
    }

    @Test('tool events stay ordered before the final and preamble is retained as supporting')
    toolThenFinal() {
        const projected = projectAgentConsoleConversationMainline([
            message('u1', 'user', 'Fix it'),
            message('a1', 'assistant', 'I will inspect the code.', { preamble: true }),
            message('e1', 'assistant', 'Read src/a.ts', { uiKind: 'event', uiEventType: 'tool_completed', status: 'success' }),
            message('a2', 'assistant', 'Fixed the issue.', { streaming: false })
        ]);
        expect(projected.map(item => item.id)).toEqual(['u1', 'a1', 'e1', 'a2']);
        expect(presentAgentConsoleSessionContent(projected[1]).priority).toEqual('supporting');
    }

    @Test('no-final turn retains only the latest partial')
    noFinal() {
        const projected = projectAgentConsoleConversationMainline([
            message('u1', 'user', 'Run it'),
            message('a1', 'assistant', 'One', { streaming: true }),
            message('a2', 'assistant', 'One two', { streaming: true })
        ]);
        expect(projected.map(item => item.id)).toEqual(['u1', 'a2']);
    }

    @Test('final keeps markdown and attachment ownership in display projection')
    markdownAttachment() {
        const state = new AgentConsoleSessionState();
        const parts = [{ type: 'file', name: 'report.txt', mediaType: 'text/plain', dataUrl: 'data:text/plain;base64,b2s=' }];
        state.setMessages([
            message('u1', 'user', 'Summarize'),
            message('a1', 'assistant', 'Draft', { streaming: true }),
            message('a2', 'assistant', 'Result\n\n- one\n- two\n\n```ts\nconst ok = true;\n```', { streaming: false }, parts)
        ]);
        const final = state.displayMessages.find(item => item.id === 'a2');
        expect(final?.content).toContain('```ts');
        expect(final?.parts).toBe(parts);
        expect(state.displayMessages.filter(item => item.role === 'assistant').length).toEqual(1);
    }
}
