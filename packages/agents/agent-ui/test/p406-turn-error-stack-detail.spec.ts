import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { ModelRequestError, ModelFailure } from '@tsdi/agent';
import { agentUiChinese, agentUiEnglish } from '../src/agent-ui.i18n';
import { AgentConsoleSessionState } from '../src/AgentConsoleSessionState';
import { AgentConsoleTurnInputHost, submitView } from '../src/AgentConsoleTurnInputController';

/**
 * P406: a turn failure must be able to surface the throw-site stack.
 *
 * A second-turn `NodeInjector has already been destroyed` reached the transcript as a
 * bare one-line message, so the destroy/injection race was undiagnosable. The stack now
 * survives the JSON-RPC hop (`toAppRpcError` -> `data.stack` -> `buildRpcError`), but the
 * turn error path read `error.message` only and dropped it again on the last hop.
 *
 * Stacks are gated behind `TSDI_AGENT_DEBUG` (the convention `cli-error-format.ts`
 * already established) so ordinary failures keep their compact one-line form; error rows
 * already stay expanded so the appended frames are visible without extra interaction.
 */

/** Runs `fn` with `TSDI_AGENT_DEBUG` forced to `value` (undefined deletes the key). */
async function withDebugEnv<T>(value: string | undefined, fn: () => Promise<T>): Promise<T> {
    const env = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env;
    if (!env) {
        return fn();
    }
    const previous = env.TSDI_AGENT_DEBUG;
    if (value === undefined) {
        delete env.TSDI_AGENT_DEBUG;
    } else {
        env.TSDI_AGENT_DEBUG = value;
    }
    try {
        return await fn();
    } finally {
        if (previous === undefined) {
            delete env.TSDI_AGENT_DEBUG;
        } else {
            env.TSDI_AGENT_DEBUG = previous;
        }
    }
}

function quotaFailure(): ModelFailure {
    return {
        kind: 'quota',
        status: 402,
        provider: 'deepseek',
        model: 'deepseek-flash',
        detail: 'Insufficient Balance',
        retryable: false
    };
}

function translateFrom(bundle: typeof agentUiEnglish) {
    return (key: string, params?: Record<string, any>) => {
        const parts = key.split('.');
        let current: any = bundle.messages;
        for (const part of parts) {
            if (current && typeof current === 'object' && part in current) {
                current = current[part];
            } else {
                return key;
            }
        }
        if (typeof current !== 'string') {
            return key;
        }
        return current.replace(/\{(\w+)\}/g, (_m, name: string) => String(params?.[name] ?? ''));
    };
}

const en = translateFrom(agentUiEnglish);
const zh = translateFrom(agentUiChinese);

/**
 * Host over the real `AgentConsoleSessionState`, so assertions read genuinely stored
 * transcript content rather than a recorded call argument. `rejection` is what
 * `runTurnStream` rejects with — i.e. exactly what the RPC client would have thrown.
 */
function createHost(rejection: unknown, translate?: (key: string, params?: Record<string, any>) => string): AgentConsoleTurnInputHost {
    const state = new AgentConsoleSessionState();
    state.input = 'implement the import command';
    state.sessionId = 'session-1';
    return {
        state,
        draftLines: [],
        multilineMode: false,
        shellMultilineMode: false,
        shellDraftLines: [],
        editTargetMessageId: '',
        lastEditSessionMessageId: '',
        editDismissedAt: 0,
        activeTurnRun: null,
        scheduler: { getTasks: () => [] },
        isTurnInProgress: () => false,
        isSteerModeEnabled: () => false,
        isQueueModeEnabled: () => false,
        notifyBusyState: () => undefined,
        enrichPromptWithMentions: async (input: string) => input,
        buildTurnMessageInput: () => undefined,
        consumePendingTurnModelProfile: () => undefined,
        persistInputHistory: async () => undefined,
        clearStreamingMessageState: () => undefined,
        updateTerminalTitle: () => undefined,
        runTurnStream: async () => {
            throw rejection;
        },
        ensureMessageAtTail: () => undefined,
        advanceProviderWizard: async () => undefined,
        notify: () => undefined,
        handleShellBang: async () => false,
        handleCommand: async () => false,
        interruptTurn: async () => undefined,
        enqueuePrompt: () => undefined,
        openSession: async () => undefined,
        resolveMentionDisplayFiles: () => [],
        refreshTurnArtifacts: async () => undefined,
        drainQueuedPrompts: async () => undefined,
        translate
    } as unknown as AgentConsoleTurnInputHost;
}

function lastAssistantContent(host: AgentConsoleTurnInputHost): string {
    const messages = host.state.messages;
    return String(messages[messages.length - 1]?.content || '');
}

/** A frame line of a real V8 stack: whitespace + "at " + a call site. */
function hasStackFrame(content: string): boolean {
    return /\n\s+at\s/.test(content);
}

@Suite('turn error stack detail (P406)')
export class TurnErrorStackDetailTest {

    @Test('debug mode surfaces the throw-site stack frames in the transcript')
    async debugShowsStack() {
        const host = createHost(new Error('NodeInjector has already been destroyed'), en);
        await withDebugEnv('1', () => submitView(host));
        const content = lastAssistantContent(host);
        expect(content).toContain('NodeInjector has already been destroyed');
        expect(hasStackFrame(content)).toBe(true);
        expect(content).toContain('p406-turn-error-stack-detail');
    }

    @Test('default mode keeps the compact one-line failure (no stack regression)')
    async defaultOmitsStack() {
        const host = createHost(new Error('NodeInjector has already been destroyed'), en);
        await withDebugEnv(undefined, () => submitView(host));
        const content = lastAssistantContent(host);
        expect(content).toContain('NodeInjector has already been destroyed');
        expect(hasStackFrame(content)).toBe(false);
    }

    @Test('"true" enables debug mode just like "1"')
    async debugTrueEnablesStack() {
        const host = createHost(new Error('socket hang up'), en);
        await withDebugEnv('true', () => submitView(host));
        expect(hasStackFrame(lastAssistantContent(host))).toBe(true);
    }

    @Test('an unrelated flag value does not enable stack output')
    async unrelatedFlagOmitsStack() {
        const host = createHost(new Error('socket hang up'), en);
        await withDebugEnv('0', () => submitView(host));
        expect(hasStackFrame(lastAssistantContent(host))).toBe(false);
    }

    @Test('model failures keep their actionable hint and gain the stack in debug mode')
    async modelFailureKeepsRemedyWithStack() {
        const host = createHost(new ModelRequestError(quotaFailure()), en);
        await withDebugEnv('1', () => submitView(host));
        const content = lastAssistantContent(host);
        expect(content).toContain('insufficient balance');
        expect(content).toContain('/model');
        expect(hasStackFrame(content)).toBe(true);
    }

    @Test('debug mode does not localize-break a Chinese model failure')
    async modelFailureStaysLocalizedWithStack() {
        const host = createHost(new ModelRequestError(quotaFailure()), zh);
        await withDebugEnv('1', () => submitView(host));
        const content = lastAssistantContent(host);
        expect(content).toContain('余额不足');
        expect(content).not.toContain('agent.modelError');
        expect(hasStackFrame(content)).toBe(true);
    }

    @Test('non-Error throwables do not crash debug formatting')
    async nonErrorThrowableSafe() {
        const host = createHost('plain string failure', en);
        await withDebugEnv('1', () => submitView(host));
        const content = lastAssistantContent(host);
        expect(content).toContain('plain string failure');
        expect(hasStackFrame(content)).toBe(false);
    }
}
