import expect = require('expect');
import { After, Before, Suite, Test } from '@tsdi/unit';
import { Application, ApplicationContext } from '@tsdi/core';
import { AnimationClock, Component, ComponentFactory, ComponentRef, ComponentsModule } from '@tsdi/components';
import { DOCUMENT } from '@tsdi/common';
import { HtmlTemplateModule } from '@tsdi/components/html';
import { SpinnerComponent, SpinnerModule } from '../spinner';

class FakeClock extends AnimationClock {
    listeners = new Set<() => void>();
    subscribe(listener: () => void): void { this.listeners.add(listener); }
    unsubscribe(listener: () => void): void { this.listeners.delete(listener); }
    tick(): void { this.listeners.forEach(listener => listener()); }
}

@Component({
    selector: 'spinner-host',
    imports: [SpinnerComponent],
    template: `<ui-spinner label="Saving" :interval="100" :pause="paused"></ui-spinner>`
})
class SpinnerHostComponent {
    paused = false;
}

@Suite('common spinner')
export class SpinnerTest {
    ctx!: ApplicationContext;
    clock = new FakeClock();

    @Before()
    async init() {
        this.ctx = await Application.run(SpinnerHostComponent, {
            deps: [HtmlTemplateModule, ComponentsModule, SpinnerModule],
            providers: [
                { provide: AnimationClock, useValue: this.clock },
                {
                    provide: DOCUMENT,
                    useFactory: () => {
                        const { JSDOM } = require('jsdom');
                        return new JSDOM('<!DOCTYPE html><html><body></body></html>').window.document;
                    }
                }
            ]
        });
    }

    @After()
    async clean() {
        await this.ctx.close();
    }

    protected async mount(): Promise<{ ref: ComponentRef<SpinnerHostComponent>; root: HTMLElement; host: SpinnerHostComponent; spinner: ComponentRef<SpinnerComponent> }> {
        const ref = this.ctx.get(ComponentFactory).create(SpinnerHostComponent, {
            injector: this.ctx
        }) as ComponentRef<SpinnerHostComponent>;
        await ref.render();
        await Promise.resolve();
        const spinner = ref.hostView.query(SpinnerComponent) as ComponentRef<SpinnerComponent>;
        return {
            ref,
            root: spinner.hostView.rootNodes[0] as HTMLElement,
            host: ref.instance as SpinnerHostComponent,
            spinner
        };
    }

    @Test('advances frames only from the shared animation clock')
    async advancesFromClock() {
        const realNow = Date.now;
        let now = 1000;
        Date.now = () => now;
        try {
            const { root, host } = await this.mount();
            const glyph = root.querySelector('.ui-spinner-glyph') as HTMLElement;
            expect(root.getAttribute('role')).toEqual('status');
            expect(root.getAttribute('aria-label')).toEqual('Saving');
            expect(root.textContent).toContain('Saving');
            expect(glyph.textContent).toEqual('⠋');

            now = 1100;
            this.clock.tick();
            await Promise.resolve();
            expect(glyph.textContent).toEqual('⠙');

            now = 1200;
            this.clock.tick();
            await Promise.resolve();
            expect(glyph.textContent).toEqual('⠹');

            // Paused spinners stop taking frames; unpausing resumes from the
            // same shared clock (no per-component timer).
            host.paused = true;
            await Promise.resolve();
            now = 1300;
            this.clock.tick();
            await Promise.resolve();
            expect(glyph.textContent).toEqual('⠹');

            host.paused = false;
            await new Promise(resolve => setTimeout(resolve, 0));
            now = 1400;
            this.clock.tick();
            await Promise.resolve();
            expect(glyph.textContent).toEqual('⠼');
        } finally {
            Date.now = realNow;
        }
    }

    @Test('installs its own DOM skin')
    async installsSkin() {
        const { root } = await this.mount();
        expect(root.className).toContain('ui-spinner');
        const doc = this.ctx.get(DOCUMENT) as Document;
        expect(doc.getElementById('tsdi-spinner-styles')?.textContent).toContain('.ui-spinner');
    }
}
