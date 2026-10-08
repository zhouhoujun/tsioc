import expect = require('expect');
import { Before, Suite, Test, After } from '@tsdi/unit';
import { Application, ApplicationContext, ApplicationRunners } from '@tsdi/core';
import { ComponentsModule } from '@tsdi/components';
import {
    TuiConsoleModule,
    ConsoleTerminalInputController,
    ConsoleTerminalSurfaceAccessor,
    ConsoleTerminalInputHandler,
    ConsoleTerminalSurfaceLifecycle,
    ConsoleTerminalApplicationLifecycleService
} from '@tsdi/components/console';
import { AgentModule, AGENT_CONSOLE_APP_RPC } from '@tsdi/agent';
import { AgentConsoleComponent, AgentUiModule } from '../src';
import { ConsoleTerminalSurfaceAccessor as AgentConsoleTerminalSurfaceAccessor } from '../src/console-ports';

/**
 * Real key-chain regression coverage for the second-turn fatal error
 * `NodeInjector has already been destroyed.`
 *
 * Drives the ACTUAL raw stdin path end-to-end:
 *   ConsoleTerminalInputController (fake input stream + real sequence decoder)
 *   -> AgentConsoleComponent.handleTerminalInput
 *   -> session state / turn submission
 * across repeated turns, so an injector reference left destroyed by turn one
 * would be dereferenced by turn two.
 */
@Suite('Agent Console PTY key chain across turns')
export class AgentConsolePtyKeyChainTest {
    ctx!: ApplicationContext;
    private turnChunks: any[] = [];
    private unhandled: unknown[] = [];
    private onUnhandled = (reason: unknown): void => {
        this.unhandled.push(reason);
    };

    @Before()
    async init() {
        const self = this;
        process.on('unhandledRejection', this.onUnhandled);
        this.ctx = await Application.run({
            module: {
                imports: [AgentModule, AgentUiModule, TuiConsoleModule, ComponentsModule],
                providers: [
                    {
                        provide: AgentConsoleTerminalSurfaceAccessor,
                        deps: [ConsoleTerminalSurfaceAccessor],
                        useFactory: (surface: ConsoleTerminalSurfaceAccessor) => surface
                    },
                    {
                        provide: ConsoleTerminalInputHandler,
                        deps: [ApplicationRunners],
                        useFactory: (runners: ApplicationRunners) => runners.getRef(AgentConsoleComponent)?.instance
                    },
                    {
                        provide: ConsoleTerminalSurfaceLifecycle,
                        deps: [ApplicationRunners],
                        useFactory: (runners: ApplicationRunners) => runners.getRef(AgentConsoleComponent)?.instance
                    },
                    {
                        provide: AGENT_CONSOLE_APP_RPC,
                        useValue: {
                            request: async () => ({}),
                            stream: async function* () {
                                for (const chunk of self.turnChunks) {
                                    await settle();
                                    yield chunk;
                                }
                            }
                        }
                    }
                ],
                bootstrap: [AgentConsoleComponent, ConsoleTerminalApplicationLifecycleService]
            }
        });
    }

    @After()
    async clean() {
        await this.ctx?.close();
        process.off('unhandledRejection', this.onUnhandled);
    }

    protected expectNoDestroyedInjector(): void {
        const offending = this.unhandled.filter(reason =>
            /has already been destroyed/.test(String((reason as Error)?.message || reason))
        );
        if (offending.length) {
            throw new Error(`destroyed injector surfaced: ${String((offending[0] as Error)?.stack || offending[0])}`);
        }
    }

    protected console(): AgentConsoleComponent {
        const ref = this.ctx.get(ApplicationRunners).getRef(AgentConsoleComponent);
        expect(ref).toBeDefined();
        return ref!.instance;
    }

    /** Drives real raw-mode stdin chunks through the TerminalInputSequenceDecoder. */
    protected async press(...chunks: string[]): Promise<void> {
        const instance = this.console();
        let dataHandler: ((chunk: string) => void) | undefined;
        const controller = new ConsoleTerminalInputController({
            input: {
                on: (_event: string, handler: (chunk: string) => void) => { dataHandler = handler; },
                off: () => undefined,
                read: () => null,
                setRawMode: () => undefined,
                resume: () => undefined,
                pause: () => undefined
            },
            onChunk: (decoded, chunk) => instance.handleTerminalInput(decoded, chunk)
        });
        controller.start();
        try {
            for (const chunk of chunks) {
                dataHandler!(chunk);
                await settle();
            }
            await settle();
        } finally {
            controller.stop();
        }
    }

