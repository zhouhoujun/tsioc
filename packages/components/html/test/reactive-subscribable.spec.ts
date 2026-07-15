import expect = require('expect');
import { After, Before, Suite, Test } from '@tsdi/unit';
import { Application, ApplicationContext } from '@tsdi/core';
import { Component, ComponentRef, ComponentsModule } from '@tsdi/components';
import { DOCUMENT } from '@tsdi/common';
import { HtmlTemplateModule } from '../src';

class SubscribableState {
    status = 'idle';
    private listeners = new Set<() => void>();

    setStatus(status: string): void {
        this.status = status;
        this.listeners.forEach(listener => listener());
    }

    subscribe(listener: () => void): () => void {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }
}

@Component({
    selector: 'subscribable-child',
    template: '<span>Working</span>'
})
class SubscribableChildComponent {
}

@Component({
    selector: 'subscribable-host',
    imports: [SubscribableChildComponent],
    template: `
    <section>
        <subscribable-child v-show="showChild"></subscribable-child>
    </section>
    `
})
class SubscribableHostComponent {
    constructor(public state: SubscribableState) {
    }

    get showChild(): boolean {
        return this.state.status === 'running';
    }
}

@Suite('HTML subscribable state reactivity')
export class ReactiveSubscribableTest {
    ctx!: ApplicationContext;
    state!: SubscribableState;

    @Before()
    async init() {
        this.state = new SubscribableState();
        this.ctx = await Application.run(SubscribableHostComponent, {
            deps: [HtmlTemplateModule, ComponentsModule],
            providers: [{
                provide: SubscribableState,
                useFactory: () => this.state
            }, {
                provide: DOCUMENT,
                useFactory: () => {
                    const { JSDOM } = require('jsdom');
                    return new JSDOM('<!DOCTYPE html><html><body></body></html>').window.document;
                }
            }]
        });
    }

    @Test('updates custom component host directives from external state notifications')
    async updatesCustomComponentHostDirective() {
        const ref = this.ctx.runners.getRef(SubscribableHostComponent) as ComponentRef<SubscribableHostComponent>;
        const root = ref.hostView.rootNodes[0] as any;
        const child = root.querySelector('subscribable-child');

        expect(child?.getAttribute('style')).toContain('display: none');

        this.state.setStatus('running');
        await Promise.resolve();

        expect(child?.getAttribute('style') || '').not.toContain('display: none');
        expect(child?.textContent).toContain('Working');
    }

    @After()
    async clean() {
        await this.ctx?.close();
    }
}
