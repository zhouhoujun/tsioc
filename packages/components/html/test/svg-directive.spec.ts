import expect = require('expect');
import { After, Before, Suite, Test } from '@tsdi/unit';
import { Application, ApplicationContext } from '@tsdi/core';
import { Component, ComponentRef, ComponentsModule } from '@tsdi/components';
import { DOCUMENT } from '@tsdi/common';
import { HtmlTemplateModule } from '../src';

@Component({
    selector: 'svg-directive-test',
    template: `
    <svg class="root" width="120" height="80">
        <circle v-for="item in items" class="dot" cx="{{item.x}}" cy="20" r="4"></circle>
        <rect v-if="show" class="box" x="1" y="1" width="10" height="10"></rect>
    </svg>`
})
class SvgDirectiveComponent {
    items = [{ x: 10 }, { x: 20 }];
    show = true;
}

@Suite('SVG template support')
export class SvgDirectiveSpec {
    ctx!: ApplicationContext;

    @Before()
    async init() {
        this.ctx = await Application.run(SvgDirectiveComponent, {
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

    @Test('renders v-for and v-if elements in the SVG namespace')
    async rendersSvgDirectives() {
        const ref = this.ctx.runners.getRef(SvgDirectiveComponent) as ComponentRef<SvgDirectiveComponent>;
        const root = ref.hostView.rootNodes[0] as any;
        const svg = root.matches?.('.root') ? root : root.querySelector('.root');
        expect(svg).toBeTruthy();
        expect(svg.namespaceURI).toBe('http://www.w3.org/2000/svg');

        let dots = root.querySelectorAll('.dot');
        expect(dots.length).toBe(2);
        dots.forEach((dot: any) => {
            expect(dot.namespaceURI).toBe('http://www.w3.org/2000/svg');
            expect(dot.ownerSVGElement).toBe(svg);
        });
        expect(dots[0].getAttribute('cx')).toBe('10');
        expect(root.querySelector('.box')?.namespaceURI).toBe('http://www.w3.org/2000/svg');

        ref.instance.items = [...ref.instance.items, { x: 30 }];
        await Promise.resolve();
        dots = root.querySelectorAll('.dot');
        expect(dots.length).toBe(3);
        expect(dots[2].namespaceURI).toBe('http://www.w3.org/2000/svg');
        expect(dots[2].getAttribute('cx')).toBe('30');

        ref.instance.show = false;
        await Promise.resolve();
        expect(root.querySelector('.box')).toBeNull();
        ref.instance.show = true;
        await Promise.resolve();
        expect(root.querySelector('.box')?.namespaceURI).toBe('http://www.w3.org/2000/svg');
    }

    @After()
    async clean() {
        await this.ctx?.close();
    }
}
