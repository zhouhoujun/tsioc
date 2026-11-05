import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { runMemoriesCommand, runPersonalityCommand } from '../src/AgentConsolePreferenceCommands';
import { AgentConsoleSettingsStore, applyPersistedModelProfile, applyPersistedPreferences } from '../src/AgentConsoleSettingsStore';
import { AgentConsoleComponent } from '../src/AgentConsoleComponent';
import { AgentConsoleSessionState } from '../src/AgentConsoleSessionState';
import { InMemoryCommandExecutionControl } from '@tsdi/agent';
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

    @Test('applyPersistedModelProfile restores the active profile (and live provider/model ids)')
    restoresModelProfile() {
        const options: any = {
            model: {
                provider: 'openai-compatible',
                model: 'gpt-5.5',
                profiles: { 'deepseek-fast': { provider: 'deepseek', model: 'deepseek-flash', baseUrl: 'https://api.deepseek.com' } }
            }
        };
        options.model.apiKey = 'old-key';
        options.model.baseUrl = 'http://old.example';
        applyPersistedModelProfile(options, 'deepseek-fast');
        expect(options.model.defaultProfile).toEqual('deepseek-fast');
        expect(options.model.provider).toEqual('deepseek');
        expect(options.model.model).toEqual('deepseek-flash');
        expect(options.model.baseUrl).toEqual('https://api.deepseek.com');
        expect(options.model.apiKey).toBeUndefined();

        // A same-provider tier switch must keep the active credential; otherwise
        // startup with a persisted strong profile sends an unauthenticated turn.
        const sameProvider: any = {
            model: {
                provider: 'openai-compatible', model: 'gpt-5.5', apiKey: 'shared-key',
                baseUrl: 'https://provider.example', headers: { 'X-Org': 'acme' },
                profiles: { strong: { provider: 'openai-compatible', model: 'gpt-5.6' } }
            }
        };
        applyPersistedModelProfile(sameProvider, 'strong');
        expect(sameProvider.model.model).toEqual('gpt-5.6');
        expect(sameProvider.model.apiKey).toEqual('shared-key');
        expect(sameProvider.model.baseUrl).toEqual('https://provider.example');
        expect(sameProvider.model.headers).toEqual({ 'X-Org': 'acme' });

        const catalog: any = { model: { provider: 'openai-compatible', model: 'gpt-5.5', profiles: { 'alt': { provider: 'alt', model: 'x', baseUrl: 'https://alt.example' } } } };
        applyPersistedModelProfile(catalog, 'alt/live-model');
        expect(catalog.model.provider).toEqual('alt');
        expect(catalog.model.model).toEqual('live-model');
        expect(catalog.model.baseUrl).toEqual('https://alt.example');

        // Tier labels persisted as direct model ids (a stale profile bug) must
        // be rejected instead of routing turns to a nonexistent model.
        const staleTier: any = { model: { provider: 'openai-compatible', model: 'deepseek-chat' } };
        expect(applyPersistedModelProfile(staleTier, 'openai-compatible/strong')).toBe(false);
        expect(staleTier.model.model).toEqual('deepseek-chat');

        const known: any = { model: { provider: 'openai-compatible', model: 'gpt-5.5', baseUrl: 'https://old.example', apiKey: 'old' } };
        applyPersistedModelProfile(known, 'deepseek/gpt-6.1-sol');
        expect(known.model.provider).toEqual('deepseek');
        expect(known.model.model).toEqual('gpt-6.1-sol');
        expect(known.model.baseUrl).toContain('deepseek.com');
        expect(known.model.apiKey).toBeUndefined();
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

            await store.save(workspace, { personality: 'friendly', memoryInjection: true, modelProfile: 'deepseek-fast' });
            expect((await store.load(workspace)).memoryInjection).toEqual(true);
            expect((await store.load(workspace)).modelProfile).toEqual('deepseek-fast');
            await store.save(workspace, { openSessionIds: ['chat-a', 'chat-b', 'chat-a', '   '] });
            expect((await store.load(workspace)).openSessionIds).toEqual(['chat-a', 'chat-b']);
        } finally {
            fs.rmSync(workspace, { recursive: true, force: true });
        }
    }

    @Test('restoring workspace settings loads the recorded open tab set')
    async restoresOpenSessions() {
        const workspace = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-ui-open-tabs-'));
        try {
            const store = new AgentConsoleSettingsStore(new TestFileAdapter());
            await store.save(workspace, { lastSessionId: 'chat-b', openSessionIds: ['chat-a', 'chat-b'] });
            const component: any = Object.create(AgentConsoleComponent.prototype);
            component.state = new AgentConsoleSessionState(new InMemoryCommandExecutionControl());
            component.settingsStore = store;
            component.options = { ui: {} };
            component.resolveHistoryWorkspace = () => workspace;
            await component.restoreSettings();
            expect(component.state.openSessionIds).toEqual(['chat-a', 'chat-b']);
        } finally {
            fs.rmSync(workspace, { recursive: true, force: true });
        }
    }
}
