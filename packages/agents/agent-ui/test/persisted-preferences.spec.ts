import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { runMemoriesCommand, runPersonalityCommand } from '../src/AgentConsolePreferenceCommands';
import { AgentConsoleSettingsStore, applyPersistedPreferences } from '../src/AgentConsoleSettingsStore';
import { TestFileAdapter } from './_helpers';

function preferenceHost() {
    const options: any = { ui: {} };
    const patches: Array<Record<string, any>> = [];
    const notices: string[] = [];
    const host: any = {
        state: { sessionId: 'session-1', projectKey: 'project-1' },
        options,
        runtime: {},
        rpcRequestContext: () => ({}),
        notify: (message: string) => notices.push(message),
        pushCommandOutput: () => undefined,
        persistSettings: async (patch: Record<string, any>) => { patches.push(patch); }
    };
    return { host, options, patches, notices };
}

@Suite('persisted console preferences')
export class PersistedPreferencesTest {
    @Test('/personality set and unset persist the preset and update the runtime options')
    async personalityPersists() {
        const { host, options, patches } = preferenceHost();
        await runPersonalityCommand(host, 'set concise');
        expect(options.ui.personality).toEqual('concise');
        expect(patches).toEqual([{ personality: 'concise' }]);

        await runPersonalityCommand(host, 'unset');
        expect(options.ui.personality).toEqual(undefined);
        expect(patches[1]).toEqual({ personality: undefined });
    }

    @Test('/memories on and off persist the injection switch')
    async memoriesPersist() {
        const { host, options, patches } = preferenceHost();
        await runMemoriesCommand(host, 'off');
        expect(options.ui.memoryInjection).toEqual(false);
        expect(patches).toEqual([{ memoryInjection: false }]);

        await runMemoriesCommand(host, 'on');
        expect(options.ui.memoryInjection).toEqual(true);
        expect(patches[1]).toEqual({ memoryInjection: true });
    }

    @Test('applyPersistedPreferences restores both values at startup')
    restore() {
        const options: any = { ui: { theme: 'dark' } };
        applyPersistedPreferences(options, { personality: 'terse', memoryInjection: false });
        expect(options.ui.personality).toEqual('terse');
        expect(options.ui.memoryInjection).toEqual(false);
        expect(options.ui.theme).toEqual('dark');

        applyPersistedPreferences(options, { personality: '   ' });
        expect(options.ui.personality).toEqual('terse');
    }

    @Test('applyPersistedPreferences restores the persisted thinking level into the model options')
    thinkingLevel() {
        const options: any = { ui: {}, model: { model: 'gpt-6.1-sol' } };
        applyPersistedPreferences(options, { thinkingLevel: 'max' });
        expect(options.model.reasoningEffort).toEqual('max');
        expect(options.model.model).toEqual('gpt-6.1-sol');
    }

    @Test('settings store round-trips personality and memory injection')
    async storeRoundTrip() {
        const workspace = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-ui-prefs-'));
        try {
            const store = new AgentConsoleSettingsStore(new TestFileAdapter());
            await store.save(workspace, { personality: 'friendly', memoryInjection: false });
            const loaded = await store.load(workspace);
            expect(loaded.personality).toEqual('friendly');
            expect(loaded.memoryInjection).toEqual(false);

            await store.save(workspace, { personality: 'friendly', memoryInjection: true });
            expect((await store.load(workspace)).memoryInjection).toEqual(true);
        } finally {
            fs.rmSync(workspace, { recursive: true, force: true });
        }
    }
}
