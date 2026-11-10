import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { bootstrapConsole } from '../src/AgentConsoleBootstrap';
import { applyPersistedModelProfile } from '../src/AgentConsoleSettingsStore';
import { restoreSettings } from '../src/AgentConsoleSettingsRuntime';

/** Minimal reactive state: unknown setters become no-ops, known fields persist. */
function createState(initial: Record<string, any>): any {
    const target: any = {
        ...initial,
        configure(patch: Record<string, any>) {
            Object.assign(target, patch);
        },
        setModelProfile(value: string) {
            target.modelProfile = value;
        }
    };
    return new Proxy(target, {
        get(object, key) {
            if (key in object) {
                return object[key];
            }
            // Only imperative setters used by the bootstrap lifecycle are
            // stubbed; data reads (securityLevel, modelProfile, …) stay real.
            return typeof key === 'string' && /^(set|clear|push|append|upsert|request|refresh|notify|schedule|resolve)/.test(key)
                ? () => undefined
                : undefined;
        },
        set(object, key, value) {
            object[key] = value;
            return true;
        }
    });
}

function createOptions() {
    return {
        model: {
            provider: 'openai-compatible',
            model: 'deepseek-chat',
            defaultProfile: 'strong',
            profiles: {
                strong: { provider: 'openai-compatible', model: 'deepseek-chat' }
            }
        }
    };
}

function createBootstrapHost() {
    const activations: string[] = [];
    const state = createState({
        sessionId: 'session-1',
        modelProfile: 'deepseek/deepseek-flash',
        openSessionIds: [],
        messages: [],
        workspace: '/ws'
    });
    const host: any = {
        state,
        sessionState: state,
        options: {
            ...createOptions(),
            bootstrapTurn: { sessionId: '', enabled: true }
        },
        startupWorkspace: undefined,
        appRpc: {},
        scheduler: { getTasks: () => [] },
        sessionService: undefined,
        restoreReviewAnnotationsCacheFromDisk() {},
        ensureWorkspaceMentionResolver() {},
        restoreGlobalKeymap: async () => undefined,
        restoreTheme: async () => undefined,
        restoreStatusline: async () => undefined,
        restoreTitle: async () => undefined,
        restoreRawMode: async () => undefined,
        restoreModelStore: async () => undefined,
        // `restoreSettings` already applied the persisted direct profile.
        restoreSettings: async () => undefined,
        updateTerminalTitle() {},
        resolveGitBranch: async () => undefined,
        sessionOpenHost: () => ({ state, sessionService: undefined }),
        // Opening a session reads app.state, which still reports the
        // runtime's untouched default profile.
        bootstrapStateFromAppRpc: async () => {
            state.configure({ modelProfile: 'strong', provider: 'openai-compatible', model: 'deepseek-chat' });
        },
        initializeInputHistory: async () => undefined,
        openSession: async () => {
            state.configure({ modelProfile: 'strong', provider: 'openai-compatible', model: 'deepseek-chat' });
        },
        activateModelProfile: async (name: string) => {
            activations.push(name);
            state.setModelProfile(name);
        },
        bridge: { bindState() {}, subscribe: async () => undefined },
        scheduleInputHistoryRestore() {},
        refreshTools: async () => undefined,
        refreshMentionCatalog: async () => undefined,
        refreshScheduledTasks: async () => undefined,
        refreshUsageDigest: async () => undefined,
        refreshSummaryQualityDigest: async () => undefined,
        refreshCompactionDigest: async () => undefined,
        refreshTurnDiagnosticsDigest: async () => undefined
    };
    return { host, activations, state };
}

@Suite('console model profile restore')
export class ModelProfileRestoreTest {
    @Test('a persisted catalog model profile survives the app.state round-trip on startup')
    async bootstrapKeepsPersistedCatalogProfile() {
        const { host, activations, state } = createBootstrapHost();
        await bootstrapConsole(host);
        // The openSession/app.state reset to `strong` must not win over the
        // persisted `provider/model` selection.
        expect(activations).toEqual(['deepseek/deepseek-flash']);
        expect(state.modelProfile).toEqual('deepseek/deepseek-flash');
        expect(host.options.model.provider).toEqual('deepseek');
        expect(host.options.model.model).toEqual('deepseek-flash');
    }

    @Test('a restored catalog model keeps the key of an identical endpoint')
    async restoredCatalogKeepsSameEndpointKey() {
        const options: any = {
            model: {
                provider: 'openai-compatible',
                model: 'deepseek-chat',
                baseUrl: 'https://api.deepseek.com',
                apiKey: 'sk-active',
                apiKeyEnv: 'OPENAI_API_KEY',
                headers: { 'x-trace': 'on' }
            }
        };
        expect(applyPersistedModelProfile(options, 'deepseek/deepseek-flash')).toEqual(true);
        expect(options.model.provider).toEqual('deepseek');
        expect(options.model.model).toEqual('deepseek-flash');
        expect(options.model.apiKey).toEqual('sk-active');
        expect(options.model.apiKeyEnv).toEqual('OPENAI_API_KEY');
        expect(options.model.headers).toEqual({ 'x-trace': 'on' });
    }

    @Test('a restored catalog model on another endpoint clears old credentials')
    async restoredCatalogClearsDifferentEndpointKey() {
        const options: any = {
            model: {
                provider: 'openai-compatible',
                model: 'proxy-model',
                baseUrl: 'https://proxy.example/v1',
                apiKey: 'sk-proxy',
                headers: { 'x-proxy': '1' }
            }
        };
        expect(applyPersistedModelProfile(options, 'deepseek/deepseek-flash')).toEqual(true);
        expect(options.model.apiKey).toBeUndefined();
        expect(options.model.headers).toBeUndefined();
        expect(options.model.apiKeyEnv).toEqual('DEEPSEEK_API_KEY');
    }

    @Test('restoring a direct profile also updates the runtime adapter options')
    async restoreSyncsRuntimeOptions() {
        const updates: any[] = [];
        const state = createState({ modelProfile: '', model: '', provider: '' });
        const self: any = {
            options: createOptions(),
            state,
            settingsStore: {
                load: async () => ({ modelProfile: 'deepseek/deepseek-flash' })
            },
            resolveHistoryWorkspace: () => '/ws',
            runtime: { updateModelOptions: (model: any) => updates.push(model) },
            translator: undefined,
            updateTerminalTitle() {}
        };
        await restoreSettings(self);
        expect(state.modelProfile).toEqual('deepseek/deepseek-flash');
        expect(self.options.model.provider).toEqual('deepseek');
        expect(self.options.model.model).toEqual('deepseek-flash');
        expect(updates.length).toEqual(1);
        expect(updates[0].model).toEqual('deepseek-flash');
    }
}
