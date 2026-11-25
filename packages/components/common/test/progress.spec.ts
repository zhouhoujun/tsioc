import expect = require('expect');
import { After, Before, Suite, Test } from '@tsdi/unit';
import { Application, ApplicationContext } from '@tsdi/core';
import { AnimationClock, Component, ComponentFactory, ComponentRef, ComponentsModule } from '@tsdi/components';
import { DOCUMENT } from '@tsdi/common';
import { HtmlTemplateModule } from '@tsdi/components/html';
import { ProgressComponent, ProgressModule } from '../progress';

class FakeClock extends AnimationClock {
    listeners = new Set<() => void>();
    subscribe(listener: () => void): void { this.listeners.add(listener); }
    unsubscribe(listener: () => void): void { this.listeners.delete(listener); }
    tick(): void { this.listeners.forEach(listener => listener()); }
}

@Component({
    selector: 'progress-host',
    imports: [ProgressComponent],
    template: `<ui-progress label="Load" :value="40" :width="10"></ui-progress>
    <ui-progress label="Busy" indeterminate :width="9" :interval="100"></ui-progress>`
})
class ProgressHostComponent { }

@Suite('common progress')
export class ProgressTest {
    ctx!: ApplicationContext;
    clock = new FakeClock();

    @Before()
    async init() {
        this.ctx = await Application.run(ProgressHostComponent, {
            deps: [HtmlTemplateModule, ComponentsModule, ProgressModule],
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

    protected async mount(): Promise<{ roots: HTMLElement[] }> {
        const ref = this.ctx.get(ComponentFactory).create(ProgressHostComponent, {
            injector: this.ctx
        }) as ComponentRef<ProgressHostComponent>;
        await ref.render();
        await Promise.resolve();
        const items = ref.hostView.queryAll(ProgressComponent) as ComponentRef<ProgressComponent>[];
        return { roots: items.map(item => item.hostView.rootNodes[0] as HTMLElement) };
    }

    @Test('keeps the determinate bar unchanged')
    async determinate() {
        const { roots } = await this.mount();
        const root = roots[0];
        expect(root.getAttribute('aria-valuenow')).toEqual('40');
        expect(root.getAttribute('aria-valuetext')).toEqual('40%');
        expect(root.querySelector('.ui-progress-bar')?.textContent).toEqual('████░░░░░░');
    }

    @Test('animates the indeterminate sweep from the shared clock')
    async indeterminate() {
        const realNow = Date.now;
        let now = 1000;
        Date.now = () => now;
        try {
            const { roots } = await this.mount();
            const root = roots[1];
            const bar = root.querySelector('.ui-progress-bar') as HTMLElement;
            expect(root.getAttribute('aria-valuenow')).toEqual('');
            expect(root.getAttribute('aria-valuetext')).toEqual('Loading');
            expect(bar.textContent).toContain('█');
            const first = bar.textContent;

            now = 1100;
            this.clock.tick();
            await Promise.resolve();
            expect(bar.textContent).not.toEqual(first);
            expect(bar.textContent?.length).toEqual(9);
        } finally {
            Date.now = realNow;
        }
    }
}
