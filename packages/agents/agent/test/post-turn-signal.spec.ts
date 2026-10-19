import { Application, ApplicationContext } from '@tsdi/core';
import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { AgentRuntime } from '../src/runtime/AgentRuntime';
import { EchoModelAdapter } from '../src/model/EchoModelAdapter';
import { ModelAdapter } from '../src/model/ModelAdapter';
import { ModelRequest } from '../src/model/ModelRequest';
import { defaultAgentOptions } from '../src/options';
import { AgentModule } from '../src/agent.module';
import { AGENT_OPTIONS } from '../src/tokens';
import { provideAgentOrm } from '../src/orm.module';
import { SessionSummarizer } from '../src/memory/SessionSummarizer';
import { LLMSessionSummarizer } from '../src/memory/LLMSessionSummarizer';
import { AgentSummaryAgent, AgentSessionSummary } from '../src/memory/AgentSummaryAgent';
import { LLMAgentSummaryAgent } from '../src/memory/LLMAgentSummaryAgent';
import { AgentMessage } from '../src/runtime/AgentMessage';

/** Model adapter that only settles when the request carries an aborted signal. */
class HangingModelAdapter extends ModelAdapter {
    /** Not 'echo', so the summary agent actually issues the model call. */
    readonly provider = 'test';
    requests: ModelRequest[] = [];

    async complete(request: ModelRequest): Promise<any> {
        this.requests.push(request);
        const signal = request.signal;
        await new Promise<void>((_resolve, reject) => {
            if (!signal) {
                // No cancellation channel: the old code waits forever.
                return;
            }
            if (signal.aborted) {
                reject(new Error('The operation was aborted.'));
                return;
            }
            signal.addEventListener('abort', () => reject(new Error('The operation was aborted.')), { once: true });
        });
        return { message: 'Goal: never\nDecisions: never', stopReason: 'end' };
    }
}

function messages(count = 4): AgentMessage[] {
    return Array.from({ length: count }, (_, index) => ({
        id: `m-${index}`,
        role: index % 2 === 0 ? 'user' : 'assistant',
        content: `message ${index}`,
        createdAt: index
    } as AgentMessage));
}

/** Watch a promise for `ms`, so a missing cancellation fails instead of hanging. */
async function captureSettlement(promise: Promise<unknown>, ms: number): Promise<{ error?: Error; timedOut: boolean }> {
    let guard: NodeJS.Timeout | undefined;
    try {
        const outcome = await Promise.race([
            promise.then(() => 'resolved' as const).catch((error: unknown) => error),
            new Promise<'hung'>(resolve => {
                guard = setTimeout(() => resolve('hung'), ms);
            })
        ]);
        if (outcome === 'hung') {
            return { timedOut: true };
        }
        return outcome === 'resolved' ? { timedOut: false } : { error: outcome as Error, timedOut: false };
    } finally {
        if (guard) {
            clearTimeout(guard);
        }
    }
}

@Suite('Post-turn model calls honour the turn signal')
export class PostTurnSignalTest {
    @Test('the compaction summarizer aborts its model call when the turn is cancelled')
    async summarizerHonoursTurnSignal() {
        const model = new HangingModelAdapter();
        const summarizer = new LLMSessionSummarizer(model);
        const controller = new AbortController();
        // Cast so the spec also compiles against the pre-signal signature.
        const pending = (summarizer as any).summarize(messages(), undefined, controller.signal);
        await new Promise(resolve => setTimeout(resolve, 60));
        controller.abort();

        const settled = await captureSettlement(pending, 1500);

        expect(model.requests.length).toEqual(1);
        expect(model.requests[0].signal).toBe(controller.signal);
        expect(settled.timedOut).toEqual(false);
    }

    @Test('the display summary agent aborts its model call when the turn is cancelled')
    async summaryAgentHonoursTurnSignal() {
        const model = new HangingModelAdapter();
        const agent = new LLMAgentSummaryAgent(model);
        const controller = new AbortController();
        const pending = (agent as any).generate(messages(), controller.signal);
        await new Promise(resolve => setTimeout(resolve, 60));
        controller.abort();

        const settled = await captureSettlement(pending, 1500);

        expect(model.requests.length).toEqual(1);
        expect(model.requests[0].signal).toBe(controller.signal);
        expect(settled.timedOut).toEqual(false);
    }

    @Test('a turn hands its signal to the compaction summarizer')
    async turnPassesSignalToSummarizer() {
        const observed: Array<AbortSignal | undefined> = [];
        class RecordingSummarizer extends SessionSummarizer {
            async summarize(_messages: AgentMessage[], _evidence?: any, signal?: AbortSignal): Promise<string> {
                // The runtime must supply the turn signal (3rd argument).
                observed.push(signal);
                return 'summary';
            }
        }
        const ctx = await boot(
            new EchoModelAdapter(),
            { provide: SessionSummarizer, useValue: new RecordingSummarizer() },
            { session: { summaryThreshold: 2 } }
        );
        try {
            const runtime = ctx.get(AgentRuntime);
            await runtime.runTurn('s1', 'hello');
            expect(observed.length).toBeGreaterThan(0);
            expect(observed[0] instanceof AbortSignal).toEqual(true);
        } finally {
            await ctx.close();
        }
    }

    @Test('a turn hands its signal to the display summary agent')
    async turnPassesSignalToSummaryAgent() {
        const observed: Array<AbortSignal | undefined> = [];
        class RecordingSummaryAgent extends AgentSummaryAgent {
            async generate(_messages: AgentMessage[], signal?: AbortSignal): Promise<AgentSessionSummary> {
                observed.push(signal);
                return { title: 'title' };
            }
        }
        const ctx = await boot(new EchoModelAdapter(), { provide: AgentSummaryAgent, useValue: new RecordingSummaryAgent() });
        try {
            const runtime = ctx.get(AgentRuntime);
            await runtime.runTurn('s1', 'hello');
            expect(observed.length).toBeGreaterThan(0);
            expect(observed[0] instanceof AbortSignal).toEqual(true);
        } finally {
            await ctx.close();
        }
    }
}

async function boot(model: ModelAdapter, extra: any, options: any = {}): Promise<ApplicationContext> {
    return Application.run(AgentModule, {
        providers: [
            ...provideAgentOrm({ type: 'sqljs' as any, autoLoadEntities: false as any, synchronize: true, autoSave: false, entities: [] } as any),
            { provide: ModelAdapter, useValue: model },
            { provide: AGENT_OPTIONS, useValue: { ...defaultAgentOptions, ...options } },
            extra
        ]
    });
}
