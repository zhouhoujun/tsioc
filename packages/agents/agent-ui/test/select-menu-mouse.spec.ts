import expect = require('expect');
import { AfterEach, BeforeEach, Suite, Test } from '@tsdi/unit';
import { Application, ApplicationContext } from '@tsdi/core';
import { ComponentFactory, ComponentsModule } from '@tsdi/components';
import { TuiRenderer, TuiTemplateModule, TuiTerminalSurface } from '@tsdi/components/console';
import { AgentModule } from '@tsdi/agent';
import { AgentConsoleComponent, AgentUiModule } from '../src';

/**
 * Real TUI finding: the `/model` provider picker rendered its rows but a mouse
 * click did nothing — the whole `<select>` was one hit target with no per-row
 * information. The renderer now publishes one `select-option` target per row
 * carrying the absolute option index, and the panel confirms that option.
 */
@Suite('select menus accept mouse clicks on a row')
export class SelectMenuMouseTest {
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
        for (let index = 0; index < 60; index++) await Promise.resolve();
    }

    protected async buildSurface() {
        const componentFactory = this.ctx.get(ComponentFactory);
        const consoleRef = componentFactory.create(AgentConsoleComponent, { injector: this.ctx });
        await consoleRef.render();
        const renderer = this.ctx.get(TuiRenderer);
        let resolved: string | undefined = 'pending' as any;
        void consoleRef.instance.sessionState.selectAsync('Model providers', [
            { label: 'anthropic', value: '__provider__:anthropic' },
            { label: 'deepseek', value: '__provider__:deepseek' }
        ], 0).then(value => { resolved = value; });
        await this.settle();
        const surface = new TuiTerminalSurface({
            renderer,
            root: consoleRef.elementRef.nativeElement,
            width: 80,
            output: { write() { /* noop */ } }
        });
        await this.settle();
        return { consoleRef, surface, resolved: () => resolved };
    }

    protected click(surface: TuiTerminalSurface, target: { x: number; y: number }) {
        const x = Math.max(1, Math.floor(target.x + 1));
        const y = Math.max(1, Math.floor(target.y + 1));
        surface.dispatchMouse({ button: 0, x, y, release: false });
        const handled = surface.dispatchMouse({ button: 0, x, y, release: true });
        return handled;
    }

    @Test('clicking an option row confirms that option')
    async clickConfirmsOption() {
        const { consoleRef, surface, resolved } = await this.buildSurface();
        const targets = (surface as any).clickTargets as Array<{ x: number; y: number; optionIndex?: number; interactive?: string }>;
        const deepseek = targets.find(target => target.optionIndex === 1);
        expect(deepseek).toBeDefined();

        expect(this.click(surface, deepseek!)).toEqual(true);
        await this.settle();

        expect(resolved()).toEqual('__provider__:deepseek');
        expect(consoleRef.instance.sessionState.selectMenu).toBeUndefined();
    }

    @Test('clicking the first row selects the first option')
    async clickFirstOption() {
        const { consoleRef, surface, resolved } = await this.buildSurface();
        const targets = (surface as any).clickTargets as Array<{ x: number; y: number; optionIndex?: number }>;
        const first = targets.find(target => target.optionIndex === 0);
        expect(first).toBeDefined();

        expect(this.click(surface, first!)).toEqual(true);
        await this.settle();

        expect(resolved()).toEqual('__provider__:anthropic');
        expect(consoleRef.instance.sessionState.selectMenu).toBeUndefined();
    }
}
