import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { buildConsoleAgentOptions, resolveExplicitSessionId } from '@tsdi/agent-ui/console';
import { AgentUiResolvedConfig } from '@tsdi/agent-ui';

@Suite('Agent console platform policy')
export class AgentConsolePlatformPolicyTest {
    @Test('forces compact working presentation in the shell TUI')
    compactWorkingPresentation() {
        const resolved = {
            workspace: '/work',
            hooks: {},
            model: { provider: 'echo', model: 'echo' },
            tui: {}
        } as AgentUiResolvedConfig;
        const options = buildConsoleAgentOptions(resolved, {}, {
            ui: { console: { workingPresentation: 'dashboard' } }
        });
        expect(options.ui.console.workingPresentation).toEqual('compact');
        expect(options.ui.console.showStatusline).toEqual(false);
        expect(options.ui.console.showMessageTimestamps).toEqual(false);
        expect(options.ui.console.messageToggleInteraction).toEqual('enter');
    }

    @Test('plain chat has no resume session and defaults to stream layout')
    plainChatStartsFreshStream() {
        const resolved = { workspace: '/work', hooks: {}, model: { provider: 'echo', model: 'echo' }, tui: {} } as AgentUiResolvedConfig;
        const options = buildConsoleAgentOptions(resolved, {}, {});
        expect(resolveExplicitSessionId({}, {})).toEqual(undefined);
        expect(options.bootstrapTurn.enabled).toEqual(false);
        expect(options.bootstrapTurn.sessionId).toEqual('');
        expect(options.ui.console.messageLayout).toEqual('stream');
    }

    @Test('explicit session is preserved for transcript resume')
    explicitSessionIsResumeOnly() {
        const resolved = { workspace: '/work', hooks: {}, model: { provider: 'echo', model: 'echo' }, tui: {} } as AgentUiResolvedConfig;
        const options = buildConsoleAgentOptions(resolved, { session: 'chat0123456789abcdef0123456789abcdef' }, {});
        expect(resolveExplicitSessionId({ session: 'chat0123456789abcdef0123456789abcdef' }, {})).toEqual('chat0123456789abcdef0123456789abcdef');
        expect(options.bootstrapTurn.sessionId).toEqual('chat0123456789abcdef0123456789abcdef');
        expect(options.ui.console.messageLayout).toEqual('stream');
    }
}
