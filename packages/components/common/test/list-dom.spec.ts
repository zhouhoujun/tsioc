import expect = require('expect');
import { After, Before, Suite, Test } from '@tsdi/unit';
import { Application, ApplicationContext } from '@tsdi/core';
import { Component, ComponentFactory, ComponentRef, ComponentsModule } from '@tsdi/components';
import { DOCUMENT } from '@tsdi/common';
import { HtmlTemplateModule } from '@tsdi/components/html';
import { ListComponent, ListModule } from '../list';
import { auditA11y, formatViolations } from './support/a11y-audit';

@Component({
    selector: 'list-dom-host',
    imports: [ListComponent],
    template: `
    <ui-list :items="items" title="Sessions" showClose :closeAction="onClose">
        <span class="list-projected">projected</span>
    </ui-list>`
})
class ListDomHostComponent {
    closed = 0;
    items = [
        { id: 'alpha', label: 'Alpha', description: 'first' },
        { id: 'beta', label: 'Beta', selected: true }
    ];
    onClose = () => { this.closed += 1; };
}

@Suite('common list DOM accessibility')
export class ListDomTest {
    ctx!: ApplicationContext;

    @Before()
    async init() {
        this.ctx = await Application.run(ListDomHostComponent, {
            deps: [HtmlTemplateModule, ComponentsModule, ListModule],
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

    protected async mount(): Promise<{ ref: ComponentRef<ListDomHostComponent>; root: HTMLElement }> {
        const ref = this.ctx.get(ComponentFactory).create(ListDomHostComponent, { injector: this.ctx }) as ComponentRef<ListDomHostComponent>;
        await ref.render();
        for (let index = 0; index < 4; index++) {
            await Promise.resolve();
        }
        const list = ref.hostView.query(ListComponent) as ComponentRef<ListComponent>;
        return { ref, root: list.hostView.rootNodes[0] as HTMLElement };
    }

    @Test('close affordance is a named keyboard button and the list audits clean')
    async closeAndAudit() {
        const { ref, root } = await this.mount();
        const close = root.querySelector('.dialog-close') as HTMLElement;
        expect(close.getAttribute('role')).toEqual('button');
        expect(close.getAttribute('tabindex')).toEqual('0');
        expect(close.getAttribute('aria-label')).toEqual('Close');
        close.dispatchEvent(new (this.ctx.get(DOCUMENT) as any).defaultView.KeyboardEvent('keydown', {
            key: 'Enter', bubbles: true
        }));
        expect((ref.instance as ListDomHostComponent).closed).toEqual(1);
        expect(formatViolations(auditA11y(root, this.ctx.get(DOCUMENT)))).toEqual('');
    }
}
