import expect = require('expect');
import { After, Before, Suite, Test } from '@tsdi/unit';
import { Application, ApplicationContext } from '@tsdi/core';
import { DOCUMENT } from '@tsdi/common';
import { Component, ComponentRef, ComponentsModule } from '@tsdi/components';
import { HtmlTemplateModule } from '../src';

@Component({
    selector: 'style-directive-regression',
    template: `
    <section class="wrapper" v-style="wrapperStyle">
        <p class="caption" v-style="captionStyle">Caption</p>
        <input class="field" v-style="fieldStyle" />
        <button class="action" v-style="buttonStyle">Go</button>
    </section>
    `
})
class StyleDirectiveRegressionComponent {
    wrapperStyle = { background: '#101820', padding: '2px' };
    captionStyle = { color: '#7dd9a8' };
    fieldStyle = { background: '#173323', border: '1px solid #34845e' };
    buttonStyle = { color: '#f8f8f2', textTransform: 'uppercase' };
}

@Suite('HTML Style Directive Regression')
export class HtmlStyleDirectiveRegressionTest {
    ctx!: ApplicationContext;

    @Before()
    async init() {
        this.ctx = await Application.run(StyleDirectiveRegressionComponent, {
            deps: [HtmlTemplateModule, ComponentsModule],
            providers: [{
                provide: DOCUMENT,
                useFactory: () => {
                    const { JSDOM } = require('jsdom');
                    const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
                    return dom.window.document;
                }
            }]
        });
    }

    @Test('binds v-style objects to each matching element')
    async render() {
        const ref = this.ctx.runners.getRef(StyleDirectiveRegressionComponent) as ComponentRef<StyleDirectiveRegressionComponent>;
        const root = ref.hostView.rootNodes[0] as any;
        const wrapperStyle = root.getAttribute('style') || '';
        const captionStyle = root.querySelector('.caption')?.getAttribute('style') || '';
        const fieldStyle = root.querySelector('.field')?.getAttribute('style') || '';
        const buttonStyle = root.querySelector('.action')?.getAttribute('style') || '';

        expect(wrapperStyle).toContain('background');
        expect(wrapperStyle).toContain('padding');
        expect(captionStyle).toContain('color');
        expect(captionStyle).not.toContain('background');
        expect(fieldStyle).toContain('background');
        expect(fieldStyle).toContain('border');
        expect(buttonStyle).toContain('color');
        expect(buttonStyle).toContain('text-transform');
    }

    @After()
    async clean() {
        await this.ctx?.close();
    }
}
