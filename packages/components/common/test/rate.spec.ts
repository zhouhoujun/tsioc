import expect = require('expect');
import { After, Before, Suite, Test } from '@tsdi/unit';
import { Application, ApplicationContext } from '@tsdi/core';
import { Component, ComponentFactory, ComponentRef, ComponentsModule } from '@tsdi/components';
import { DOCUMENT } from '@tsdi/common';
import { HtmlTemplateModule } from '@tsdi/components/html';
import { RateComponent, RateModule } from '../rate';

@Component({
    selector: 'rate-host',
    imports: [RateComponent],
    template: `
    <ui-rate :value="value" ariaLabel="Score" :changeAction="onRate"></ui-rate>
    <ui-rate value="4" readonly ariaLabel="Read only"></ui-rate>
    <ui-rate value="2" disabled ariaLabel="Disabled"></ui-rate>`
})
class RateHostComponent {
    value = 3;
    onRate = (value: number) => { this.value = value; };
}

@Suite('common rate')
export class RateTest {
    ctx!: ApplicationContext;

    @Before()
    async init() {
        this.ctx = await Application.run(RateHostComponent, {
            deps: [HtmlTemplateModule, ComponentsModule, RateModule],
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

    protected async mount(): Promise<{ roots: HTMLElement[]; host: RateHostComponent }> {
        const ref = this.ctx.get(ComponentFactory).create(RateHostComponent, {
            injector: this.ctx
        }) as ComponentRef<RateHostComponent>;
        await ref.render();
        await Promise.resolve();
        const rates = ref.hostView.queryAll(RateComponent) as ComponentRef<RateComponent>[];
        return {
            roots: rates.map(rate => rate.hostView.rootNodes[0] as HTMLElement),
            host: ref.instance as RateHostComponent
        };
    }

    @Test('renders stars and updates through click and keyboard')
    async starsAndKeys() {
        const { roots, host } = await this.mount();
        const root = roots[0];
        const doc = this.ctx.get(DOCUMENT) as Document;
        const stars = () => Array.from(root.querySelectorAll('.ui-rate-star') as NodeListOf<HTMLElement>);

        expect(root.getAttribute('role')).toEqual('slider');
        expect(root.getAttribute('aria-label')).toEqual('Score');
        expect(root.getAttribute('aria-valuenow')).toEqual('3');
        expect(root.getAttribute('aria-valuetext')).toEqual('3 / 5');
        expect(root.getAttribute('tabindex')).toEqual('0');
        expect(stars().map(star => star.textContent).join('')).toEqual('★★★☆☆');
        expect(doc.getElementById('tsdi-rate-styles')?.textContent).toContain('.ui-rate');

        stars()[4].click();
        await Promise.resolve();
        expect(host.value).toEqual(5);
        expect(root.getAttribute('aria-valuenow')).toEqual('5');
        expect(stars().map(star => star.textContent).join('')).toEqual('★★★★★');

        stars()[4].click();
        await Promise.resolve();
        expect(host.value).toEqual(0);

        root.dispatchEvent(new (doc.defaultView as any).KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
        expect(host.value).toEqual(1);
        root.dispatchEvent(new (doc.defaultView as any).KeyboardEvent('keydown', { key: 'End', bubbles: true }));
        expect(host.value).toEqual(5);
        root.dispatchEvent(new (doc.defaultView as any).KeyboardEvent('keydown', { key: 'Home', bubbles: true }));
        expect(host.value).toEqual(1);
        root.dispatchEvent(new (doc.defaultView as any).KeyboardEvent('keydown', { key: ' ', bubbles: true }));
        expect(host.value).toEqual(0);
    }

    @Test('readonly and disabled ratings are inert')
    async inert() {
        const { roots } = await this.mount();
        const doc = this.ctx.get(DOCUMENT) as Document;

        for (const root of [roots[1], roots[2]]) {
            expect(root.getAttribute('tabindex')).toEqual('-1');
            const before = root.getAttribute('aria-valuenow');
            (root.querySelectorAll('.ui-rate-star')[4] as HTMLElement).click();
            root.dispatchEvent(new (doc.defaultView as any).KeyboardEvent('keydown', { key: 'End', bubbles: true }));
            expect(root.getAttribute('aria-valuenow')).toEqual(before);
        }
    }
}
