import expect = require('expect');
import { After, Before, Suite, Test } from '@tsdi/unit';
import { Application, ApplicationContext } from '@tsdi/core';
import { Component, ComponentFactory, ComponentRef, ComponentsModule } from '@tsdi/components';
import { DOCUMENT } from '@tsdi/common';
import { HtmlTemplateModule } from '@tsdi/components/html';
import { SelectTriggerComponent, SelectTriggerModule } from '../select-trigger';
import { auditA11y, formatViolations } from './support/a11y-audit';

@Component({
    selector: 'select-trigger-host',
    imports: [SelectTriggerComponent],
    template: `<ui-select-trigger label="Assignee" value="Ada Lovelace" open clearable
        :action="onOpen" :clearAction="onClear"></ui-select-trigger>`
})
class SelectTriggerHostComponent {
    opened = 0;
    cleared = 0;
    onOpen = () => { this.opened += 1; };
    onClear = () => { this.cleared += 1; };
}

@Suite('common select trigger DOM accessibility')
export class SelectTriggerDomTest {
    ctx!: ApplicationContext;

    @Before()
    async init() {
        this.ctx = await Application.run(SelectTriggerHostComponent, {
            deps: [HtmlTemplateModule, ComponentsModule, SelectTriggerModule],
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

    protected async mount(): Promise<{ ref: ComponentRef<SelectTriggerHostComponent>; root: HTMLElement }> {
        const ref = this.ctx.get(ComponentFactory).create(SelectTriggerHostComponent, { injector: this.ctx }) as ComponentRef<SelectTriggerHostComponent>;
        await ref.render();
        await Promise.resolve();
        const trigger = ref.hostView.query(SelectTriggerComponent) as ComponentRef<SelectTriggerComponent>;
        return { ref, root: trigger.hostView.rootNodes[0] as HTMLElement };
    }

    @Test('trigger exposes combobox state and a labelled clear action')
    async combobox() {
        const { root } = await this.mount();
        expect(root.getAttribute('role')).toEqual('combobox');
        expect(root.getAttribute('aria-expanded')).toEqual('true');
        expect(root.getAttribute('aria-label')).toEqual('Assignee');
        const clear = root.querySelector('.ui-select-clear') as HTMLButtonElement;
        expect(clear.tagName).toEqual('BUTTON');
        expect(clear.getAttribute('aria-label')).toEqual('Clear');
        clear.click();
        expect(formatViolations(auditA11y(root, this.ctx.get(DOCUMENT)))).toEqual('');
    }
}
