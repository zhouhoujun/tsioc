import expect = require('expect');
import { After, Before, Suite, Test } from '@tsdi/unit';
import { Application, ApplicationContext } from '@tsdi/core';
import { AnimationClock, Component, ComponentFactory, ComponentRef, ComponentsModule } from '@tsdi/components';
import { DOCUMENT } from '@tsdi/common';
import { HtmlTemplateModule } from '@tsdi/components/html';
import { ButtonComponent, ButtonGroupComponent, ButtonModule, nextButtonGroupIndex } from '../button';

class FakeClock extends AnimationClock {
    listeners = new Set<() => void>();
    subscribe(listener: () => void): void { this.listeners.add(listener); }
    unsubscribe(listener: () => void): void { this.listeners.delete(listener); }
    tick(): void { this.listeners.forEach(listener => listener()); }
}

@Component({
    selector: 'button-host',
    imports: [ButtonComponent, ButtonGroupComponent],
    template: `
    <ui-button label="Save" :loading="loading" loadingLabel="Saving" :action="onSave"></ui-button>
    <ui-button-group ariaLabel="Actions">
        <ui-button label="One" :action="onGroup"></ui-button>
        <ui-button label="Two" :action="onGroup"></ui-button>
        <ui-button label="Locked" disabled :action="onGroup"></ui-button>
    </ui-button-group>`
})
class ButtonHostComponent {
    loading = false;
    saved = 0;
    grouped = 0;
    onSave = () => { this.saved += 1; };
    onGroup = () => { this.grouped += 1; };
}

@Suite('common button')
export class ButtonTest {
    ctx!: ApplicationContext;
    clock = new FakeClock();

    @Before()
    async init() {
        this.ctx = await Application.run(ButtonHostComponent, {
            deps: [HtmlTemplateModule, ComponentsModule, ButtonModule],
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

    protected async mount(): Promise<ComponentRef<ButtonHostComponent>> {
        const ref = this.ctx.get(ComponentFactory).create(ButtonHostComponent, {
            injector: this.ctx
        }) as ComponentRef<ButtonHostComponent>;
        await ref.render();
        await Promise.resolve();
        return ref;
    }

    @Test('animates a shared-clock spinner while preserving the label slot')
    async loadingSpinner() {
        const realNow = Date.now;
        let now = 1000;
        Date.now = () => now;
        try {
            const ref = await this.mount();
            const host = ref.instance as ButtonHostComponent;
            const button = ref.hostView.query(ButtonComponent) as ComponentRef<ButtonComponent>;
            const root = button.hostView.rootNodes[0] as HTMLButtonElement;
            expect(root.querySelector('.ui-button-spinner')).toBeFalsy();
            host.loading = true;
            for (let index = 0; index < 4; index++) await Promise.resolve();
            expect(root.getAttribute('aria-busy')).toEqual('true');
            expect(root.querySelector('.ui-button-spinner')).toBeTruthy();
            expect(root.textContent).toContain('Saving');
            expect(root.querySelector('.ui-button-label.is-loading-ghost')?.textContent).toEqual('Save');
            const first = root.querySelector('.ui-button-spinner')?.textContent;

            now = 1200;
            this.clock.tick();
            await Promise.resolve();
            expect(root.querySelector('.ui-button-spinner')?.textContent).not.toEqual(first);

            host.loading = false;
            await Promise.resolve();
            expect(root.getAttribute('aria-busy')).toEqual('false');
            expect(root.querySelector('.ui-button-spinner')).toBeFalsy();
        } finally {
            Date.now = realNow;
        }
    }

    @Test('button groups move focus across enabled buttons')
    async groupKeyboard() {
        const ref = await this.mount();
        const host = ref.instance as ButtonHostComponent;
        const doc = this.ctx.get(DOCUMENT) as Document;
        const group = ref.hostView.query(ButtonGroupComponent) as ComponentRef<ButtonGroupComponent>;
        const hostRoot = (group.instance as any).elementRef?.nativeElement as HTMLElement;
        const root = group.hostView.rootNodes[0] as HTMLElement;
        doc.body.appendChild(hostRoot || root);
        const buttons = Array.from(root.querySelectorAll('.ui-button')) as HTMLButtonElement[];
        expect(root.getAttribute('role')).toEqual('group');
        expect(root.getAttribute('aria-label')).toEqual('Actions');
        expect(buttons.length).toEqual(3);

        expect(nextButtonGroupIndex(0, 2, 'ArrowRight')).toEqual(1);
        expect(nextButtonGroupIndex(1, 2, 'ArrowRight')).toEqual(0);
        expect(nextButtonGroupIndex(0, 2, 'ArrowLeft')).toEqual(1);
        expect(nextButtonGroupIndex(1, 2, 'End')).toEqual(1);
        expect(nextButtonGroupIndex(1, 2, 'Home')).toEqual(0);
        buttons[1].click();
        expect(host.grouped).toEqual(1);
        (hostRoot || root).remove();
    }
}
