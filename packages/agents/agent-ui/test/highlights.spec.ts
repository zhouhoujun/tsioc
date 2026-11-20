import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { createConsole, RuntimeStub, SchedulerStub } from './_helpers';
import {
    AGENT_CONSOLE_HIGHLIGHTS_VERSION,
    buildAgentConsoleHighlightLines,
    maybeShowHighlights
} from '../src/AgentConsoleHighlights';
import { restoreSettings } from '../src/AgentConsoleSettingsRuntime';

@Suite('release highlights')
export class HighlightsTest {
    @Test('/highlights opens the panel and records the acknowledged version')
    async commandOpensPanel() {
        const component = createConsole(new RuntimeStub(), new SchedulerStub());
        const persisted: any[] = [];
        (component as any).persistSettings = async (patch: any) => { persisted.push(patch); };
        await component.onInit();

        await (component as any).handleCommand('/highlights');

        const overlay = component.sessionState.textOverlay;
        expect(overlay?.title).toContain(AGENT_CONSOLE_HIGHLIGHTS_VERSION);
        const text = overlay?.lines.join('\n') || '';
        expect(text).toContain('LSP diagnostics and formatting');
        expect(text).toContain('read-only shell commands');
        expect(persisted[persisted.length - 1]).toEqual({ highlightsSeenVersion: AGENT_CONSOLE_HIGHLIGHTS_VERSION });
    }

    @Test('maybeShowHighlights only runs once per version and honours opt-out')
    async autoShowRules() {
        const overlays: any[] = [];
        const persisted: any[] = [];
        const host: any = {
            state: { openTextOverlay: (title: string, lines: string[]) => overlays.push({ title, lines }) },
            persistSettings: async (patch: any) => { persisted.push(patch); }
        };

        await maybeShowHighlights(host, null);
        await maybeShowHighlights(host, { highlights: true });
        expect(overlays.length).toEqual(0);

        await maybeShowHighlights(host, { highlights: true, highlightsSeenVersion: AGENT_CONSOLE_HIGHLIGHTS_VERSION });
        expect(overlays.length).toEqual(0);

        await maybeShowHighlights(host, { highlights: false, highlightsSeenVersion: '6.0.30' });
        expect(overlays.length).toEqual(0);

        await maybeShowHighlights(host, { highlights: true, highlightsSeenVersion: '6.0.30' });
        expect(overlays.length).toEqual(1);
        expect(persisted[persisted.length - 1]).toEqual({ highlightsSeenVersion: AGENT_CONSOLE_HIGHLIGHTS_VERSION });
    }

    @Test('highlight lines keep a dash-prefixed, localized list')
    localizesLines() {
        const lines = buildAgentConsoleHighlightLines({
            translate: (key: string) => key === 'highlightsItemLsp' ? 'LSP 面板' : key
        } as any);
        expect(lines.length).toEqual(4);
        expect(lines[0]).toEqual('· LSP 面板');
        expect(lines[1].startsWith('· ')).toEqual(true);
    }

    @Test('restoring settings auto-shows once for an older version unless opted out')
    async restoreWiring() {
        const component = createConsole(new RuntimeStub(), new SchedulerStub());
        const saves: any[] = [];
        (component as any).settingsStore = {
            load: async () => ({ highlights: true, highlightsSeenVersion: '6.0.30' }),
            save: async (_workspace: string, data: any) => { saves.push(data); }
        };
        await component.onInit();
        await restoreSettings(component);
        expect(component.sessionState.textOverlay?.title).toContain(AGENT_CONSOLE_HIGHLIGHTS_VERSION);
        expect(saves[saves.length - 1].highlightsSeenVersion).toEqual(AGENT_CONSOLE_HIGHLIGHTS_VERSION);

        const optedOut = createConsole(new RuntimeStub(), new SchedulerStub());
        (optedOut as any).settingsStore = {
            load: async () => ({ highlights: false, highlightsSeenVersion: '6.0.30' }),
            save: async () => undefined
        };
        await optedOut.onInit();
        await restoreSettings(optedOut);
        expect(optedOut.sessionState.textOverlay).toEqual(null);
    }
}
