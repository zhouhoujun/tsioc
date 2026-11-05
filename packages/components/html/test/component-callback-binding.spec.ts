import expect = require('expect');
import { Before, Suite, Test } from '@tsdi/unit';
import { Application, ApplicationContext } from '@tsdi/core';
import { Attribute, Component, ComponentRef, ComponentsModule } from '@tsdi/components';
import { DOCUMENT } from '@tsdi/common';
import { HtmlTemplateModule } from '../src';

@Component({
    selector: 'callback-child-probe',
    template: `<button class="callback-close" @click="close">close</button>`
})
class CallbackChildProbeComponent {
    @Attribute() closeAction?: () => void;

    close(): void {
        this.closeAction?.();
    }
}

@Component({
    selector: 'callback-parent-probe',
    imports: [CallbackChildProbeComponent],
    template: `<callback-child-probe @closeAction="handleClose"></callback-child-probe>`
})
class CallbackParentProbeComponent {
    closed = false;

    handleClose(): void {
        this.closed = true;
    }
}

@Suite('HTML component callback binding')
export class HtmlComponentCallbackBindingTest {
    ctx!: ApplicationContext;

    @Before()
    async init() {
        this.ctx = await Application.run(CallbackParentProbeComponent, {
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

    @Test('a regular parent method passed to a child keeps the parent as this')
    async callbackKeepsParentContext() {
        const ref = this.ctx.runners.getRef(CallbackParentProbeComponent) as ComponentRef<CallbackParentProbeComponent>;
        await ref.render();
        await Promise.resolve();

        const root = ref.hostView.rootNodes[0] as any;
        root.querySelector('.callback-close').click();
        await Promise.resolve();

        expect(ref.instance.closed).toBeTruthy();
    }
}
