import expect = require('expect');
import { After, Before, Suite, Test } from '@tsdi/unit';
import { Application, ApplicationContext } from '@tsdi/core';
import { DOCUMENT } from '@tsdi/common';
import { Attribute, Component, ComponentRef, ComponentsModule, OnDestroy } from '@tsdi/components';
import { HtmlTemplateModule } from '../src';

/**
 * Child component rendered inside structural views. Removing the owning view
 * must destroy it; before the view-teardown fix the component ref was dropped
 * after destroying only its host view, so the instance, its injector and the
 * DOM it owned stayed retained by the long-lived parent injector.
 */
@Component({
    selector: 'html-teardown-probe',
    template: `<span class="probe">{{label}}</span>`
})
class TeardownProbeComponent implements OnDestroy {
    static created = 0;
    static destroyed = 0;

    @Attribute() label = '';

    constructor() {
        TeardownProbeComponent.created += 1;
    }

    onDestroy(): void {
        TeardownProbeComponent.destroyed += 1;
    }
}

@Component({
    selector: 'html-view-teardown-host',
    imports: [TeardownProbeComponent],
    template: `
    <div class="host">
        <html-teardown-probe class="branch" label="branch" v-if="show"></html-teardown-probe>
        <html-teardown-probe class="row" label="row" v-for="item in items"></html-teardown-probe>
    </div>`
})
class ViewTeardownHostComponent {
    show = true;
    items = ['one', 'two'];
}

async function flush(): Promise<void> {
    for (let index = 0; index < 4; index++) {
        await Promise.resolve();
    }
    await new Promise(resolve => setTimeout(resolve, 0));
}

@Suite('HTML view teardown')
export class HtmlViewTeardownTest {
    ctx!: ApplicationContext;

    @Before()
    async init() {
        TeardownProbeComponent.created = 0;
        TeardownProbeComponent.destroyed = 0;
        this.ctx = await Application.run(ViewTeardownHostComponent, {
            deps: [HtmlTemplateModule, ComponentsModule],
            providers: [
                {
                    provide: DOCUMENT,
                    useFactory: () => {
                        const { JSDOM } = require('jsdom');
                        return new JSDOM('<!DOCTYPE html><html><body></body></html>').window.document;
                    }
                }
            ]
        });
        await flush();
    }

    @After()
    async destroy() {
        await this.ctx?.close();
    }

    @Test('destroys components of a removed v-if branch and a removed v-for row')
    async destroysComponentsOfRemovedViews() {
        const ref = this.ctx.runners.getRef(ViewTeardownHostComponent) as ComponentRef<ViewTeardownHostComponent>;
        const root = ref.hostView.rootNodes[0] as any;

        expect(root.querySelectorAll('.branch').length).toBe(1);
        expect(root.querySelectorAll('.row').length).toBe(2);
        expect(root.querySelectorAll('.probe').length).toBe(3);

        // Count deltas: mounting may create and discard a provisional instance,
        // what matters is that every removal destroys its own component.
        const before = TeardownProbeComponent.destroyed;

        // Removing the branch destroys the component that owned it.
        ref.instance.show = false;
        await flush();
        expect(root.querySelectorAll('.branch').length).toBe(0);
        expect(root.querySelectorAll('.probe').length).toBe(2);
        expect(TeardownProbeComponent.destroyed).toBe(before + 1);

        // Dropping a row destroys exactly the component of that row.
        ref.instance.items = ['one'];
        await flush();
        expect(root.querySelectorAll('.row').length).toBe(1);
        expect(root.querySelectorAll('.probe').length).toBe(1);
        expect(TeardownProbeComponent.destroyed).toBe(before + 2);
    }
}
