import { Attribute, Component } from '@tsdi/components';
import { Optional } from '@tsdi/ioc';
import { Translator } from '@tsdi/i18n';
import { translateWorkflow } from '../i18n';

/** Publish confirmation dialog. Presentational: the host validates and saves. */
@Component({
    selector: 'workflow-publish-panel',
    template: `
    <div class="workflow-publish">
        <div class="workflow-publish-panel">
            <div class="workflow-publish-head">
                <span class="workflow-publish-title">{{title}}</span>
                <button class="workflow-btn workflow-publish-close" type="button"
                    [aria-label]="cancelLabel" [title]="cancelLabel" @click="cancel">✕</button>
            </div>
            <div class="workflow-publish-name">{{workflowName}}</div>
            <div class="workflow-publish-meta">{{meta}}</div>
            <div class="workflow-publish-hint">{{hint}}</div>
            <div class="workflow-publish-error" v-if="error">{{error}}</div>
            <div class="workflow-publish-actions">
                <ui-button className="workflow-btn" :label="cancelLabel" :action="cancelPressed"></ui-button>
                <ui-button className="workflow-btn workflow-btn-primary workflow-publish-confirm"
                    tone="accent" :label="confirmLabel" :action="confirmPressed"></ui-button>
            </div>
        </div>
    </div>`
})
export class WorkflowPublishPanelComponent {
    @Attribute() workflowName = '';
    @Attribute() meta = '';
    @Attribute() hint = '';
    @Attribute() error = '';
    @Attribute() locale = 'zh-CN';
    @Attribute() confirmAction?: () => void;
    @Attribute() cancelAction?: () => void;

    constructor(@Optional() private translator?: Translator) { }

    readonly confirmPressed = (): void => { this.confirmAction?.(); };

    readonly cancelPressed = (): void => { this.cancel(); };

    cancel(): void {
        this.cancelAction?.();
    }

    get title(): string { return this.t('publishTitle', 'Publish workflow'); }
    get confirmLabel(): string { return this.t('publish', 'Publish'); }
    get cancelLabel(): string { return this.t('cancel', 'Cancel'); }

    private t(key: string, fallback: string): string {
        return translateWorkflow(
            this.translator,
            String(this.locale || '').toLowerCase().startsWith('en') ? 'en' : 'zh-CN',
            `workflow.ui.${key}`,
            fallback
        );
    }
}
