import { Attribute, Component } from '@tsdi/components';
import { Optional } from '@tsdi/ioc';
import { Translator } from '@tsdi/i18n';
import { translateWorkflow } from '../i18n';
import { WorkflowMetrics, WorkflowMetricsTrendPoint } from '../workflow-store';

/**
 * Execution metrics dialog. Presentational: the host owns loading and the
 * selected window; the panel only renders tiles, the trend and node rows.
 */
@Component({
    selector: 'workflow-metrics-panel',
    template: `
    <div class="workflow-publish workflow-metrics">
        <div class="workflow-publish-panel workflow-metrics-panel">
            <div class="workflow-publish-head">
                <span class="workflow-publish-title">{{title}}</span>
                <button class="workflow-btn workflow-publish-close" type="button"
                    [aria-label]="closeLabel" [title]="closeLabel" @click="close">✕</button>
            </div>
            <div class="workflow-metrics-error" v-if="error">{{error}}</div>
            <div class="workflow-metrics-windows">
                <ui-button :className="windowClass(3600000)" size="xs" :label="lastHourLabel"
                    :action="windowPressed(3600000)"></ui-button>
                <ui-button :className="windowClass(86400000)" size="xs" :label="lastDayLabel"
                    :action="windowPressed(86400000)"></ui-button>
                <ui-button :className="windowClass(604800000)" size="xs" :label="lastWeekLabel"
                    :action="windowPressed(604800000)"></ui-button>
            </div>
            <div class="workflow-metrics-summary" v-if="data">
                <ui-stat className="workflow-metrics-stat" :label="runsLabel" :value="data?.runs ?? 0"></ui-stat>
                <ui-stat className="workflow-metrics-stat" :label="successLabel" :value="rate + '%'"></ui-stat>
                <ui-stat className="workflow-metrics-stat" :label="avgLabel"
                    :value="(data?.avgDurationMs ?? 0) + ' ms'"></ui-stat>
                <ui-stat className="workflow-metrics-stat" :label="lastLabel" :value="data?.lastStatus || '-'"></ui-stat>
            </div>
            <div class="workflow-metrics-trend" v-if="trend.length">
                <div class="workflow-metrics-trend-row" v-for="point in trend" data-trend-start="{{point.start}}">
                    <span class="workflow-metrics-trend-time">{{formatTrendTime(point.start)}}</span>
                    <span class="workflow-metrics-trend-bar">
                        <span class="workflow-metrics-trend-fill" [style]="trendStyle(point)"></span>
                    </span>
                    <span class="workflow-metrics-trend-count">{{point.runs}}</span>
                    <span class="workflow-metrics-trend-failed" v-if="point.failed">{{point.failed}} failed</span>
                </div>
            </div>
            <ui-data-table className="workflow-metrics-nodes" v-if="data && data.nodes.length"
                :columns="nodeColumns" :rows="nodeRows" rowKey="nodeId" dense :ariaLabel="title"></ui-data-table>
            <div class="workflow-publish-actions">
                <ui-button className="workflow-btn" :label="closeLabel" :action="closePressed"></ui-button>
            </div>
        </div>
    </div>`
})
export class WorkflowMetricsPanelComponent {
    @Attribute() data?: WorkflowMetrics;
    @Attribute() trend: WorkflowMetricsTrendPoint[] = [];
    @Attribute() rate = 0;
    @Attribute() windowMs = 86400000;
    @Attribute() error = '';
    @Attribute() locale = 'zh-CN';
    @Attribute() windowAction?: (windowMs: number) => void;
    @Attribute() closeAction?: () => void;

    constructor(@Optional() private translator?: Translator) { }

    readonly closePressed = (): void => this.close();

    windowClass(windowMs: number): string {
        return [
            'workflow-btn',
            'workflow-metrics-window',
            this.windowMs === windowMs ? 'is-active' : ''
        ].filter(Boolean).join(' ');
    }

    /** Arrow field: binding expressions call it without a receiver. */
    readonly windowPressed = (windowMs: number): (() => void) =>
        () => this.windowAction?.(windowMs);

    close(): void {
        this.closeAction?.();
    }

    /** Bar width relative to the busiest bucket in the window. */
    trendStyle(point: WorkflowMetricsTrendPoint): string {
        const max = this.trend.reduce((value, item) => Math.max(value, item.runs), 0);
        if (!point?.runs) {
            return 'width:0%';
        }
        return `width:${Math.max(4, Math.round((point.runs / Math.max(1, max)) * 100))}%`;
    }

    formatTrendTime(start: number): string {
        const date = new Date(Number(start) || 0);
        const pad = (value: number) => String(value).padStart(2, '0');
        const time = `${pad(date.getHours())}:${pad(date.getMinutes())}`;
        return this.windowMs > 86400000
            ? `${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${time}`
            : time;
    }

    get nodeColumns(): Array<{ key: string; label: string; align?: 'left' | 'right' }> {
        return [
            { key: 'nodeId', label: this.t('node', 'Node') },
            { key: 'runs', label: this.t('metricsRuns', 'Runs'), align: 'right' },
            { key: 'failed', label: this.t('failed', 'Failed'), align: 'right' },
            { key: 'avgDurationMs', label: this.t('metricsAvg', 'Average'), align: 'right' }
        ];
    }

    get nodeRows(): Array<Record<string, any>> {
        return ((this.data?.nodes || []) as any[]).map(node => ({
            nodeId: node.nodeId,
            runs: node.runs,
            failed: node.failed || 0,
            avgDurationMs: `${node.avgDurationMs} ms`
        }));
    }

    get title(): string { return this.t('metrics', 'Execution metrics'); }
    get runsLabel(): string { return this.t('metricsRuns', 'Runs'); }
    get successLabel(): string { return this.t('metricsSuccess', 'Success'); }
    get avgLabel(): string { return this.t('metricsAvg', 'Average'); }
    get lastLabel(): string { return this.t('metricsLast', 'Last status'); }
    get closeLabel(): string { return this.t('close', 'Close'); }
    get lastHourLabel(): string { return this.t('lastHour', 'Last hour'); }
    get lastDayLabel(): string { return this.t('lastDay', 'Last 24h'); }
    get lastWeekLabel(): string { return this.t('lastWeek', 'Last 7 days'); }

    private t(key: string, fallback: string): string {
        return translateWorkflow(
            this.translator,
            String(this.locale || '').toLowerCase().startsWith('en') ? 'en' : 'zh-CN',
            `workflow.ui.${key}`,
            fallback
        );
    }
}
