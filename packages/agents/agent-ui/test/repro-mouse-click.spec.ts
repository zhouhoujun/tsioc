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

    protected async settle(): Promise<void> {
        for (let index = 0; index < 48; index++) await Promise.resolve();
    }

    protected async buildSurface(opts?: Partial<import('@tsdi/components/console').TuiTerminalSurfaceOptions>) {
        const componentFactory = this.ctx.get(ComponentFactory);
        const consoleRef = componentFactory.create(AgentConsoleComponent, { injector: this.ctx });
        await consoleRef.render();
        const renderer = this.ctx.get(TuiRenderer);

        consoleRef.instance.sessionState.setMessages([
            {
                id: 'a1',
                role: 'assistant',
                content: Array.from({ length: 12 }, (_v, i) => `line ${i + 1}`).join('\n'),
                createdAt: 1,
                metadata: { uiKind: 'event', uiEventType: 'reasoning', status: 'success' }
            } as any
        ]);
        await this.settle();

        const writes: string[] = [];
        const surface = new TuiTerminalSurface({
            renderer,
            root: consoleRef.elementRef.nativeElement,
            width: 80,
            output: { write(value: string) { writes.push(value); } },
            ...opts
        });
        await this.settle();
        return { consoleRef, surface, writes };
    }

    protected findToggleTarget(surface: TuiTerminalSurface) {
        return surface.clickTargets.find(target =>
            (target.node as any)?.getAttribute?.('class')?.includes('message-line'));
    }

    @Test('clicking toggle via SGR press/release sequences expands the message')
    async clickToggleViaSgrSequences() {
        const { consoleRef, surface } = await this.buildSurface();
        const expandTarget = this.findToggleTarget(surface);
        expect(expandTarget).toBeDefined();

        const decoder = new TerminalInputSequenceDecoder();
        // SGR mouse coordinates are 1-based; clickTarget rows are 0-based line indices.
        const sx = 5;
        const sy = Math.max(1, Math.floor(expandTarget!.y + 1));

        const press = decoder.decode(`\x1b[<0;${sx};${sy}M`);
        expect(press.mouse).toBeDefined();
        expect(press.mouse?.release).toBe(false);
        surface.dispatchMouse(press.mouse);

        const release = decoder.decode(`\x1b[<0;${sx};${sy}m`);
        expect(release.mouse?.release).toBe(true);
        const handled = surface.dispatchMouse(release.mouse);
        await this.settle();

        expect(handled).toBe(true);
        expect(consoleRef.instance.sessionState.isMessageExpanded('a1')).toEqual(true);
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
        await this.settle();
        expect(consoleRef.instance.sessionState.isMessageExpanded('a1')).toEqual(false);
        expect(surface.lastRenderedLines.some(line => line.includes('line 12'))).toBe(false);
    }

    @Test('drag selects text without handing off and keyboard input clears the selection')
    async dragSelectsTextWithoutHandoff() {
        const { consoleRef, surface } = await this.buildSurface({ mouseHandoffReclaimMs: 60000 });
        const expandTarget = this.findToggleTarget(surface);
        expect(expandTarget).toBeDefined();
        const sx = 5;
        const sy = Math.max(1, Math.floor(expandTarget!.y + 1));

        const decoder = new TerminalInputSequenceDecoder();
        const press = decoder.decode(`\x1b[<0;${sx};${sy}M`);
        surface.dispatchMouse(press.mouse);
        const motion = decoder.decode(`\x1b[<32;${sx + 3};${sy}M`);
        expect(motion.mouse).toBeDefined();
        surface.dispatchMouse(motion.mouse);
        expect((surface as any).mouseHandedOff).toBe(false);
        expect(surface.getTextSelectionText()).not.toEqual('');

        // the drag release must not turn into a click and keeps the selection.
        const release = decoder.decode(`\x1b[<0;${sx + 3};${sy}m`);
        expect(surface.dispatchMouse(release.mouse)).toBe(false);
        expect(surface.getTextSelectionText()).not.toEqual('');
        expect(consoleRef.instance.sessionState.isMessageExpanded('a1')).toBe(false);

        // keyboard input clears the app selection and leaves normal clicks working.
        expect(surface.notifyNonMouseInput()).toBe(false);
        expect(surface.getTextSelectionText()).toEqual('');
        expect(surface.dispatchClickAt(expandTarget?.node)).toBe(true);
        await this.settle();
        expect(consoleRef.instance.sessionState.isMessageExpanded('a1')).toEqual(true);
    }

    @Test('wrapped continuation rows keep their own text when selected')
    async wrappedRowsSelectTheirOwnText() {
        const { consoleRef, surface } = await this.buildSurface({ mouseHandoffReclaimMs: 60000 });
        const longText = 'wrapstart ' + 'auto wrap content '.repeat(28) + 'wrapend';
        consoleRef.instance.sessionState.setMessages([
            { id: 'wrap-1', role: 'assistant', content: longText, createdAt: 1 } as any
        ]);
        await this.settle();
        const rows = surface.lastRenderedLines.map(line => line.replace(/\x1b\[[0-9;]*m/g, ''));
        const indices = rows
            .map((line, index) => (line.includes('auto wrap content') ? index : -1))
            .filter(index => index >= 0);
        expect(indices.length).toBeGreaterThan(1);
        for (const index of indices.slice(0, 3)) {
            const expected = rows[index].slice(0, 9).replace(/\s+$/, '');
            const y = index + 1;
            surface.dispatchMouse({ button: 0, x: 1, y, release: false });
            surface.dispatchMouse({ button: 32, x: 10, y, release: false });
            for (let step = 0; step < 10; step++) await Promise.resolve();
            expect(surface.getTextSelectionText()).toEqual(expected);
            surface.notifyNonMouseInput();
            for (let step = 0; step < 10; step++) await Promise.resolve();
        }
    }

    @Test('selected text stays anchored across a redraw')
    async selectedTextStaysAnchoredAcrossRedraw() {
        const { surface } = await this.buildSurface({ mouseHandoffReclaimMs: 60000 });
        const expandTarget = this.findToggleTarget(surface);
        expect(expandTarget).toBeDefined();
        const sx = 5;
        const sy = Math.max(1, Math.floor(expandTarget!.y + 1));
        const decoder = new TerminalInputSequenceDecoder();
        surface.dispatchMouse(decoder.decode(`\x1b[<0;${sx};${sy}M`).mouse);
        surface.dispatchMouse(decoder.decode(`\x1b[<32;${sx + 4};${sy}M`).mouse);
        const before = surface.getTextSelectionText();
        expect(before).not.toEqual('');
        surface.requestRender();
        await this.settle();
        expect(surface.getTextSelectionText()).toEqual(before);
    }
}
