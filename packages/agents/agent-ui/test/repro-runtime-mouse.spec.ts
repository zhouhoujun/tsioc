import { navigationFor } from './test-transcript-navigation';
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
import { formatAgentUiSessionClosingMessage } from '../src/agent-ui.i18n';

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
    async clean() { await this.ctx?.close(); if (global.gc) global.gc(); }

    protected async settle(): Promise<void> {
        await new Promise(resolve => setTimeout(resolve, 150));
        for (let index = 0; index < 48; index++) await Promise.resolve();
    }

    @Test('handleTerminalInput routes SGR mouse to the runtime surface')
    async handleTerminalInputRoutesMouse() {
        const runners = this.ctx.get(ApplicationRunners);
        const consoleRef = runners.getRef(AgentConsoleComponent)!;
        expect(consoleRef).toBeDefined();
        const instance = consoleRef.instance;
        await this.settle();

        // the runner-wired handler should be the component instance itself
        const handler = this.ctx.get(ConsoleTerminalInputHandler, null);
        expect(handler).toBe(instance);

        // surface accessor should resolve through TuiConsoleModule to the lifecycle service
        const accessor = this.ctx.get(ConsoleTerminalSurfaceAccessor, null);
        expect(accessor).toBeDefined();
        expect((instance as any).surfaceAccessor).toBeDefined();
        const clickTargets = accessor?.getClickTargets?.() || [];
        const inputTarget = clickTargets.find((t: any) =>
            (t.node as any)?.getAttribute?.('class')?.includes('agent-input'));
        expect(inputTarget).toBeDefined();

        const sx = Math.max(1, Math.floor(inputTarget!.x + 1));
        const sy = Math.max(1, Math.floor(inputTarget!.y + 1));
        const decoder = new TerminalInputSequenceDecoder();

        const press = decoder.decode(`\x1b[<0;${sx};${sy}M`);
        expect(press.mouse).toBeDefined();
        await (handler as any).handleTerminalInput(press, `\x1b[<0;${sx};${sy}M`);

        const release = decoder.decode(`\x1b[<0;${sx};${sy}m`);
        await (handler as any).handleTerminalInput(release, `\x1b[<0;${sx};${sy}m`);
        await Promise.resolve();
        await Promise.resolve();

        expect(instance.sessionState.inputFocused).toEqual(true);

        const text = decoder.decode('fours');
        await (handler as any).handleTerminalInput(text, 'fours');
        expect(instance.sessionState.input).toEqual('fours');

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
        let readCount = 0;
        const fakeInput = {
            on: (_evt: string, handler: (chunk: string) => void) => { dataHandler = handler; },
            off: () => undefined,
            read: () => { readCount += 1; return null; },
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
        expect(readCount).toBe(0);

        // A bare Escape is initially ambiguous with an ANSI sequence. When
        // normal text arrives next, it must be emitted before that text.
        dataHandler!('\u001b');
        dataHandler!('fours');
        expect(received[3].decoded.partial).toBe(true);
        expect(received[4].decoded.controlKey).toBe('escape');
        expect(received[5].decoded.text).toBe('fours');

        controller.stop();
        expect(rawMode).toBe(false);
        expect(paused).toBe(true);
    }

    @Test('Escape leaves transcript navigation before the next composer input')
    async escapeReturnsFromTranscriptToComposer() {
        const instance = this.ctx.get(ApplicationRunners).getRef(AgentConsoleComponent)!.instance;
        instance.sessionState.setInput('', 0);
        instance.sessionState.setMessages([
            { id: 'long', role: 'assistant', content: Array.from({ length: 12 }, (_value, index) => `line ${index}`).join('\n'), createdAt: 1 } as any
        ]);
        expect(instance.sessionState.focusLatestLongMessage()).toEqual(true);

        await instance.handleTerminalInput({ text: '\u001b', controlKey: 'escape', partial: false }, '\u001b');
        await instance.handleTerminalInput({ text: 'fours', partial: false }, 'fours');

        expect(instance.sessionState.messagesFocused).toEqual(false);
        expect(instance.sessionState.inputFocused).toEqual(true);
        expect(instance.sessionState.input).toEqual('fours');
    }

    @Test('a delayed Escape returns from transcript navigation before composer input')
    async delayedEscapeReturnsFromTranscriptToComposer() {
        const { ConsoleTerminalInputController } = await import('@tsdi/components/console');
        const instance = this.ctx.get(ApplicationRunners).getRef(AgentConsoleComponent)!.instance;
        instance.sessionState.setInput('', 0);
        instance.sessionState.setMessages([
            { id: 'long', role: 'assistant', content: Array.from({ length: 12 }, (_value, index) => `line ${index}`).join('\n'), createdAt: 1 } as any
        ]);
        expect(instance.sessionState.focusLatestLongMessage()).toEqual(true);

        let dataHandler: ((chunk: string) => void) | undefined;
        const controller = new ConsoleTerminalInputController({
            input: {
                on: (_event, handler) => { dataHandler = handler as (chunk: string) => void; },
                setRawMode: () => undefined,
                resume: () => undefined,
                pause: () => undefined
            },
            onChunk: (decoded, chunk) => instance.handleTerminalInput(decoded, chunk)
        });
        controller.start();
        dataHandler!('\u001b');
        await this.settle();
        dataHandler!('fours');
        await this.settle();
        controller.stop();

        expect(instance.sessionState.messagesFocused).toEqual(false);
        expect(instance.sessionState.inputFocused).toEqual(true);
        expect(instance.sessionState.input).toEqual('fours');
    }

    @Test('console message detail pages long content instead of rendering it as an over-height transcript')
    async consoleMessageDetailPagesLongContent() {
        const ref = this.ctx.get(ApplicationRunners).getRef(AgentConsoleComponent)!;
        ref.instance.sessionState.setConsoleOptions({ messageToggleInteraction: 'enter', messageDetailVisibleLines: 6 });
        ref.instance.sessionState.setInput('', 0);
        ref.instance.sessionState.setMessages([
            { id: 'long', role: 'assistant', content: Array.from({ length: 217 }, (_value, index) => `detail line ${index + 1}`).join('\n'), createdAt: 1 } as any
        ]);
        expect(ref.instance.sessionState.focusLatestLongMessage()).toEqual(true);
        expect(await ref.instance.sessionState.handleFocusKey('enter', navigationFor(ref.instance.sessionState))).toEqual(true);
        ref.instance.sessionState.scrollMessageDetailToEdge('start');
        await this.settle();

        expect(ref.instance.showMessageDetailPanel).toEqual(true);
        const surface = this.ctx.get(ConsoleTerminalSurfaceAccessor)!;
        const firstScreen = surface.getLastRenderedLines().join('\n');
        expect(firstScreen).toContain('detail line 6');
        expect(firstScreen).not.toContain('detail line 12');

        expect(await ref.instance.sessionState.handleFocusKey('pagedown', navigationFor(ref.instance.sessionState))).toEqual(true);
        await this.settle();
        const nextScreen = surface.getLastRenderedLines().join('\n');
        expect(nextScreen).toContain('detail line 11');
    }

    @Test('closing session messages provide the locale-specific resume command')
    closingSessionMessageProvidesResumeCommand() {
        expect(formatAgentUiSessionClosingMessage('zh-CN', 'chat-123'))
            .toEqual('正在关闭会话。继续使用此会话：tsdi-agent chat --session chat-123');
        expect(formatAgentUiSessionClosingMessage('en', 'chat-123'))
            .toEqual('Closing session. Resume with: tsdi-agent chat --session chat-123');
    }

    @Test('terminal exit preserves the final screen before appending the resume message')
    async terminalExitPreservesFinalScreen() {
        const instance = this.ctx.get(ApplicationRunners).getRef(AgentConsoleComponent)!.instance as any;
        const originalApp = instance.app;
        const originalSurface = instance.surfaceAccessor;
        const calls: string[] = [];
        instance.app = { close: async () => { calls.push('close'); } };
        instance.surfaceAccessor = {
            stopTerminal: () => { calls.push('stop'); },
            writeRawTerminalData: (text: string) => {
                calls.push(`write:${text}`);
                return true;
            }
        };
        instance.closing = false;
        try {
            await instance.requestTerminalExit('Closing session. Resume later.');
            expect(calls).toEqual([
                'stop',
                'write:Closing session. Resume later.\n',
                'close'
            ]);
        } finally {
            instance.app = originalApp;
            instance.surfaceAccessor = originalSurface;
            instance.closing = false;
        }
    }
}
