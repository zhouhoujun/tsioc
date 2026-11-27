import expect = require('expect');
import { After, Before, Suite, Test } from '@tsdi/unit';
import { Application, ApplicationContext } from '@tsdi/core';
import { Component, ComponentFactory, ComponentRef, ComponentsModule } from '@tsdi/components';
import { DOCUMENT } from '@tsdi/common';
import { HtmlTemplateModule } from '@tsdi/components/html';
import { PanelComponent, PanelModule } from '../panel';
import { auditA11y, formatViolations } from './support/a11y-audit';

@Component({
    selector: 'panel-dom-host',
    imports: [PanelComponent],
    template: `
    <ui-panel summary="Projected summary">
        <panel-header>Panel header</panel-header>
        <panel-summary>Collapsed summary</panel-summary>
        <panel-body>Panel body</panel-body>
    </ui-panel>`
})
class PanelDomHostComponent { }

@Suite('common panel DOM accessibility')
export class PanelDomTest {
    ctx!: ApplicationContext;

    @Before()
    async init() {
        this.ctx = await Application.run(PanelDomHostComponent, {
            deps: [HtmlTemplateModule, ComponentsModule, PanelModule],
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

    protected async mount(): Promise<{ root: HTMLElement; panel: ComponentRef<PanelComponent> }> {
        const ref = this.ctx.get(ComponentFactory).create(PanelDomHostComponent, { injector: this.ctx }) as ComponentRef<PanelDomHostComponent>;
        await ref.render();
        for (let index = 0; index < 6; index++) {
            await Promise.resolve();
        }
        const panel = ref.hostView.query(PanelComponent) as ComponentRef<PanelComponent>;
        return { root: panel.hostView.rootNodes[0] as HTMLElement, panel };
    }

    @Test('header and summary are focusable buttons with expanded state')
    async keyboardToggle() {
        const { root, panel } = await this.mount();
        const header = root.querySelector('.panel-header') as HTMLElement;
        const summary = root.querySelector('.panel-summary') as HTMLElement;
        expect(header.getAttribute('role')).toEqual('button');
        expect(header.getAttribute('tabindex')).toEqual('0');
        expect(header.getAttribute('aria-expanded')).toEqual('false');
        expect(summary.getAttribute('role')).toEqual('button');
        expect(summary.getAttribute('aria-expanded')).toEqual('false');

        header.dispatchEvent(new (this.ctx.get(DOCUMENT) as any).defaultView.KeyboardEvent('keydown', {
            key: 'Enter', bubbles: true
        }));
        await Promise.resolve();
        expect(panel.instance.expanded).toEqual(true);
        expect(header.getAttribute('aria-expanded')).toEqual('true');
    }

    @Test('panel projection passes the shared accessibility audit')
    async a11y() {
        const { root } = await this.mount();
        expect(formatViolations(auditA11y(root, this.ctx.get(DOCUMENT)))).toEqual('');
    }
}
