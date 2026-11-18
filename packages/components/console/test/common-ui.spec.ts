import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { Application } from '@tsdi/core';
import { Component, ComponentRef, ComponentsModule } from '@tsdi/components';
import { ConsoleTemplateModule } from '../src';
import { TuiRenderer } from '../src/tui';
import { ButtonComponent, ButtonModule } from '@tsdi/components/common/button';
import { BadgeComponent, BadgeModule } from '@tsdi/components/common/badge';
import { CardComponent, CardModule } from '@tsdi/components/common/card';
import { EmptyStateComponent, EmptyStateModule } from '@tsdi/components/common/empty-state';
import { DividerComponent, DividerModule } from '@tsdi/components/common/divider';
import { StatComponent, StatModule } from '@tsdi/components/common/stat';
import { ProgressComponent, ProgressModule } from '@tsdi/components/common/progress';
import { BreadcrumbComponent, BreadcrumbModule } from '@tsdi/components/common/breadcrumb';
import { ToolbarComponent, ToolbarModule } from '@tsdi/components/common/toolbar';
import { StepsComponent, StepsModule } from '@tsdi/components/common/steps';
import { TimelineComponent, TimelineModule } from '@tsdi/components/common/timeline';
import { SkeletonComponent, SkeletonModule } from '@tsdi/components/common/skeleton';

@Component({
    selector: 'common-ui-console-host',
    imports: [ButtonComponent, BadgeComponent, CardComponent, EmptyStateComponent, DividerComponent, StatComponent, ProgressComponent, BreadcrumbComponent, ToolbarComponent, StepsComponent, TimelineComponent, SkeletonComponent],
    template: `
    <div>
        <ui-button label="Save" tone="accent"></ui-button>
        <ui-badge label="running" tone="success" dot></ui-badge>
        <ui-progress label="Load" :value="30" :width="10"></ui-progress>
        <ui-stat label="Routes" value="2" hint="on"></ui-stat>
        <ui-divider label="Section" fill></ui-divider>
        <ui-breadcrumb :items="trail"></ui-breadcrumb>
        <ui-empty title="Nothing" hint="Try" actionLabel="Reset"></ui-empty>
        <ui-card title="Card" meta="v1"><span>body</span></ui-card>
        <ui-toolbar :items="tools"></ui-toolbar>
        <ui-steps :items="steps" :current="1"></ui-steps>
        <ui-timeline :items="events"></ui-timeline>
        <ui-skeleton :lines="1" :width="6"></ui-skeleton>
    </div>`
})
class CommonUiConsoleHostComponent {
    trail = [{ label: 'Home' }, { label: 'Work' }];
    tools = [{ id: 'run', label: 'Run' }, { kind: 'separator' }, { id: 'stop', label: 'Stop' }];
    steps = [{ label: 'Draft' }, { label: 'Review' }, { label: 'Publish' }];
    events = [{ title: 'Started', status: 'done' }, { title: 'Failed', status: 'error' }];
}

@Suite('common base UI console rendering')
export class CommonUiConsoleTest {
    @Test('paints the primitive labels and text progress bar')
    async rendersPrimitives() {
        const ctx = await Application.run(CommonUiConsoleHostComponent, {
            deps: [
                ConsoleTemplateModule,
                ComponentsModule,
                ButtonModule,
                BadgeModule,
                CardModule,
                EmptyStateModule,
                DividerModule,
                StatModule,
                ProgressModule,
                BreadcrumbModule,
                ToolbarModule,
                StepsModule,
                TimelineModule,
                SkeletonModule
            ]
        });
        try {
            const ref = ctx.runners.getRef(CommonUiConsoleHostComponent) as ComponentRef<CommonUiConsoleHostComponent>;
            await ref.render();
            await Promise.resolve();
            const output = new TuiRenderer().renderToLines(ref.hostView.rootNodes[0] as any).join('\n');

            expect(output).toContain('Save');
            expect(output).toContain('running');
            expect(output).toContain('Load');
            expect(output).toContain('███░░░░░░░');
            expect(output).toContain('30%');
            expect(output).toContain('Routes');
            expect(output).toContain('Section');
            expect(output).toContain('Home');
            expect(output).toContain('Nothing');
            expect(output).toContain('Reset');
            expect(output).toContain('Card');
            expect(output).toContain('body');
            expect(output).toContain('Run');
            expect(output).toContain('Draft');
            expect(output).toContain('Started');
            expect(output).toContain('░░░░░░');
        } finally {
            await ctx.close();
        }
    }
}
