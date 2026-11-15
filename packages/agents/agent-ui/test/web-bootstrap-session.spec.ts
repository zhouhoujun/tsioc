import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { bootstrapConsole } from '../src/AgentConsoleBootstrap';

/**
 * Regression for the browser mount: `app.state` mints (and tracks) a fresh
 * `chat…` session whenever it is called without an explicit id, so a mount
 * that was told to resume `?session=<id>` must forward that id instead of
 * letting the gateway create an empty phantom session on every reload.
 */

/** Minimal reactive state: unknown setters become no-ops, known fields persist. */
function createState(initial: Record<string, any>): any {
    const target: any = {
        ...initial,
        configure(patch: Record<string, any>) {
            Object.assign(target, patch);
        }
    };
    return new Proxy(target, {
        get(object, key) {
            if (key in object) {
                return object[key];
            }
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

interface BootstrapFixture {
    host: any;
    appStateCalls: Array<string | undefined>;
    opened: Array<string | undefined>;
}

function createBootstrapHost(options: { sessionId?: string; startupWorkspace?: string; enabled?: boolean } = {}): BootstrapFixture {
    const appStateCalls: Array<string | undefined> = [];
    const opened: Array<string | undefined> = [];
    const state = createState({
        sessionId: 'session-1',
        openSessionIds: [],
        messages: [],
        modelProfile: '',
        workspace: '/ws'
    });
    const host: any = {
        state,
        sessionState: state,
        options: {
            model: { provider: 'openai-compatible', model: 'deepseek-chat' },
            bootstrapTurn: { sessionId: options.sessionId || '', enabled: options.enabled !== false }
        },
        startupWorkspace: options.startupWorkspace,
        appRpc: {},
        scheduler: { getTasks: () => [] },
        sessionService: undefined,
        sessionUiState: { forget() {} },
        restoreReviewAnnotationsCacheFromDisk() {},
        ensureWorkspaceMentionResolver() {},
        restoreGlobalKeymap: async () => undefined,
        restoreTheme: async () => undefined,
        restoreStatusline: async () => undefined,
        restoreTitle: async () => undefined,
        restoreRawMode: async () => undefined,
        restoreModelStore: async () => undefined,
        restoreSettings: async () => undefined,
        updateTerminalTitle() {},
        resolveGitBranch: async () => undefined,
        sessionOpenHost: () => ({
            sessionService: undefined,
            state,
            translator: undefined,
            startupWorkspace: options.startupWorkspace,
            options: host.options
        }),
        bootstrapStateFromAppRpc: async (sessionId?: string) => {
            appStateCalls.push(sessionId);
        },
        initializeInputHistory: async () => undefined,
        openSession: async (sessionId?: string) => {
            opened.push(sessionId);
        },
        activateModelProfile: async () => undefined,
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
    return { host, appStateCalls, opened };
}

@Suite('web console bootstrap session')
export class WebConsoleBootstrapSessionTest {

    @Test('an explicit ?session=<id> mount asks app.state for that session, never for an implicit one')
    async resumeForwardsExplicitSession() {
        const { host, appStateCalls, opened } = createBootstrapHost({ sessionId: 's-alpha' });
        await bootstrapConsole(host);
        // `undefined` here means the gateway mints a new chat session.
        expect(appStateCalls).toEqual(['s-alpha']);
        expect(appStateCalls.includes(undefined)).toEqual(false);
        expect(opened).toEqual(['s-alpha']);
    }

    @Test('a plain workspace start lets app.state pick the session, then reports the opened one')
    async freshStartupBootstrapsOpenedSession() {
        const { host, appStateCalls } = createBootstrapHost({ startupWorkspace: '/ws' });
        await bootstrapConsole(host);
        // Fresh startup: no resume round-trip, then the freshly opened
        // session is bootstrapped so the state matches what the host opened.
        expect(appStateCalls).toEqual(['session-1']);
    }

    @Test('a mount without ?session and without a workspace still bootstraps once')
    async plainMountBootstrapsOnce() {
        const { host, appStateCalls } = createBootstrapHost();
        await bootstrapConsole(host);
        expect(appStateCalls).toEqual([undefined]);
    }
}
