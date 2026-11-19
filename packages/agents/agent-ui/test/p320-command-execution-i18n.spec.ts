import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { InMemoryCommandExecutionControl } from '@tsdi/agent';
import { AgentConsoleSessionState } from '../src';

/**
 * P320: the projected command-execution row (`$ /x failed: …`) hardcoded its
 * status word in English, so a zh host showed `failed` / `completed`.
 */
@Suite('command execution rows are localized (P320)')
export class CommandExecutionI18nTest {
    private translator = {
        currentLocale: 'zh-CN',
        translate: (key: string) => ({
            'agent.command.status.failed': '失败',
            'agent.command.status.completed': '已完成',
            'agent.command.label': '命令'
        } as Record<string, string>)[key] ?? key
    };

    @Test('a failed command row renders the localized status word')
    async failedRowLocalized() {
        const state = new AgentConsoleSessionState(new InMemoryCommandExecutionControl(), this.translator as any);
        const requestId = state.commandExecutionController.begin('/zzz-unknown', '');
        state.commandExecutionController.fail(requestId, '未知命令', false);
        const row = (state as any).commandExecutionMessages.find((message: any) => (message.metadata as any)?.uiKind === 'command-execution');
        expect(!!row).toBe(true);
        expect(row?.content).toContain('失败');
        expect(row?.content).not.toContain(' failed');
    }

    @Test('a successful slash-command echo stays out of the transcript')
    async successEchoIsNotAConversationRow() {
        const state = new AgentConsoleSessionState(new InMemoryCommandExecutionControl());
        state.setMessages([
            { id: 'u1', role: 'user', content: 'hello', createdAt: 1 },
            { id: 'a-partial', role: 'assistant', content: 'working', createdAt: 2, metadata: { streaming: true } },
            { id: 'a-final', role: 'assistant', content: 'final answer', createdAt: 3 }
        ] as any);
        const requestId = state.commandExecutionController.begin('/web', '');
        state.commandExecutionController.complete(requestId, 'succeeded');
        const ids = state.displayMessages.map(message => message.id);
        // Commands open dialogs / emit notices; they must not leave a
        // "✓ $ /web completed" row that pushes the answer up.
        expect(ids.some(id => id.includes('__command_execution_'))).toEqual(false);
        expect(ids[ids.length - 1]).toEqual('a-final');
        expect(ids.indexOf('u1')).toBeLessThan(ids.indexOf('a-final'));
    }

    @Test('a failed slash-command echo stays visible with its error')
    async failedEchoStaysVisible() {
        const state = new AgentConsoleSessionState(new InMemoryCommandExecutionControl());
        const requestId = state.commandExecutionController.begin('/zzz-unknown', '');
        state.commandExecutionController.fail(requestId, 'unknown command', false);
        const rows = state.displayMessages.filter(message => (message.metadata as any)?.uiKind === 'command-execution');
        expect(rows.length).toEqual(1);
        expect(rows[0].content).toContain('unknown command');
    }

    @Test('a shell command execution stays in the turn narrative')
    async shellExecutionStaysVisible() {
        const state = new AgentConsoleSessionState(new InMemoryCommandExecutionControl());
        state.projectThreadItem({
            kind: 'command', key: 'shell-1', sessionId: state.sessionId,
            content: 'npm test completed', status: 'success',
            command: 'npm', args: 'test', sequence: 1
        });
        const rows = state.displayMessages.filter(message => (message.metadata as any)?.uiKind === 'command-execution');
        expect(rows.length).toEqual(1);
        expect(rows[0].metadata?.command).toEqual('npm');
    }

    @Test('without a translator the English status word is kept')
    async fallbackRow() {
        const state = new AgentConsoleSessionState(new InMemoryCommandExecutionControl());
        const requestId = state.commandExecutionController.begin('/zzz-unknown', '');
        state.commandExecutionController.fail(requestId, 'boom', false);
        const row = (state as any).commandExecutionMessages.find((message: any) => (message.metadata as any)?.uiKind === 'command-execution');
        expect(row?.content).toContain('failed');
    }
}
