import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { buildConsoleAgentOptions } from '@tsdi/agent-ui/console';
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
    }
}
