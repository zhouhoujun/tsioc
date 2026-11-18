import expect = require('expect');
import { After, Before, Suite, Test } from '@tsdi/unit';
import { Application, ApplicationContext } from '@tsdi/core';
import { Component, ComponentFactory, ComponentRef, ComponentsModule } from '@tsdi/components';
import { DOCUMENT } from '@tsdi/common';
import { HtmlTemplateModule } from '@tsdi/components/html';
import { ButtonComponent, ButtonModule } from '../button';
import { BadgeComponent, BadgeModule } from '../badge';
import { CardComponent, CardModule } from '../card';
import { EmptyStateComponent, EmptyStateModule } from '../empty-state';
import { DividerComponent, DividerModule } from '../divider';
import { StatComponent, StatModule } from '../stat';
import { ProgressComponent, ProgressModule } from '../progress';
import { BreadcrumbComponent, BreadcrumbModule, BreadcrumbItem } from '../breadcrumb';

@Component({
    selector: 'base-ui-host',
    imports: [ButtonComponent, BadgeComponent, CardComponent, EmptyStateComponent, DividerComponent, StatComponent, ProgressComponent, BreadcrumbComponent],
    template: `
    <ui-button label="Save" tone="accent" size="sm" :action="onAction"></ui-button>
    <ui-button label="Disabled" disabled :action="onAction"></ui-button>
    <ui-badge label="running" tone="success" dot></ui-badge>
    <ui-badge label="filter" :action="onBadge"></ui-badge>
    <ui-card title="Card title" subtitle="Sub" meta="v1" divider>
        <ui-button slot="actions" label="Act" :action="onAction"></ui-button>
        <span class="card-body-text">body</span>
    </ui-card>
    <ui-empty icon="search" title="Nothing" hint="Try again" actionLabel="Reset" :action="onAction"></ui-empty>
    <ui-divider label="Section" fill></ui-divider>
    <ui-stat label="Routes" value="2" hint="enabled" tone="success" trend="up" trendLabel="+1"></ui-stat>
    <ui-progress label="Load" :value="25" :max="100" :width="10"></ui-progress>
    <ui-breadcrumb :items="trail" :maxItems="4" :action="onCrumb"></ui-breadcrumb>`
})
class BaseUiHostComponent {
    clicked = 0;
    badges = 0;
    crumb = '';
    trail: BreadcrumbItem[] = [
        { label: 'Home' },
        { label: 'Projects' },
        { label: 'Workflow' },
        { label: 'Detail' },
        { label: 'Step' }
    ];
    onAction = () => { this.clicked += 1; };
    onBadge = () => { this.badges += 1; };
    onCrumb = (item: BreadcrumbItem) => { this.crumb = item.label; };
}

@Suite('common base UI primitives')
export class BaseUiPrimitivesTest {
    ctx!: ApplicationContext;

