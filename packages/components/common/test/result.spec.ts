import expect = require('expect');
import { After, Before, Suite, Test } from '@tsdi/unit';
import { Application, ApplicationContext } from '@tsdi/core';
import { Component, ComponentFactory, ComponentRef, ComponentsModule } from '@tsdi/components';
import { DOCUMENT } from '@tsdi/common';
import { HtmlTemplateModule } from '@tsdi/components/html';
import { ResultComponent, ResultModule } from '../result';

@Component({
    selector: 'result-host',
    imports: [ResultComponent],
    template: `
    <ui-result status="success" title="Done" subTitle="Saved" :lines="['a', 'b']"
        actionLabel="Again" :action="onAgain"></ui-result>
    <ui-result status="404" title="Missing"></ui-result>`
})
class ResultHostComponent {
    count = 0;
    onAgain = () => { this.count += 1; };
}

@Suite('common result')
export class ResultTest {
    ctx!: ApplicationContext;

    @Before()
    async init() {
        this.ctx = await Application.run(ResultHostComponent, {
            deps: [HtmlTemplateModule, ComponentsModule, ResultModule],
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

    protected async mount(): Promise<{ roots: HTMLElement[]; host: ResultHostComponent }> {
        const ref = this.ctx.get(ComponentFactory).create(ResultHostComponent, {
            injector: this.ctx
        }) as ComponentRef<ResultHostComponent>;
        await ref.render();
        await Promise.resolve();
        const results = ref.hostView.queryAll(ResultComponent) as ComponentRef<ResultComponent>[];
        return {
            roots: results.map(result => result.hostView.rootNodes[0] as HTMLElement),
            host: ref.instance as ResultHostComponent
        };
    }

    @Test('renders status content and dispatches the action')
    async renders() {
        const { roots, host } = await this.mount();
        const root = roots[0];
        const doc = this.ctx.get(DOCUMENT) as Document;

        expect(root.getAttribute('role')).toEqual('status');
        expect(root.className).toContain('is-success');
        expect(root.getAttribute('data-tone')).toEqual('success');
        expect(root.querySelector('.ui-result-icon')?.textContent).toEqual('✓');
        expect(root.textContent).toContain('Done');
        expect(root.textContent).toContain('Saved');
        expect(root.textContent).toContain('a');
        expect(doc.getElementById('tsdi-result-styles')?.textContent).toContain('.ui-result');

        const action = root.querySelector('.ui-result-action') as HTMLElement;
        expect(action.getAttribute('role')).toEqual('button');
        action.click();
        expect(host.count).toEqual(1);
        action.dispatchEvent(new (doc.defaultView as any).KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
        expect(host.count).toEqual(2);
    }

    @Test('maps 404 to its own glyph and tone')
    async notFound() {
        const { roots } = await this.mount();
        const root = roots[1];
        expect(root.className).toContain('is-404');
        expect(root.getAttribute('data-tone')).toEqual('warning');
        expect(root.querySelector('.ui-result-icon')?.textContent).toEqual('404');
        expect(root.querySelector('.ui-result-action')).toBeFalsy();
    }
}
