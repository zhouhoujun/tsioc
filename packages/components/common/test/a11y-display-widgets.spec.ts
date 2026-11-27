import expect = require('expect');
import { After, Before, Suite, Test } from '@tsdi/unit';
import { Application, ApplicationContext } from '@tsdi/core';
import { Component, ComponentFactory, ComponentRef, ComponentsModule } from '@tsdi/components';
import { DOCUMENT } from '@tsdi/common';
import { HtmlTemplateModule } from '@tsdi/components/html';
import { ImageComponent, ImageModule } from '../image';
import { QrCodeComponent, QrCodeModule } from '../qr-code';
import { DividerComponent, DividerModule } from '../divider';
import { EmptyStateComponent, EmptyStateModule } from '../empty-state';
import { SkeletonComponent, SkeletonModule } from '../skeleton';
import { StatComponent, StatModule } from '../stat';
import { DescriptionsComponent, DescriptionsModule } from '../descriptions';
import { StatusListComponent, StatusListModule } from '../status-list';
import { KeymapPanelComponent, KeymapPanelModule } from '../keymap';
import { TimelineComponent, TimelineModule } from '../timeline';
import { CardComponent, CardModule } from '../card';
import { AvatarComponent, AvatarModule } from '../avatar';
import { BadgeComponent, BadgeModule } from '../badge';
import { auditA11y, formatViolations } from './support/a11y-audit';

@Component({
    selector: 'a11y-display-host',
    imports: [
        ImageComponent, QrCodeComponent, DividerComponent, EmptyStateComponent, SkeletonComponent,
        StatComponent, DescriptionsComponent, StatusListComponent, KeymapPanelComponent,
        TimelineComponent, CardComponent, AvatarComponent, BadgeComponent
    ],
    template: `
    <ui-image src="chart.png" alt="Chart"></ui-image>
    <ui-qr-code :matrix="qr"></ui-qr-code>
    <ui-divider label="Section"></ui-divider>
    <ui-empty title="No rows" hint="Try again" actionLabel="Reset" :action="noop"></ui-empty>
    <ui-skeleton label="Loading"></ui-skeleton>
    <ui-stat label="Routes" value="2" hint="enabled"></ui-stat>
    <ui-descriptions :items="details"></ui-descriptions>
    <status-list title="Status" :items="statusItems"></status-list>
    <keymap-panel title="Keys" :items="keys"></keymap-panel>
    <ui-timeline :items="timeline"></ui-timeline>
    <ui-card title="Card"><span class="card-body">body</span></ui-card>
    <ui-avatar label="Ada Lovelace"></ui-avatar>
    <ui-badge label="Beta"></ui-badge>
    <ui-badge dot :action="noop" ariaLabel="Notifications"></ui-badge>`
})
class A11yDisplayHostComponent {
    qr = [['1', '0'], ['0', '1']];
    details = [
        { label: 'Owner', value: 'Ada' },
        { label: 'Status', value: 'Ready' }
    ];
    statusItems = [
        { label: 'Service', status: 'ok' as const, statusLabel: 'ready' }
    ];
    keys = [{ key: 'Ctrl+K', action: 'palette' }];
    timeline = [
        { id: 'one', title: 'Started', status: 'done' as const },
        { id: 'two', title: 'Running', status: 'running' as const }
    ];
    noop = () => undefined;
}

@Suite('common display widgets accessibility')
export class A11yDisplayWidgetsTest {
    ctx!: ApplicationContext;

    @Before()
    async init() {
        this.ctx = await Application.run(A11yDisplayHostComponent, {
            deps: [
                HtmlTemplateModule,
                ComponentsModule,
                ImageModule,
                QrCodeModule,
                DividerModule,
                EmptyStateModule,
                SkeletonModule,
                StatModule,
                DescriptionsModule,
                StatusListModule,
                KeymapPanelModule,
                TimelineModule,
                CardModule,
                AvatarModule,
                BadgeModule
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

    @Test('static display widgets pass the shared accessibility audit')
    async audit() {
        const ref = this.ctx.get(ComponentFactory).create(A11yDisplayHostComponent, { injector: this.ctx }) as ComponentRef<A11yDisplayHostComponent>;
        await ref.render();
        for (let index = 0; index < 4; index++) {
            await Promise.resolve();
        }
        const roots = ref.hostView.rootNodes.filter((node: any) => typeof node.querySelector === 'function') as HTMLElement[];
        const violations = roots.flatMap(root => auditA11y(root, this.ctx.get(DOCUMENT)));
        expect(formatViolations(violations)).toEqual('');
    }
}
