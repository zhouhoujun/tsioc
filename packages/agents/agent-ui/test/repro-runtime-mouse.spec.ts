import expect = require('expect');
import { Before, Suite, Test, After } from '@tsdi/unit';
import { Application, ApplicationContext, ApplicationRunners } from '@tsdi/core';
import { ComponentsModule } from '@tsdi/components';
import {
    TuiConsoleModule,
    TerminalInputSequenceDecoder,
    ConsoleTerminalInputHandler,
    ConsoleTerminalSurfaceAccessor,
    ConsoleTerminalSurfaceLifecycle,
    ConsoleTerminalApplicationLifecycleService
} from '@tsdi/components/console';
import { AgentModule } from '@tsdi/agent';
import { AgentConsoleComponent, AgentUiModule } from '../src';
import { ConsoleTerminalSurfaceAccessor as AgentConsoleTerminalSurfaceAccessor } from '../src/console-ports';

@Suite('Repro: real runtime mouse pipeline via component handleTerminalInput')
export class RuntimeMousePipelineReproTest {
    ctx!: ApplicationContext;

    @Before()
    async init() {
        // mirror runAgentUi wiring: handler + surface lifecycle resolve to the bootstrap component instance
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
                    }
                ],
                bootstrap: [AgentConsoleComponent, ConsoleTerminalApplicationLifecycleService]
            }
        });
    }

    @After()
    async clean() { await this.ctx?.close(); }

    protected async settle(): Promise<void> {
        await new Promise(resolve => setTimeout(resolve, 50));
        await Promise.resolve();
        await Promise.resolve();
    }

    @Test('handleTerminalInput routes SGR mouse to surface accessor and expands toggle')
    async handleTerminalInputRoutesMouse() {
        const runners = this.ctx.get(ApplicationRunners);
        const consoleRef = runners.getRef(AgentConsoleComponent)!;
        expect(consoleRef).toBeDefined();
        const instance = consoleRef.instance;

        instance.sessionState.setMessages([
            { id: 'u1', role: 'user', content: 'hello', createdAt: 0 } as any,
            { id: 'a1', role: 'assistant', content: Array.from({ length: 12 }, (_v, i) => `line ${i + 1}`).join('\n'), createdAt: 1 } as any
        ]);
        await this.settle();

        // the runner-wired handler should be the component instance itself
        const handler = this.ctx.get(ConsoleTerminalInputHandler, null);
        expect(handler).toBe(instance);

        // surface accessor should resolve through TuiConsoleModule to the lifecycle service
        const accessor = this.ctx.get(ConsoleTerminalSurfaceAccessor, null);
        expect(accessor).toBeDefined();
        expect((instance as any).surfaceAccessor).toBeDefined();
        const clickTargets = accessor?.getClickTargets?.() || [];
        const toggleTarget = clickTargets.find((t: any) =>
            (t.node as any)?.getAttribute?.('class')?.includes('message-detail-toggle'));
        expect(toggleTarget).toBeDefined();

        const sx = Math.max(1, Math.floor(toggleTarget!.x + 1));
        const sy = Math.max(1, Math.floor(toggleTarget!.y + 1));
        const decoder = new TerminalInputSequenceDecoder();

        const press = decoder.decode(`\x1b[<0;${sx};${sy}M`);
        expect(press.mouse).toBeDefined();
        await (handler as any).handleTerminalInput(press, `\x1b[<0;${sx};${sy}M`);

        const release = decoder.decode(`\x1b[<0;${sx};${sy}m`);
        await (handler as any).handleTerminalInput(release, `\x1b[<0;${sx};${sy}m`);
        await Promise.resolve();
        await Promise.resolve();

        expect(instance.sessionState.selectedMessageId).toEqual('a1');
        expect(instance.sessionState.messageDetailOpen).toEqual(true);
    }

    @Test('ConsoleTerminalInputController decodes and forwards real SGR stdin chunks')
    async controllerForwardsSgrChunks() {
        const decoder = new TerminalInputSequenceDecoder();
        const received: Array<{ decoded: any; chunk: string }> = [];
        const { ConsoleTerminalInputController } = await import('@tsdi/components/console');

        let dataHandler: ((chunk: string) => void) | undefined;
        let rawMode: boolean | undefined;
        let resumed = false;
        let paused = false;
        const fakeInput = {
            on: (_evt: string, handler: (chunk: string) => void) => { dataHandler = handler; },
            off: () => undefined,
            setRawMode: (enabled: boolean) => { rawMode = enabled; },
            resume: () => { resumed = true; },
            pause: () => { paused = true; }
        };

        const controller = new ConsoleTerminalInputController({
            input: fakeInput as any,
            decoder,
            onChunk: (decoded, chunk) => { received.push({ decoded, chunk: String(chunk) }); }
        });
        controller.start();
        expect(rawMode).toBe(true);
        expect(resumed).toBe(true);

        // split SGR sequence across chunks like a real stream
        dataHandler!('\x1b[<0;12;5');
        expect(received.length).toBe(1); // partial sequence still calls onChunk (partial: true)
        expect(received[0].decoded.partial).toBe(true);
        expect(received[0].decoded.mouse).toBeUndefined();

        dataHandler!('M');
        expect(received.length).toBe(2); // completed press event
        expect(received[1].decoded.mouse).toBeDefined();
        expect(received[1].decoded.mouse.button).toBe(0);
        expect(received[1].decoded.mouse.x).toBe(12);
        expect(received[1].decoded.mouse.y).toBe(5);
        expect(received[1].decoded.mouse.release).toBe(false);

        dataHandler!('\x1b[<0;12;5m');
        expect(received.length).toBe(3); // release event
        expect(received[2].decoded.mouse?.release).toBe(true);

        controller.stop();
        expect(rawMode).toBe(false);
        expect(paused).toBe(true);
    }
}
