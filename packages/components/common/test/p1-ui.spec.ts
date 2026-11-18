import expect = require('expect');
import { After, Before, Suite, Test } from '@tsdi/unit';
import { Application, ApplicationContext } from '@tsdi/core';
import { Component, ComponentFactory, ComponentRef, ComponentsModule } from '@tsdi/components';
import { DOCUMENT } from '@tsdi/common';
import { HtmlTemplateModule } from '@tsdi/components/html';
import { ToolbarComponent, ToolbarModule } from '../toolbar';
import { StepsComponent, StepsModule } from '../steps';
import { TimelineComponent, TimelineModule } from '../timeline';
import { SkeletonComponent, SkeletonModule } from '../skeleton';
import { SearchFieldComponent, SearchFieldModule } from '../search-field';

@Component({
    selector: 'p1-ui-host',
    imports: [ToolbarComponent, StepsComponent, TimelineComponent, SkeletonComponent, SearchFieldComponent],
    template: `
    <ui-toolbar :items="actions" :action="onAction"></ui-toolbar>
    <ui-steps :items="steps" :current="1" :action="onStep"></ui-steps>
    <ui-timeline :items="events"></ui-timeline>
    <ui-skeleton :lines="2" :lineWidths="[6, 4]"></ui-skeleton>
    <ui-search-field label="Find" placeholder="Search…" :value="query"
        :changeAction="onSearch" :submitAction="onSubmit" :clearAction="onClear"></ui-search-field>`
})
class P1UiHostComponent {
    action = '';
    step = '';
    search = '';
    submitted = '';
    cleared = 0;
    query = '';
    actions = [
        { id: 'run', label: 'Run', icon: 'run' },
        { kind: 'separator' },
        { id: 'stop', label: 'Stop', disabled: true },
        { id: 'theme', label: 'Theme', active: true, danger: true }
    ];
    steps = [
        { label: 'Draft' },
        { label: 'Review', hint: 'current' },
        { label: 'Publish' }
    ];
    events = [
        { title: 'Started', time: '10:00', status: 'done' },
        { title: 'Running', status: 'running' },
        { title: 'Failed', status: 'error', detail: 'timeout' }
    ];
    onAction = (item: { id?: string }) => { this.action = String(item.id || ''); };
    onStep = (item: { label: string }) => { this.step = item.label; };
    onSearch = (value: string) => { this.search = value; };
    onSubmit = (value: string) => { this.submitted = value; };
    onClear = () => { this.cleared += 1; };
}

@Suite('common P1 UI widgets')
export class P1UiWidgetsTest {
    ctx!: ApplicationContext;
    win!: any;

    @Before()
    async init() {
        const { JSDOM } = require('jsdom');
        const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
        this.win = dom.window;
        this.ctx = await Application.run(P1UiHostComponent, {
            deps: [
                HtmlTemplateModule,
                ComponentsModule,
                ToolbarModule,
                StepsModule,
                TimelineModule,
                SkeletonModule,
                SearchFieldModule
            ],
            providers: [{ provide: DOCUMENT, useValue: dom.window.document }]
        });
    }

    @After()
    async clean() {
        await this.ctx.close();
    }

    protected async mount(): Promise<ComponentRef<P1UiHostComponent>> {
        const ref = this.ctx.get(ComponentFactory).create(P1UiHostComponent, {
            injector: this.ctx
        }) as ComponentRef<P1UiHostComponent>;
        await ref.render();
        await Promise.resolve();
        return ref;
    }

    @Test('toolbar dispatches enabled items and ignores separators/disabled')
    async toolbar() {
        const ref = await this.mount();
        const host = ref.instance as P1UiHostComponent;
        const toolbar = ref.hostView.query(ToolbarComponent) as ComponentRef<ToolbarComponent>;
        const root = toolbar.hostView.rootNodes[0] as HTMLElement;

        expect(root.getAttribute('role')).toEqual('toolbar');
        expect(root.querySelectorAll('.ui-toolbar-separator').length).toEqual(1);
        const buttons = root.querySelectorAll('.ui-toolbar-item') as NodeListOf<HTMLButtonElement>;
        expect(buttons.length).toEqual(3);

        buttons[0].click();
        expect(host.action).toEqual('run');
        buttons[1].click();
        expect(host.action).toEqual('run');
        expect(buttons[2].className).toContain('is-active');
        expect(buttons[2].className).toContain('is-danger');
    }

    @Test('steps derive done/active/pending and keep explicit hints')
    async steps() {
        const ref = await this.mount();
        const host = ref.instance as P1UiHostComponent;
        const steps = ref.hostView.query(StepsComponent) as ComponentRef<StepsComponent>;
        const root = steps.hostView.rootNodes[0] as HTMLElement;
        const items = root.querySelectorAll('.ui-step') as NodeListOf<HTMLElement>;

        expect(items[0].getAttribute('data-status')).toEqual('done');
        expect(items[1].getAttribute('data-status')).toEqual('active');
        expect(items[2].getAttribute('data-status')).toEqual('pending');
        expect(items[1].textContent).toContain('Review');
        expect(items[1].textContent).toContain('current');
        expect(items[1].getAttribute('aria-current')).toEqual('step');

        items[2].click();
        expect(host.step).toEqual('Publish');
    }

    @Test('timeline renders status markers and details')
    async timeline() {
        const ref = await this.mount();
        const timeline = ref.hostView.query(TimelineComponent) as ComponentRef<TimelineComponent>;
        const root = timeline.hostView.rootNodes[0] as HTMLElement;
        const items = root.querySelectorAll('.ui-timeline-item') as NodeListOf<HTMLElement>;

        expect(items[0].getAttribute('data-status')).toEqual('done');
        expect(items[0].textContent).toContain('Started');
        expect(items[1].getAttribute('data-status')).toEqual('running');
        expect(items[2].getAttribute('data-status')).toEqual('error');
        expect(items[2].textContent).toContain('timeout');
        expect(items[0].querySelector('.ui-timeline-marker')?.textContent).toEqual('✓');
    }

    @Test('skeleton uses the configured line widths')
    async skeleton() {
        const ref = await this.mount();
        const skeleton = ref.hostView.query(SkeletonComponent) as ComponentRef<SkeletonComponent>;
        const root = skeleton.hostView.rootNodes[0] as HTMLElement;
        const lines = root.querySelectorAll('.ui-skeleton-line') as NodeListOf<HTMLElement>;

        expect(lines.length).toEqual(2);
        expect(lines[0].textContent).toEqual('░░░░░░');
        expect(lines[1].textContent).toEqual('░░░░');
        expect(root.getAttribute('aria-busy')).toEqual('true');
    }

    @Test('search field reports edits, submit and clear')
    async searchField() {
        const ref = await this.mount();
        const host = ref.instance as P1UiHostComponent;
        const field = ref.hostView.query(SearchFieldComponent) as ComponentRef<SearchFieldComponent>;
        const root = field.hostView.rootNodes[0] as HTMLElement;
        const input = root.querySelector('input') as HTMLInputElement;

        input.value = 'abc';
        input.dispatchEvent(new this.win.Event('input', { bubbles: true }));
        await Promise.resolve();
        expect(host.search).toEqual('abc');

        input.dispatchEvent(new this.win.KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
        expect(host.submitted).toEqual('abc');

        const clear = root.querySelector('.ui-field-clear') as HTMLButtonElement;
        expect(clear).toBeTruthy();
        clear.click();
        expect(host.search).toEqual('');
        expect(host.cleared).toEqual(1);
    }
}
