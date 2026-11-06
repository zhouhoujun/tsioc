import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { dispatchAgentConsoleCommand } from '../src/AgentConsoleCommandDispatch';

/**
 * P319: unknown/ambiguous command errors were hardcoded English
 * (`Unknown command: /x`) even under a zh locale.
 */
@Suite('command dispatch errors are localized (P319)')
export class CommandDispatchI18nTest {
    private host(locale: string) {
        const notices: string[] = [];
        const state = {
            commandHints: ['/help'],
            translateLabel: (key: string, params: any, fallback: string) => {
                if (locale !== 'zh-CN') return fallback;
                if (key === 'agent.command.unknown') return `未知命令：${params?.command}`;
                if (key === 'agent.command.ambiguous') return `命令不唯一：${params?.command}（${params?.matches}）`;
                return fallback;
            },
            commandExecutionController: {
                begin: () => 'req-1',
                fail: () => undefined,
                complete: () => undefined,
                isCurrent: () => true,
                signal: () => undefined
            },
            setInput: () => undefined
        } as any;
        const host = {
            state,
            pendingCommandRequestId: '',
            resolveUniqueCommandPrefix: (input: string) => ({ command: input, matches: [] }),
            notify: (message: string) => { notices.push(message); },
            buildCommandContext: () => ({}) as any
        } as any;
        return { host, notices };
    }

    @Test('a zh host renders the unknown-command error in Chinese')
    async unknownLocalized() {
        const { host, notices } = this.host('zh-CN');
        const handled = await dispatchAgentConsoleCommand(host, '/zzz-unknown');
        expect(handled).toBe(true);
        expect(notices[0]).toBe('未知命令：/zzz-unknown');
    }

    @Test('a command wraps its popup burst in a render batch')
    async renderBatch() {
        const { host } = this.host('en');
        let begins = 0;
        let ends = 0;
        host.beginRenderBatch = () => { begins += 1; };
        host.endRenderBatch = () => { ends += 1; };
        await dispatchAgentConsoleCommand(host, '/zzz-unknown');
        expect(begins).toEqual(1);
        expect(ends).toEqual(1);
    }

    @Test('an en host keeps the English fallback')
    async unknownEnglish() {
        const { host, notices } = this.host('en');
        await dispatchAgentConsoleCommand(host, '/zzz-unknown');
        expect(notices[0]).toBe('Unknown command: /zzz-unknown');
    }
}
