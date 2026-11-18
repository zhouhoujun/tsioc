import expect = require('expect');
import { After, Before, Suite, Test } from '@tsdi/unit';
import { Application, ApplicationContext } from '@tsdi/core';
import { Component, ComponentFactory, ComponentRef, ComponentsModule } from '@tsdi/components';
import { DOCUMENT } from '@tsdi/common';
import { HtmlTemplateModule } from '@tsdi/components/html';
import { AlertNoticeComponent, AlertNoticeModule } from '../alert-notice';
import { SelectTriggerComponent, SelectTriggerModule } from '../select-trigger';

@Component({
    selector: 'p4-ui-host',
    imports: [AlertNoticeComponent, SelectTriggerComponent],
    template: `
    <ui-alert title="Heads up" :lines="['First', 'Second']" tone="warning"
        actionLabel="Retry" dismissible :action="onAction" :closeAction="onClose"></ui-alert>
    <ui-alert title="Failed" tone="danger" :lines="['Again']"></ui-alert>
    <ui-select-trigger value="basic" label="Basic" clearable
        :action="onOpen" :clearAction="onClear"></ui-select-trigger>`
})
class P4UiHostComponent {
    actions = 0;
    closed = 0;
    opened = 0;
    cleared = 0;
    onAction = () => { this.actions += 1; };
    onClose = () => { this.closed += 1; };
    onOpen = () => { this.opened += 1; };
    onClear = () => { this.cleared += 1; };
}

@Suite('common P4 UI widgets')
export class P4UiWidgetsTest {
    ctx!: ApplicationContext;

    @Before()
    async init() {
        this.ctx = await Application.run(P4UiHostComponent, {
            deps: [HtmlTemplateModule, ComponentsModule, AlertNoticeModule, SelectTriggerModule],
            providers: [{
                provide: DOCUMENT,
                useFactory: () => {
                    const { JSDOM } = require('jsdom');
                    return new JSDOM('<!DOCTYPE html><html><body></body></html>').window.document;
                }
            }]
        });
    }

    @After()
    async clean() {
        await this.ctx.close();
    }

    protected async mount(): Promise<ComponentRef<P4UiHostComponent>> {
        const ref = this.ctx.get(ComponentFactory).create(P4UiHostComponent, {
            injector: this.ctx
        }) as ComponentRef<P4UiHostComponent>;
        await ref.render();
        await Promise.resolve();
        return ref;
    }

    @Test('alert renders lines, tone role and actions')
    async alert() {
        const ref = await this.mount();
        const host = ref.instance as P4UiHostComponent;
        const alerts = ref.hostView.queryAll(AlertNoticeComponent) as ComponentRef<AlertNoticeComponent>[];
        const warning = alerts[0].hostView.rootNodes[0] as HTMLElement;
        const danger = alerts[1].hostView.rootNodes[0] as HTMLElement;

        expect(warning.getAttribute('data-tone')).toEqual('warning');
        expect(warning.getAttribute('role')).toEqual('status');
        expect(warning.textContent).toContain('Heads up');
        expect(warning.textContent).toContain('First');
        expect(warning.textContent).toContain('Second');

        (warning.querySelector('.ui-alert-action') as HTMLButtonElement).click();
        expect(host.actions).toEqual(1);
        (warning.querySelector('.ui-alert-close') as HTMLButtonElement).click();
        expect(host.closed).toEqual(1);

        expect(danger.getAttribute('role')).toEqual('alert');
        expect(danger.textContent).toContain('Again');
    }

    @Test('select trigger activates and clears the current value')
    async selectTrigger() {
        const ref = await this.mount();
        const host = ref.instance as P4UiHostComponent;
        const trigger = ref.hostView.query(SelectTriggerComponent) as ComponentRef<SelectTriggerComponent>;
        const root = trigger.hostView.rootNodes[0] as HTMLElement;

        expect(root.getAttribute('role')).toEqual('combobox');
        expect(root.textContent).toContain('Basic');
        root.click();
        expect(host.opened).toEqual(1);

        (root.querySelector('.ui-select-clear') as HTMLButtonElement).click();
        expect(host.cleared).toEqual(1);
        expect(trigger.instance.value).toEqual('');
        expect(trigger.instance.label).toEqual('');
        expect(root.textContent).toContain('Select…');
    }
}
