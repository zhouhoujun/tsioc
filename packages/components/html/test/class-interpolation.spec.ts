import expect = require('expect');
import { Before, Suite, Test } from '@tsdi/unit';
import { Application, ApplicationContext } from '@tsdi/core';
import { Attribute, Component, ComponentRef, ComponentsModule } from '@tsdi/components';
import { DOCUMENT } from '@tsdi/common';
import { HtmlTemplateModule } from '../src';

@Component({
    selector: 'class-interpolation-probe',
    template: `
        <p class="base {{extra}}">plain</p>
        <p class="message-token tone-{{tone}}">toned</p>
    `
})
class ClassInterpolationProbeComponent {
    @Attribute() extra = 'dynamic';
    @Attribute() tone = 'code';
}

/**
 * Regression: `class="{{expr}}"` left the unresolved template text in the
 * element's class list (`tone-{{token.tone}}`, `{{blockClass}}`), because the
 * class directive received the raw attribute before interpolation resolved it.
 */
@Suite('HTML class attribute interpolation')
export class HtmlClassInterpolationTest {
    ctx!: ApplicationContext;

    @Before()
    async init() {
        this.ctx = await Application.run(ClassInterpolationProbeComponent, {
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

    @Test('resolved classes never keep the raw interpolation text')
    async noRawDelimitersInClassList() {
        const ref = this.ctx.runners.getRef(ClassInterpolationProbeComponent) as ComponentRef<ClassInterpolationProbeComponent>;
        await ref.render();
        for (let index = 0; index < 40; index++) await Promise.resolve();

        const root = (ref.hostView.rootNodes as any[]).find(node => typeof node.querySelectorAll === 'function');
        const [plain, toned] = (ref.hostView.rootNodes as any[]).filter(node => node.nodeType === 1);

        expect(plain.className).toEqual('base dynamic');
        expect(toned.className).toEqual('message-token tone-code');
        expect(root.innerHTML.includes('{{')).toEqual(false);
    }
}
