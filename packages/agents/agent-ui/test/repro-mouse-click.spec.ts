import expect = require('expect');
import { BeforeEach, Suite, Test, AfterEach } from '@tsdi/unit';
import { Application, ApplicationContext } from '@tsdi/core';
import { ComponentFactory, ComponentRef, ComponentsModule } from '@tsdi/components';
import {
    ConsoleTemplateModule,
    TuiRenderer,
    TuiTemplateModule,
    TuiTerminalSurface,
    TerminalInputSequenceDecoder
} from '@tsdi/components/console';
import { AgentModule } from '@tsdi/agent';
import { AgentConsoleComponent, AgentUiModule } from '../src';

@Suite('Repro: real mouse click path through dispatchMouse')
export class MouseClickPathReproTest {
    ctx!: ApplicationContext;

    @BeforeEach()
    async init() {
        this.ctx = await Application.run(AgentModule, {
            deps: [AgentUiModule, TuiTemplateModule, ComponentsModule]
        });
    }

    @AfterEach()
    async clean() { await this.ctx?.close(); }

    protected async buildSurface(opts?: Partial<import('@tsdi/components/console').TuiTerminalSurfaceOptions>) {
        const componentFactory = this.ctx.get(ComponentFactory);
        const consoleRef = componentFactory.create(AgentConsoleComponent, { injector: this.ctx });
        await consoleRef.render();
        const renderer = this.ctx.get(TuiRenderer);

        consoleRef.instance.sessionState.setMessages([
            { id: 'u1', role: 'user', content: 'hello', createdAt: 0 } as any,
            {
                id: 'a1',
                role: 'assistant',
                content: Array.from({ length: 12 }, (_v, i) => `line ${i + 1}`).join('\n'),
                createdAt: 1,
                metadata: { uiKind: 'event', uiEventType: 'tool_completed', uiEventLabel: 'tool', status: 'success', durationMs: 1250 }
            } as any
        ]);
        await Promise.resolve();
        await Promise.resolve();

        const writes: string[] = [];
        const surface = new TuiTerminalSurface({
            renderer,
            root: consoleRef.elementRef.nativeElement,
            width: 80,
            output: { write(value: string) { writes.push(value); } },
            ...opts
        });
        await Promise.resolve();
        await Promise.resolve();
        return { consoleRef, surface, writes };
    }

    protected findToggleTarget(surface: TuiTerminalSurface) {
        return surface.clickTargets.find(target =>
            (target.node as any)?.getAttribute?.('class')?.includes('message-detail-toggle'));
    }

    @Test('clicking toggle via SGR press/release sequences expands the message')
    async clickToggleViaSgrSequences() {
        const { consoleRef, surface } = await this.buildSurface();
        const expandTarget = this.findToggleTarget(surface);
        expect(expandTarget).toBeDefined();

        const decoder = new TerminalInputSequenceDecoder();
        // SGR mouse coordinates are 1-based; clickTarget rows are 0-based line indices.
        const sx = Math.max(1, Math.floor(expandTarget!.x + 1));
        const sy = Math.max(1, Math.floor(expandTarget!.y + 1));

        const press = decoder.decode(`\x1b[<0;${sx};${sy}M`);
        expect(press.mouse).toBeDefined();
        expect(press.mouse?.release).toBe(false);
        surface.dispatchMouse(press.mouse);

        const release = decoder.decode(`\x1b[<0;${sx};${sy}m`);
        expect(release.mouse?.release).toBe(true);
        const handled = surface.dispatchMouse(release.mouse);
        await Promise.resolve();
        await Promise.resolve();

        expect(handled).toBe(true);
        expect(consoleRef.instance.sessionState.selectedMessageId).toEqual('a1');
        expect(consoleRef.instance.sessionState.messageDetailOpen).toEqual(true);
        expect(surface.lastRenderedLines.some(line => line.includes('Click to expand'))).toBe(false);
        const expandedRow = surface.lastRenderedLines.findIndex(line => line.includes('line 12'));
        expect(expandedRow).toBeGreaterThanOrEqual(0);

        // collapse again through the real path
        const collapseTarget = this.findToggleTarget(surface);
        expect(collapseTarget).toBeDefined();
        const cx = Math.max(1, Math.floor(collapseTarget!.x + 1));
        const cy = Math.max(1, Math.floor(collapseTarget!.y + 1));
        const cpress = decoder.decode(`\x1b[<0;${cx};${cy}M`);
        surface.dispatchMouse(cpress.mouse);
        const crelease = decoder.decode(`\x1b[<0;${cx};${cy}m`);
        expect(surface.dispatchMouse(crelease.mouse)).toBe(true);
        await Promise.resolve();
        await Promise.resolve();
        expect(consoleRef.instance.sessionState.messageDetailOpen).toEqual(false);
        expect(surface.lastRenderedLines.some(line => line.includes('Click to expand'))).toBe(true);
    }