    private chunksFor(turn: number): any[] {
        return [
            { type: 'reasoning', content: `thinking ${turn}` },
            { type: 'text', content: `answer for turn ${turn}` },
            { type: 'tool_call', id: `tool-${turn}`, name: 'read', args: { path: 'a.txt' } },
            { type: 'done', status: 'completed' }
        ];
    }

    protected async waitForIdle(timeoutMs = 5000): Promise<void> {
        const state = this.console().sessionState;
        const deadline = Date.now() + timeoutMs;
        while (Date.now() < deadline) {
            if (state.status !== 'running' && state.status !== 'reasoning') {
                return;
            }
            await settle();
        }
        throw new Error(`turn did not settle: status=${state.status}`);
    }

    private async submitTurn(prompt: string, turn: number): Promise<void> {
        await this.waitForIdle();
        this.turnChunks = this.chunksFor(turn);
        await this.press(prompt, '\r');
        await this.waitForIdle();
    }

    @Test('survives repeated key-driven turns through the real stdin path')
    async repeatedKeyDrivenTurns() {
        const instance = this.console();
        let previous = instance.sessionState.messages.length;

        for (let turn = 0; turn < 3; turn++) {
            await this.submitTurn(`question ${turn}`, turn);
            const current = instance.sessionState.messages.length;
            expect(current).toBeGreaterThan(previous);
            previous = current;
        }

        expect(instance.sessionState.queuedPromptCount).toBe(0);
        this.expectNoDestroyedInjector();
    }

    @Test('navigates history with arrow keys, then submits another turn')
    async historyArrowKeysThenResubmit() {
        const instance = this.console();

        await this.submitTurn('p409 history probe', 0);
        const afterFirstTurn = instance.sessionState.messages.length;

        await this.press('\u001b[A');
        expect(instance.sessionState.input.length).toBeGreaterThan(0);

        await this.press('\u001b[B');
        await this.submitTurn('p409 second probe', 1);
        expect(instance.sessionState.messages.length).toBeGreaterThan(afterFirstTurn);
        this.expectNoDestroyedInjector();
    }

    @Test('survives key-driven turns that fail mid-stream')
    async failingKeyDrivenTurns() {
        const instance = this.console();

        for (let turn = 0; turn < 3; turn++) {
            this.turnChunks = [
                { type: 'text', content: `partial ${turn}` },
                { type: 'event', event: 'error', payload: { message: 'boom' } },
                { type: 'done', status: 'error' }
            ];
            await this.press(`failing ${turn}`, '\r');
            await this.waitForIdle();
        }

        expect(instance.sessionState.messages.length).toBeGreaterThan(0);
        this.expectNoDestroyedInjector();
    }

    private stubSessionService(instance: AgentConsoleComponent): void {
        const overrides: Record<string, unknown> = {
            ensureSession: async (sessionId?: string) => ({
                id: sessionId || 'session-switch-target',
                archived: false,
                workspace: '',
                lastActiveAt: Date.now()
            }),
            loadMessagesPage: async () => ({ messages: [], hasMore: false })
        };
        (instance as any).sessionService = new Proxy({}, {
            get: (_target, prop: string) => {
                if (prop in overrides) {
                    return overrides[prop];
                }
                return async () => [];
            }
        });
    }

    @Test('survives switching sessions between turns')
    async sessionSwitchBetweenTurns() {
        const instance = this.console();
        this.stubSessionService(instance);

        await this.submitTurn('question before switch', 0);
        const firstSessionId = instance.sessionState.sessionId;

        await (instance as any).openSession('session-switch-target');
        await this.waitForIdle();
        expect(instance.sessionState.sessionId).toBe('session-switch-target');
        expect(instance.sessionState.sessionId).not.toBe(firstSessionId);

        await this.submitTurn('question after switch', 1);
        expect(instance.sessionState.messages.length).toBeGreaterThan(0);
        expect(instance.sessionState.queuedPromptCount).toBe(0);
        this.expectNoDestroyedInjector();
    }
}

async function settle(): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 30));
    await Promise.resolve();
    await Promise.resolve();
}