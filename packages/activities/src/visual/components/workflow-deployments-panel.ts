import { Attribute, Component } from '@tsdi/components';
import { Optional } from '@tsdi/ioc';
import { Translator } from '@tsdi/i18n';
import { translateWorkflow } from '../i18n';
import { WorkflowDeploymentStatus } from '../workflow-store';

/**
 * Deployment manager dialog. Presentational: the host loads the list, performs
 * start/stop and owns busy/error state.
 */
@Component({
    selector: 'workflow-deployments-panel',
    template: `
    <div class="workflow-publish workflow-deployments">
        <div class="workflow-publish-panel workflow-deployments-panel">
            <div class="workflow-publish-head">
                <span class="workflow-publish-title">{{title}}</span>
                <button class="workflow-btn workflow-publish-close" type="button"
                    [aria-label]="closeLabel" [title]="closeLabel" @click="close">✕</button>
            </div>
            <div class="workflow-publish-error" v-if="error">{{error}}</div>
            <div class="workflow-deployments-actions">
                <ui-button className="workflow-btn workflow-btn-primary" tone="accent"
                    :label="startAllLabel" :disabled="busy" :action="startAllPressed"></ui-button>
                <ui-button className="workflow-btn"
                    :label="stopAllLabel" :disabled="busy" :action="stopAllPressed"></ui-button>
            </div>
            <div class="workflow-deployments-list" v-if="items.length">
                <div class="workflow-deployment-row" v-for="item in items" data-workflow-id="{{item.workflowId}}">
                    <span class="workflow-deployment-id">{{item.workflowId}}</span>
                    <ui-badge class="workflow-deployment-state"
                        :label="item.running ? runningLabel : stoppedLabel"
                        :tone="item.running ? 'success' : 'muted'"
                        :dot="item.running"></ui-badge>
                    <span class="workflow-deployment-ports" v-if="item.ports && item.ports.length">{{portsLabel}} {{item.ports.join(', ')}}</span>
                    <span class="workflow-deployment-runs">{{item.runs}}</span>
                    <ui-button className="workflow-btn" size="xs"
                        :label="item.running ? stopLabel : startLabel"
                        :disabled="busy" :action="togglePressed(item)"></ui-button>
                </div>
            </div>
            <ui-empty class="workflow-deployments-empty" v-else icon="deploy" :title="emptyLabel"></ui-empty>
            <div class="workflow-publish-actions">
                <ui-button className="workflow-btn" :label="closeLabel" :action="closePressed"></ui-button>
            </div>
        </div>
    </div>`
})
export class WorkflowDeploymentsPanelComponent {
    @Attribute() items: WorkflowDeploymentStatus[] = [];
    @Attribute() busy = false;
    @Attribute() error = '';
    @Attribute() locale = 'zh-CN';
    @Attribute() startAllAction?: () => void;
    @Attribute() stopAllAction?: () => void;
    @Attribute() toggleAction?: (item: WorkflowDeploymentStatus) => void;
    @Attribute() closeAction?: () => void;

    constructor(@Optional() private translator?: Translator) { }

    readonly startAllPressed = (): void => { this.startAllAction?.(); };

    readonly stopAllPressed = (): void => { this.stopAllAction?.(); };

    readonly closePressed = (): void => { this.close(); };

    readonly togglePressed = (item: WorkflowDeploymentStatus): (() => void) =>
        () => this.toggleAction?.(item);

    close(): void {
        this.closeAction?.();
    }

    get title(): string { return this.t('deployments', 'Deployments'); }
    get emptyLabel(): string { return this.t('deploymentsEmpty', 'No workflows are deployed.'); }
    get startAllLabel(): string { return this.t('deploymentStartAll', 'Start all'); }
    get stopAllLabel(): string { return this.t('deploymentStopAll', 'Stop all'); }
    get startLabel(): string { return this.t('deploymentStart', 'Start'); }
    get stopLabel(): string { return this.t('deploymentStop', 'Stop'); }
    get runningLabel(): string { return this.t('running', 'Running'); }
    get stoppedLabel(): string { return this.t('stopped', 'Stopped'); }
    get portsLabel(): string { return this.t('ports', 'Ports'); }
    get closeLabel(): string { return this.t('close', 'Close'); }

    private t(key: string, fallback: string): string {
        return translateWorkflow(
            this.translator,
            String(this.locale || '').toLowerCase().startsWith('en') ? 'en' : 'zh-CN',
            `workflow.ui.${key}`,
            fallback
        );
    }
}