    @Test('drag handoff keeps tracking off for the clear window and reclaims on keyboard')
    async dragHandoffKeepsTrackingOffUntilKeyboardReclaim() {
        const { consoleRef, surface } = await this.buildSurface({ mouseHandoffReclaimMs: 60000 });
        const expandTarget = this.findToggleTarget(surface);
        expect(expandTarget).toBeDefined();
        const sx = Math.max(1, Math.floor(expandTarget!.x + 1));
        const sy = Math.max(1, Math.floor(expandTarget!.y + 1));

        const decoder = new TerminalInputSequenceDecoder();
        // press left button
        const press = decoder.decode(`\x1b[<0;${sx};${sy}M`);
        surface.dispatchMouse(press.mouse);
        // motion event (button=32) dragging >=3 columns hands off to native selection
        const motion = decoder.decode(`\x1b[<32;${sx + 3};${sy}M`);
        expect(motion.mouse).toBeDefined();
        surface.dispatchMouse(motion.mouse);
        expect((surface as any).mouseHandedOff).toBe(true);

        // the next mouse event (the handoff's own release) does NOT reclaim:
        // tracking stays off so a native click can terminate the selection
        const release = decoder.decode(`\x1b[<0;1;99m`);
        expect(surface.dispatchMouse(release.mouse)).toBe(false);
        expect((surface as any).mouseHandedOff).toBe(true);

        // keyboard input reclaims tracking immediately
        expect(surface.notifyNonMouseInput()).toBe(true);
        expect((surface as any).mouseHandedOff).toBe(false);

        // a subsequent plain click on the toggle expands the message without
        // further keyboard input, and cycles tracking off/on to clear the
        // native selection left over from the drag
        const click = decoder.decode(`\x1b[<0;${sx};${sy}M`);
        surface.dispatchMouse(click.mouse);
        const clickUp = decoder.decode(`\x1b[<0;${sx};${sy}m`);
        expect(surface.dispatchMouse(clickUp.mouse)).toBe(true);
        await Promise.resolve();
        await Promise.resolve();
        expect(consoleRef.instance.sessionState.messageDetailOpen).toEqual(true);

        // nothing left to reclaim once tracking is active again
        expect(surface.notifyNonMouseInput()).toBe(false);
        expect((surface as any).mouseHandedOff).toBe(false);
    }

    @Test('drag handoff auto-recovers after the reclaim timeout without any input')
    async dragHandoffAutoRecoversAfterReclaimTimeout() {
        const { consoleRef, surface, writes } = await this.buildSurface({ mouseHandoffReclaimMs: 50 });
        const expandTarget = this.findToggleTarget(surface);
        expect(expandTarget).toBeDefined();
        const sx = Math.max(1, Math.floor(expandTarget!.x + 1));
        const sy = Math.max(1, Math.floor(expandTarget!.y + 1));

        const decoder = new TerminalInputSequenceDecoder();
        const press = decoder.decode(`\x1b[<0;${sx};${sy}M`);
        surface.dispatchMouse(press.mouse);
        const motion = decoder.decode(`\x1b[<32;${sx + 3};${sy}M`);
        surface.dispatchMouse(motion.mouse);
        expect((surface as any).mouseHandedOff).toBe(true);

        // after the reclaim timeout the surface re-enables tracking by itself
        await new Promise(resolve => setTimeout(resolve, 120));
        expect((surface as any).mouseHandedOff).toBe(false);
        expect(writes.join('')).toContain('\x1b[?1000h');

        // a plain click now works again without any keyboard input
        const click = decoder.decode(`\x1b[<0;${sx};${sy}M`);
        surface.dispatchMouse(click.mouse);
        const clickUp = decoder.decode(`\x1b[<0;${sx};${sy}m`);
        expect(surface.dispatchMouse(clickUp.mouse)).toBe(true);
        await Promise.resolve();
        await Promise.resolve();
        expect(consoleRef.instance.sessionState.messageDetailOpen).toEqual(true);
    }
}
