import expect = require('expect');
import { After, Before, Suite, Test } from '@tsdi/unit';
import { Application, ApplicationContext } from '@tsdi/core';
import { Component, ComponentFactory, ComponentRef, ComponentsModule } from '@tsdi/components';
import { DOCUMENT } from '@tsdi/common';
import { HtmlTemplateModule } from '@tsdi/components/html';
import { SegmentedComponent, SegmentedModule } from '../segmented';

@Component({
    selector: 'segmented-host',
    imports: [SegmentedComponent],
    template: `
    <ui-segmented :options="options" :value="mode" ariaLabel="Range"
        :changeAction="onMode"></ui-segmented>
    <ui-segmented :options="options" value="day" disabled ariaLabel="Locked"></ui-segmented>`
})
class SegmentedHostComponent {
    mode = 'day';
    onMode = (value: string) => { this.mode = value; };
    options = [
        { label: 'Day', value: 'day' },
        { label: 'Week', value: 'week' },
        { label: 'Year', value: 'year', disabled: true }
    ];
}

@Suite('common segmented control')
export class SegmentedTest {
    ctx!: ApplicationContext;

    @Before()
    async init() {
        this.ctx = await Application.run(SegmentedHostComponent, {
            deps: [HtmlTemplateModule, ComponentsModule, SegmentedModule],
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

    protected async mount(): Promise<{ ref: ComponentRef<SegmentedHostComponent>; root: HTMLElement; locked: HTMLElement; host: SegmentedHostComponent }> {
        const ref = this.ctx.get(ComponentFactory).create(SegmentedHostComponent, {
            injector: this.ctx
        }) as ComponentRef<SegmentedHostComponent>;
        await ref.render();
        await Promise.resolve();
        const groups = ref.hostView.queryAll(SegmentedComponent) as ComponentRef<SegmentedComponent>[];
        return {
            ref,
            root: groups[0].hostView.rootNodes[0] as HTMLElement,
            locked: groups[1].hostView.rootNodes[0] as HTMLElement,
            host: ref.instance as SegmentedHostComponent
        };
    }

    @Test('renders one roving radio group with separators and selection')
    async rendersOptions() {
        const { root, host } = await this.mount();
        const items = root.querySelectorAll('.ui-segmented-item') as NodeListOf<HTMLElement>;

        expect(root.getAttribute('role')).toEqual('radiogroup');
        expect(root.getAttribute('aria-label')).toEqual('Range');
        expect(items.length).toEqual(3);
        expect(root.querySelectorAll('.ui-segmented-sep').length).toEqual(2);
        expect(items[0].getAttribute('role')).toEqual('radio');
        expect(items[0].getAttribute('aria-checked')).toEqual('true');
        expect(items[0].getAttribute('tabindex')).toEqual('0');
        expect(items[1].getAttribute('tabindex')).toEqual('-1');
        expect(items[2].getAttribute('aria-disabled')).toEqual('true');
        expect(items[2].getAttribute('tabindex')).toEqual('-1');

        items[1].click();
        await Promise.resolve();
        expect(host.mode).toEqual('week');
        expect(items[0].getAttribute('aria-checked')).toEqual('false');
        expect(items[1].getAttribute('aria-checked')).toEqual('true');
        expect(items[1].getAttribute('tabindex')).toEqual('0');
        expect(items[0].getAttribute('tabindex')).toEqual('-1');
        const style = (this.ctx.get(DOCUMENT) as Document).getElementById('tsdi-segmented-styles');
        expect(style?.textContent).toContain('.ui-segmented');
    }

    @Test('arrow/home/end navigation skips disabled options')
    async keyboard() {
        const { root, host } = await this.mount();
        const doc = this.ctx.get(DOCUMENT) as Document;
        // Roving focus moves to the selected radio; dispatch there like a user
        // typing on the focused segment.
        const selectedItem = () => root.querySelector('.ui-segmented-item.is-selected') as HTMLElement;
        const key = async (name: string) => {
            selectedItem().dispatchEvent(new (doc.defaultView as any).KeyboardEvent('keydown', { key: name, bubbles: true }));
            await Promise.resolve();
        };

        await key('ArrowRight');
        expect(host.mode).toEqual('week');
        // Year is disabled, so ArrowRight wraps back to Day.
        await key('ArrowRight');
        expect(host.mode).toEqual('day');
        await key('End');
        expect(host.mode).toEqual('week');
        await key('Home');
        expect(host.mode).toEqual('day');
        await key('Enter');
        expect(host.mode).toEqual('day');
    }

    @Test('a disabled group ignores pointer and keyboard input')
    async disabledGroup() {
        const { locked, host } = await this.mount();
        const doc = this.ctx.get(DOCUMENT) as Document;
        const items = locked.querySelectorAll('.ui-segmented-item') as NodeListOf<HTMLElement>;

        expect(locked.getAttribute('aria-disabled')).toEqual('true');
        items[1].click();
        items[0].dispatchEvent(new (doc.defaultView as any).KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
        await Promise.resolve();
        expect(host.mode).toEqual('day');
        expect(locked.querySelectorAll('.ui-segmented-item.is-selected').length).toEqual(1);
        expect(items[0].getAttribute('aria-checked')).toEqual('true');
    }
}
