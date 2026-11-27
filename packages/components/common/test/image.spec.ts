import expect = require('expect');
import { After, Before, Suite, Test } from '@tsdi/unit';
import { Application, ApplicationContext } from '@tsdi/core';
import { Component, ComponentFactory, ComponentRef, ComponentsModule } from '@tsdi/components';
import { DOCUMENT } from '@tsdi/common';
import { HtmlTemplateModule } from '@tsdi/components/html';
import { ImageComponent, ImageModule } from '../image';

@Component({
    selector: 'image-host',
    imports: [ImageComponent],
    template: `
    <ui-image src="a.png" alt="Chart" width="120" height="80" fit="contain"></ui-image>
    <ui-image fallback="Placeholder"></ui-image>
    <ui-image src="b.png" fallback="Fallback alt"></ui-image>`
})
class ImageHostComponent { }

@Suite('common image')
export class ImageTest {
    ctx!: ApplicationContext;

    @Before()
    async init() {
        this.ctx = await Application.run(ImageHostComponent, {
            deps: [HtmlTemplateModule, ComponentsModule, ImageModule],
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

    protected async mount(): Promise<HTMLElement[]> {
        const ref = this.ctx.get(ComponentFactory).create(ImageHostComponent, {
            injector: this.ctx
        }) as ComponentRef<ImageHostComponent>;
        await ref.render();
        await Promise.resolve();
        return (ref.hostView.queryAll(ImageComponent) as ComponentRef<ImageComponent>[])
            .map(image => image.hostView.rootNodes[0] as HTMLElement);
    }

    @Test('renders the image and its caption')
    async renders() {
        const roots = await this.mount();
        const root = roots[0];
        const image = root.querySelector('img') as HTMLImageElement;
        const doc = this.ctx.get(DOCUMENT) as Document;

        expect(image.getAttribute('src')).toEqual('a.png');
        expect(image.getAttribute('alt')).toEqual('Chart');
        expect(image.getAttribute('width')).toEqual('120');
        expect(image.getAttribute('height')).toEqual('80');
        expect(image.style.objectFit).toEqual('contain');
        expect(root.querySelector('.ui-image-caption')?.textContent).toEqual('Chart');
        expect(doc.getElementById('tsdi-image-styles')?.textContent).toContain('.ui-image');

        const fallback = roots[1];
        expect(fallback.querySelector('img')).toBeFalsy();
        expect(fallback.querySelector('.ui-image-caption')?.textContent).toEqual('Placeholder');

        const fallbackAlt = roots[2].querySelector('img') as HTMLImageElement;
        expect(fallbackAlt.getAttribute('alt')).toEqual('Fallback alt');
        expect(roots[2].querySelector('.ui-image-caption')?.textContent).toEqual('Fallback alt');
    }
}
