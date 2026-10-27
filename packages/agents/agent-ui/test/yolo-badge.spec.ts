import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { agentUiChinese, agentUiEnglish } from '../src/agent-ui.i18n';
import { formatAgentConsoleInputBadges } from '../src/AgentConsoleInputBadges';
import { createConsole, RuntimeStub, SchedulerStub } from './_helpers';

function translateFrom(bundle: any) {
    return (key: string, params?: Record<string, any>) => {
        const current = String(key || '').split('.').reduce<any>((acc, part) => {
            if (acc && typeof acc === 'object' && part in acc) return acc[part];
            return undefined;
        }, (bundle as any)?.messages ?? bundle);
        if (typeof current !== 'string') return key;
        return current.replace(/\{(\w+)\}/g, (_m, name: string) => String(params?.[name] ?? ''));
    };
}

const zh = { translate: translateFrom(agentUiChinese) } as any;
const en = { translate: translateFrom(agentUiEnglish) } as any;

@Suite('auto-approve mode stays visible in the prompt')
export class YoloBadgeTest {

    @Test('the yolo badge renders next to the prompt (en + zh)')
    async badgeRenders() {
        expect(formatAgentConsoleInputBadges({ yoloMode: true }, en)).toEqual(['auto-approve']);
        expect(formatAgentConsoleInputBadges({ yoloMode: true }, zh)).toEqual(['自动批准']);
        expect(formatAgentConsoleInputBadges({ yoloMode: false }, en)).toEqual([]);
    }

    @Test('plan and yolo badges keep their order')
    async badgeOrder() {
        expect(formatAgentConsoleInputBadges({ planMode: true, yoloMode: true }, en)).toEqual(['plan', 'auto-approve']);
    }

    @Test('/yolo on|off flips the state flag the badge reads')
    async yoloCommandSyncsState() {
        const component = createConsole(new RuntimeStub(), new SchedulerStub());
        const state = component.sessionState;
        expect(state.yoloMode).toEqual(false);
        await (component as any).handleCommand('/yolo on');
        expect(state.yoloMode).toEqual(true);
        expect((component as any).yoloMode).toEqual(true);
        await (component as any).handleCommand('/yolo off');
        expect(state.yoloMode).toEqual(false);
        expect((component as any).yoloMode).toEqual(false);
    }

    @Test('restoring the persisted setting also shows the badge')
    async restoredSettingShowsBadge() {
        const component = createConsole(new RuntimeStub(), new SchedulerStub());
        const state = component.sessionState;
        await (component as any).setYoloMode(true, false);
        expect(state.yoloMode).toEqual(true);
        expect(formatAgentConsoleInputBadges(state as any, en)).toContain('auto-approve');
    }
}
