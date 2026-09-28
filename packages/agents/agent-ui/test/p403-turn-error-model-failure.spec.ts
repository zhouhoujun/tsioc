import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { ModelRequestError, ModelFailure } from '@tsdi/agent';
import { agentUiChinese, agentUiEnglish } from '../src/agent-ui.i18n';
import { AgentConsoleSessionState } from '../src/AgentConsoleSessionState';
import { AgentConsoleTurnInputHost, submitView } from '../src/AgentConsoleTurnInputController';

/**
 * P403: a model failure raised while a turn is streaming must reach the transcript
 * through the shared model-failure presenter, not as the raw adapter message.
 *
 * The real TUI showed `Error · Error: Model request failed with 402
 * (deepseek/deepseek-flash): Insufficient Balance`, which drops the remedy hint
 * the presenter already produces and leaks an untranslated provider string,
 * violating the actionable/i18n failure-message contract.
 */
function quotaFailure(overrides: Partial<ModelFailure> = {}): ModelFailure {
    return {
        kind: 'quota',
        status: 402,
        provider: 'deepseek',
        model: 'deepseek-flash',
        detail: 'Insufficient Balance',
        retryable: false,
        ...overrides
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
 * Builds a host over the real `AgentConsoleSessionState` so the assertion runs
 * against genuinely rendered transcript content, not a recorded call argument.
 * `failure` is what `runTurnStream` rejects with.
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

@Suite('turn error presentation (P403)')
export class TurnErrorModelFailureTest {

    @Test('surfaces the actionable remedy hint for a turn-level quota failure')
    async quotaFailureCarriesRemedy() {
        const host = createHost(new ModelRequestError(quotaFailure()), en);
        await submitView(host);
        const content = lastAssistantContent(host);
        expect(content).toContain('insufficient balance');
        expect(content).toContain('/model');
        expect(content).toContain('402');
    }

    @Test('does not leak the raw untranslated provider string')
    async noRawProviderLeak() {
        const host = createHost(new ModelRequestError(quotaFailure()), en);
        await submitView(host);
        expect(lastAssistantContent(host)).not.toContain('Insufficient Balance');
    }

    @Test('localizes the turn failure when a Chinese locale is active')
    async localizedTurnFailure() {
        const host = createHost(new ModelRequestError(quotaFailure()), zh);
        await submitView(host);
        const content = lastAssistantContent(host);
        expect(content).toContain('余额不足');
        expect(content).not.toContain('agent.modelError');
    }

    @Test('falls back to the canonical English description without a translator')
    async noTranslatorFallback() {
        const host = createHost(new ModelRequestError(quotaFailure()));
        await submitView(host);
        const content = lastAssistantContent(host);
        expect(content).toContain('insufficient balance');
        expect(content).toContain('deepseek/deepseek-flash');
    }

    @Test('keeps the raw message for unstructured turn errors')
    async unstructuredErrorKeepsRawMessage() {
        const host = createHost(new Error('socket hang up'), en);
        await submitView(host);
        const content = lastAssistantContent(host);
        expect(content).toContain('socket hang up');
    }
}
