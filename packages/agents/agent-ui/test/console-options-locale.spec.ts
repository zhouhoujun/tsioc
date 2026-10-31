import { InMemoryCommandExecutionControl } from '@tsdi/agent';
import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { AgentConsoleSessionState, defaultAgentConsoleOptions } from '../src';
import { agentUiChinese, agentUiEnglish } from '../src/agent-ui.i18n';

function translateFrom(bundle: any) {
    return (key: string, params?: Record<string, any>) => {
        let current: any = bundle.messages;
        for (const part of key.split('.')) {
            if (current && typeof current === 'object' && part in current) current = current[part];
            else return key;
        }
        return typeof current === 'string'
            ? current.replace(/\{(\w+)\}/g, (_m: string, name: string) => String(params?.[name] ?? ''))
            : key;
    };
}

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

    @Test('the plan row is rebuilt when the locale arrives after session open')
    planRowFollowsLocale() {
        let locale = 'en';
        const translator: any = {
            get currentLocale() { return locale === 'zh' ? 'zh-CN' : 'en-US'; },
            translate: (key: string, params?: Record<string, any>) =>
                (locale === 'zh' ? translateFrom(agentUiChinese) : translateFrom(agentUiEnglish))(key, params)
        };
        const state = new AgentConsoleSessionState(new InMemoryCommandExecutionControl(), translator);
        state.applyLocaleDefaults('en-US');
        state.setPlanTodos(Array.from({ length: 9 }, (_value, index) => ({
            id: `p${index + 1}`,
            content: `step ${index + 1}`,
            status: 'pending'
        })) as any);
        expect((state as any).planMessage?.content).toContain('steps');
        locale = 'zh';
        state.applyLocaleDefaults('zh-CN');
        expect((state as any).planMessage?.content).toContain('步');
        expect((state as any).planMessage?.content).not.toContain('steps');
    }

    @Test('English locale keeps the English hints')
    englishHintsStay() {
        const state = new AgentConsoleSessionState(new InMemoryCommandExecutionControl());
        state.applyLocaleDefaults('en-US');
        state.setConsoleOptions({ ...defaultAgentConsoleOptions });
        expect(state.consoleOptions.messagesHint).toEqual(defaultAgentConsoleOptions.messagesHint);
    }
}
