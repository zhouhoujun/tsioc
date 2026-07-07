import expect = require('expect');
import { After, Before, Suite, Test } from '@tsdi/unit';
import { Application, ApplicationContext } from '@tsdi/core';
import { Component, ComponentRef, ComponentsModule } from '../src';
import { HtmlTemplateModule } from '../html/src';
import { DOCUMENT } from '@tsdi/common';

@Component({
    selector: 'style-binding-spec',
    template: `
    <section>
        <p class="status-line" v-style="statusStyle">State: {{status}}</p>
    </section>
    `
})
class StyleBindingSpecComponent {
    status = 'idle';

    get statusStyle() {
        return {
            color: this.status === 'idle' ? '#7ee787' : '#d29922',
            background: '#0d1117'
        };
    }
}

@Suite('style binding regression')
export class StyleBindingRegressionTest {
    ctx!: ApplicationContext;

    @Before()
    async init() {
        this.ctx = await Application.run(StyleBindingSpecComponent, {
            deps: [HtmlTemplateModule, ComponentsModule],
            providers: [{
                provide: DOCUMENT,
                useFactory: () => {
                    const { JSDOM } = require('jsdom');
                    return new JSDOM('<!DOCTYPE html><html><body></body></html>').window.document;
                }
            }]
        });
    }

    @Test('keeps v-style object binding and inline interpolation in sync')
    async renderAndRefresh() {
        const ref = this.ctx.runners.getRef(StyleBindingSpecComponent) as ComponentRef<StyleBindingSpecComponent>;
        const root = ref.hostView.rootNodes[0] as any;
        const line = root.querySelector('.status-line');
        const initialStyle = line?.getAttribute('style') || '';

        expect(line?.textContent).toEqual('State: idle');
        expect(initialStyle).toContain('background');
        expect(initialStyle).toContain('color');

        ref.instance.status = 'running';
        await Promise.resolve();

        expect(line?.textContent).toEqual('State: running');
        expect(line?.getAttribute('style')).toContain('background');
        expect(line?.getAttribute('style')).toContain('color');
        expect(line?.getAttribute('style')).not.toEqual(initialStyle);
    }

    @After()
    async clean() {
        await this.ctx?.close();
    }
}
