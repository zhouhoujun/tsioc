import expect = require('expect');
import { After, Before, Suite, Test } from '@tsdi/unit';
import { Application, ApplicationContext } from '@tsdi/core';
import { DOCUMENT } from '@tsdi/common';
import { Attribute, Component, ComponentRef, ComponentsModule, OnDestroy } from '@tsdi/components';
import { HtmlTemplateModule } from '../src';

/**
 * Destroying a view must dispose its bindings before directive/component
 * onDestroy hooks run. Those hooks commonly write state; with the old order the
 * write re-ran the dying view's bindings, evaluating expressions whose loop
 * context was already gone (`line is not defined` in the console suite).
 */
const state = {
    version: 0,
    reads: 0,
    get value(): number {
        this.reads += 1;
        return this.version;
    }
};

@Component({
    selector: 'html-destroy-order-row',
    template: `<span class="order-value">{{state.value}}</span>`
})
class DestroyOrderRowComponent implements OnDestroy {
    @Attribute() state: typeof state = state;

    onDestroy(): void {
        // Typical teardown write: bumps a value the row's own binding reads.
        this.state.version += 1;
    }
}

@Component({
    selector: 'html-destroy-order-host',
    imports: [DestroyOrderRowComponent],
    template: `<div class="order-host"><html-destroy-order-row v-for="item in items" [state]="state"></html-destroy-order-row></div>`
})
class DestroyOrderHostComponent {
    items = [1];
    state = state;
}

async function flush(): Promise<void> {
    for (let index = 0; index < 4; index++) {
        await Promise.resolve();
    }
    await new Promise(resolve => setTimeout(resolve, 0));
}

@Suite('HTML view destroy ordering')
export class HtmlViewDestroyOrderTest {
    ctx!: ApplicationContext;

    @Before()
    async init() {
        state.version = 0;
        state.reads = 0;
        this.ctx = await Application.run(DestroyOrderHostComponent, {
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

    @Test('does not re-run a destroyed view binding while onDestroy writes state')
    async noBindingsDuringTeardown() {
        const ref = this.ctx.runners.getRef(DestroyOrderHostComponent) as ComponentRef<DestroyOrderHostComponent>;
        const root = ref.hostView.rootNodes[0] as any;
        expect(root.querySelectorAll('.order-value').length).toBe(1);

        const readsBeforeRemoval = state.reads;
        const versionsBeforeRemoval = state.version;
        ref.instance.items = [];
        await flush();

        // The row was destroyed and its onDestroy hook ran...
        expect(state.version).toBe(versionsBeforeRemoval + 1);
        // ...but their bindings were disposed first, so the teardown writes did
        // not re-evaluate `state.value` for the dying rows.
        expect(state.reads).toBe(readsBeforeRemoval);
        expect(root.querySelectorAll('.order-value').length).toBe(0);
    }
}
