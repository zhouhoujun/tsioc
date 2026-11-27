import expect = require('expect');
import { After, Before, Suite, Test } from '@tsdi/unit';
import { Application, ApplicationContext } from '@tsdi/core';
import { AnimationClock, Component, ComponentFactory, ComponentRef, ComponentsModule } from '@tsdi/components';
import { DOCUMENT } from '@tsdi/common';
import { HtmlTemplateModule } from '@tsdi/components/html';
import { ButtonComponent, ButtonGroupComponent, ButtonModule, LinkButtonComponent, ToggleButtonGroupComponent, nextButtonGroupIndex } from '../button';

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
    <ui-link-button label="Docs" href="https://example.com/docs" :action="onSave"></ui-link-button>
    <ui-button label="Async" :action="asyncSave" :errorAction="onAsyncError"></ui-button>
    <ui-toggle-button-group :items="views" ariaLabel="View" :value="view" :changeAction="onView"></ui-toggle-button-group>
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
    views = [{ id: 'grid', label: 'Grid' }, { id: 'list', label: 'List' }];
    view = 'grid';
    viewChanges: string[] = [];
    asyncError = '';
    asyncSave = () => new Promise<void>(resolve => { (this as any).resolveAsync = resolve; });
    onAsyncError = (error: any) => { this.asyncError = String(error); };
    onView = (value: string) => { this.view = value; this.viewChanges.push(value); };
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

    @Test('renders link semantics and only navigates while enabled')
    async linkButton() {
        const ref = await this.mount();
        const host = ref.instance as ButtonHostComponent;
        const link = ref.hostView.query(LinkButtonComponent) as ComponentRef<LinkButtonComponent>;
        const root = link.hostView.rootNodes[0] as HTMLAnchorElement;
        expect(root.tagName).toEqual('A');
        expect(root.getAttribute('href')).toEqual('https://example.com/docs');
        root.click();
        expect(host.saved).toEqual(1);
        link.instance.disabled = true;
        await Promise.resolve();
        expect(root.getAttribute('href')).toEqual('https://example.com/docs');
        expect(root.getAttribute('aria-disabled')).toEqual('true');
        root.click();
        expect(host.saved).toEqual(1);
    }

    @Test('async actions expose pending state until the promise settles')
    async asyncAction() {
        const ref = await this.mount();
        const host = ref.instance as ButtonHostComponent;
        const buttons = ref.hostView.queryAll(ButtonComponent) as ComponentRef<ButtonComponent>[];
        const asyncButton = buttons.find(button => (button.instance as any).label === 'Async')!;
        const root = asyncButton.hostView.rootNodes[0] as HTMLButtonElement;
        root.click();
        await Promise.resolve();
        expect(asyncButton.instance.busy).toEqual(true);
        expect(root.getAttribute('aria-busy')).toEqual('true');
        expect(root.querySelector('.ui-button-spinner')).toBeTruthy();
        (host as any).resolveAsync();
        for (let index = 0; index < 4; index++) await Promise.resolve();
        expect(asyncButton.instance.busy).toEqual(false);
        expect(root.getAttribute('aria-busy')).toEqual('false');
    }

    @Test('toggle groups maintain single selection and roving focus')
    async toggleGroup() {
        const ref = await this.mount();
        const host = ref.instance as ButtonHostComponent;
        const group = ref.hostView.query(ToggleButtonGroupComponent) as ComponentRef<ToggleButtonGroupComponent>;
        const root = group.hostView.rootNodes[0] as HTMLElement;
        const buttons = Array.from(root.querySelectorAll('.ui-button')) as HTMLElement[];
        expect(buttons.length).toEqual(2);
        expect(buttons[0].getAttribute('aria-pressed')).toEqual('true');
        buttons[1].click();
        await Promise.resolve();
        expect(host.view).toEqual('list');
        expect(host.viewChanges).toEqual(['list']);
        expect(buttons[1].getAttribute('aria-pressed')).toEqual('true');
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
