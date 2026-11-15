import { Attribute, Component } from '@tsdi/components';
import { Optional } from '@tsdi/ioc';
import { Translator } from '@tsdi/i18n';
import { WorkflowRunHistoryItem } from '../types';
import { translateWorkflow } from '../i18n';

/**
 * Horizontal run-history strip. Each chip replays a retained execution
 * snapshot on the canvas, so the visual path can be inspected after the run.
 */
@Component({
    selector: 'workflow-run-history',
    template: `
    <div class="workflow-run-history" v-show="items.length">
        <span class="workflow-run-history-title">{{title}}</span>
        <span class="workflow-run-history-count">{{items.length}}</span>
        <button class="workflow-run-chip"
                v-for="item in items"
                [class]="chipClass(item)"
                data-execution-id="{{item.executionId}}"
                [title]="item.statusLabel + ' · ' + item.durationLabel"
                @click="select(item)">
            <span class="workflow-run-chip-dot"></span>
            <span class="workflow-run-chip-time">{{item.label}}</span>
            <span class="workflow-run-chip-status">{{item.statusLabel}}</span>
            <span class="workflow-run-chip-duration" v-if="item.durationLabel">{{item.durationLabel}}</span>
            <span class="workflow-run-chip-size" v-if="item.sizeLabel">{{item.sizeLabel}}</span>
        </button>
        <button class="workflow-run-clear" type="button" [title]="clearLabel" [aria-label]="clearLabel"
            @click="clear">{{clearLabel}}</button>
    </div>`
})
export class WorkflowRunHistoryComponent {
    @Attribute() items: WorkflowRunHistoryItem[] = [];
    @Attribute() locale = 'zh-CN';
    @Attribute() selectAction?: (executionId: string) => void;
    @Attribute() clearAction?: () => void;

    constructor(@Optional() private readonly translator?: Translator) { }

    get isZh(): boolean {
        return String(this.locale || '').toLowerCase().startsWith('zh');
    }

    get title(): string {
        return translateWorkflow(this.translator, this.isZh ? 'zh-CN' : 'en', 'workflow.ui.runHistory', 'Runs');
    }

    chipClass(item: WorkflowRunHistoryItem): Record<string, boolean> {
        return {
            'workflow-run-chip': true,
            [`workflow-run-chip-${item.tone}`]: true,
            'is-active': item.active
        };
    }

    get clearLabel(): string {
        return translateWorkflow(this.translator, this.isZh ? 'zh-CN' : 'en', 'workflow.ui.clearRuns', 'Clear');
    }

    select(item: WorkflowRunHistoryItem): void {
        this.selectAction?.(item.executionId);
    }

    clear(): void {
        this.clearAction?.();
    }
}
