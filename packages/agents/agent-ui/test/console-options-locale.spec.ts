import { InMemoryCommandExecutionControl } from '@tsdi/agent';
import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { AgentConsoleSessionState, defaultAgentConsoleOptions } from '../src';

/**
 * Real TUI finding: a host that forwards the full built-in options object
 * (`{...defaultAgentConsoleOptions}`) marked every English hint as
 * "host-provided", so the zh console kept rendering
 * `up/down move   pg jump   enter open   y copy   esc` in the message focus
 * hint. Built-in English hints are not user configuration.
 */
@Suite('console options follow the locale')
export class ConsoleOptionsLocaleTest {
    @Test('English default hints do not block the zh overrides')
    defaultHintsFollowLocale() {
        const state = new AgentConsoleSessionState(new InMemoryCommandExecutionControl());
        state.applyLocaleDefaults('zh-CN');
        state.setConsoleOptions({ ...defaultAgentConsoleOptions });
        expect(state.consoleOptions.messagesHint).toEqual('上/下 移动   pg 跳转   回车 打开   y 复制   esc');
        expect(state.consoleOptions.toolsHint).toEqual('上/下 移动   pg 跳转   回车 激活   y 复制   esc');
        expect(state.consoleOptions.sessionHint).toContain('输入以搜索');
    }

    @Test('a host-specific hint still wins over the locale defaults')
    hostHintWins() {
        const state = new AgentConsoleSessionState(new InMemoryCommandExecutionControl());
        state.applyLocaleDefaults('zh-CN');
        state.setConsoleOptions({ messagesHint: 'custom hint' });
        expect(state.consoleOptions.messagesHint).toEqual('custom hint');
    }

    @Test('English locale keeps the English hints')
    englishHintsStay() {
        const state = new AgentConsoleSessionState(new InMemoryCommandExecutionControl());
        state.applyLocaleDefaults('en-US');
        state.setConsoleOptions({ ...defaultAgentConsoleOptions });
        expect(state.consoleOptions.messagesHint).toEqual(defaultAgentConsoleOptions.messagesHint);
    }
}
