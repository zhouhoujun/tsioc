import expect = require('expect');
import { Before, Suite, Test, After } from '@tsdi/unit';
import { Application, ApplicationContext } from '@tsdi/core';
import { Component, ComponentRef, ComponentsModule, ElementRef, TemplateRef, ViewChild } from '@tsdi/components';
import { DOCUMENT } from '@tsdi/common';
import { HtmlTemplateModule } from '../src';

@Component({
    selector: 'probe-child',
    template: `<span class="probe-child">child</span>`
})
class ProbeChildComponent {
}

@Component({
    selector: 'view-child-probe',
    imports: [ProbeChildComponent],
    template: `
        <div class="probe-root">
            <probe-child #probe></probe-child>
            <v-template #system>
                <p class="system-template">system</p>
            </v-template>
        </div>
    `
})
class ViewChildProbeComponent {
    @ViewChild('probe') probe?: ProbeChildComponent;
    @ViewChild('probe', ElementRef) probeElement?: ElementRef<any>;
    @ViewChild('system') system?: TemplateRef<any>;
}

@Suite('HTML ViewChild')
export class HtmlViewChildTest {
    ctx!: ApplicationContext;

    @Before()
    async init() {
        this.ctx = await Application.run(ViewChildProbeComponent, {
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

    @Test('resolves local component and template refs with ViewChild')
    async resolveViewChildRefs() {
        const ref = this.ctx.runners.getRef(ViewChildProbeComponent) as ComponentRef<ViewChildProbeComponent>;
        await ref.render();

        expect(ref.instance.probe).toBeInstanceOf(ProbeChildComponent);
        expect(ref.instance.probeElement?.nativeElement?.tagName?.toLowerCase()).toEqual('probe-child');
        expect(ref.instance.system).toBeTruthy();
        expect(typeof ref.instance.system?.createEmbeddedView).toEqual('function');
    }

    @After()
    async clean() {
        await this.ctx?.close();
    }
}
