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

    @Test('without a translator the English status word is kept')
    async fallbackRow() {
        const state = new AgentConsoleSessionState(new InMemoryCommandExecutionControl());
        const requestId = state.commandExecutionController.begin('/zzz-unknown', '');
        state.commandExecutionController.fail(requestId, 'boom', false);
        const row = (state as any).commandExecutionMessages.find((message: any) => (message.metadata as any)?.uiKind === 'command-execution');
        expect(row?.content).toContain('failed');
    }
}