    @Before()
    async init() {
        this.ctx = await Application.run(BaseUiHostComponent, {
            deps: [
                HtmlTemplateModule,
                ComponentsModule,
                ButtonModule,
                BadgeModule,
                CardModule,
                EmptyStateModule,
                DividerModule,
                StatModule,
                ProgressModule,
                BreadcrumbModule
            ],
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

    protected async mount(): Promise<ComponentRef<BaseUiHostComponent>> {
        const ref = this.ctx.get(ComponentFactory).create(BaseUiHostComponent, {
            injector: this.ctx
        }) as ComponentRef<BaseUiHostComponent>;
        await ref.render();
        await Promise.resolve();
        return ref;
    }

    @Test('button exposes tone/size and only fires when enabled')
    async buttons() {
        const ref = await this.mount();
        const host = ref.instance as BaseUiHostComponent;
        const button = ref.hostView.query(ButtonComponent) as ComponentRef<ButtonComponent>;
        const root = button.hostView.rootNodes[0] as HTMLButtonElement;

        expect(button.instance.tone).toEqual('accent');
        expect(button.instance.size).toEqual('sm');
        expect(root.tagName).toEqual('BUTTON');
        expect(root.className).toContain('ui-button');
        expect(root.className).toContain('is-accent');
        expect(root.textContent).toContain('Save');

        root.click();
        expect(host.clicked).toEqual(1);

        const buttons = ref.hostView.queryAll(ButtonComponent) as ComponentRef<ButtonComponent>[];
        const disabled = buttons[1];
        const disabledRoot = disabled.hostView.rootNodes[0] as HTMLButtonElement;
        disabledRoot.click();
        expect(host.clicked).toEqual(1);
    }

    @Test('badge is passive by default and actionable when an action exists')
    async badges() {
        const ref = await this.mount();
        const host = ref.instance as BaseUiHostComponent;
        const badges = ref.hostView.queryAll(BadgeComponent) as ComponentRef<BadgeComponent>[];
        const passive = badges[0].hostView.rootNodes[0] as HTMLElement;
        const actionable = badges[1].hostView.rootNodes[0] as HTMLElement;

        expect(passive.getAttribute('role')).toEqual('status');
        expect(passive.textContent).toContain('running');
        expect(passive.querySelector('.ui-badge-dot')).toBeTruthy();
        expect(actionable.getAttribute('role')).toEqual('button');
        actionable.click();
        expect(host.badges).toEqual(1);
    }

    @Test('card projects the action slot and body')
    async card() {
        const ref = await this.mount();
        const card = ref.hostView.query(CardComponent) as ComponentRef<CardComponent>;
        const root = card.hostView.rootNodes[0] as HTMLElement;

        expect(root.textContent).toContain('Card title');
        expect(root.textContent).toContain('Sub');
        expect(root.textContent).toContain('v1');
        expect(root.textContent).toContain('body');
        expect(root.querySelector('.ui-card-actions button')?.textContent).toContain('Act');
        expect(root.className).toContain('ui-card');
        expect(root.className).toContain('has-divider');
    }

    @Test('empty state, divider and stat render semantic text')
    async emptyDividerStat() {
        const ref = await this.mount();
        const empty = ref.hostView.query(EmptyStateComponent) as ComponentRef<EmptyStateComponent>;
        const emptyRoot = empty.hostView.rootNodes[0] as HTMLElement;
        expect(emptyRoot.textContent).toContain('Nothing');
        expect(emptyRoot.textContent).toContain('Try again');
        expect(emptyRoot.querySelector('button')?.textContent).toContain('Reset');

        const divider = ref.hostView.query(DividerComponent) as ComponentRef<DividerComponent>;
        expect((divider.hostView.rootNodes[0] as HTMLElement).textContent).toContain('Section');

        const stat = ref.hostView.query(StatComponent) as ComponentRef<StatComponent>;
        const statRoot = stat.hostView.rootNodes[0] as HTMLElement;
        expect(statRoot.textContent).toContain('Routes');
        expect(statRoot.textContent).toContain('2');
        expect(statRoot.textContent).toContain('+1');
        expect(statRoot.getAttribute('data-tone')).toEqual('success');
    }

    @Test('progress renders a deterministic text bar and aria values')
    async progress() {
        const ref = await this.mount();
        const progress = ref.hostView.query(ProgressComponent) as ComponentRef<ProgressComponent>;
        const root = progress.hostView.rootNodes[0] as HTMLElement;

        expect(progress.instance.percent).toEqual(25);
        expect(root.textContent).toContain('25%');
        expect(root.textContent).toContain('███░░░░░░░');
        expect(root.getAttribute('role')).toEqual('progressbar');
        expect(root.getAttribute('aria-valuenow')).toEqual('25');
    }

    @Test('breadcrumb collapses the middle and dispatches the original item')
    async breadcrumb() {
        const ref = await this.mount();
        const host = ref.instance as BaseUiHostComponent;
        const breadcrumb = ref.hostView.query(BreadcrumbComponent) as ComponentRef<BreadcrumbComponent>;
        const root = breadcrumb.hostView.rootNodes[0] as HTMLElement;

        expect(root.textContent).toContain('Home');
        expect(root.textContent).toContain('…');
        expect(root.textContent).toContain('Step');
        expect(root.querySelectorAll('.ui-breadcrumb-node').length).toEqual(4);
        expect(root.querySelector('.ui-breadcrumb-item.is-current')?.textContent).toContain('Step');

        (root.querySelectorAll('.ui-breadcrumb-item[role="link"]')[0] as HTMLElement).click();
        expect(host.crumb).toEqual('Home');
    }
}
