import { Attribute, Component } from '@tsdi/components';
import { Optional } from '@tsdi/ioc';
import { Translator } from '@tsdi/i18n';
import { translateWorkflow } from '../i18n';

/** Workflow settings dialog (description + run timeout). Presentational. */
@Component({
    selector: 'workflow-settings-panel',
    template: `
    <div class="workflow-publish workflow-settings">
        <div class="workflow-publish-panel workflow-settings-panel">
            <div class="workflow-publish-head">
                <span class="workflow-publish-title">{{title}}</span>
                <button class="workflow-btn workflow-publish-close" type="button"
                    [aria-label]="closeLabel" [title]="closeLabel" @click="close">✕</button>
            </div>
            <label class="workflow-group-field">
                <span>{{descriptionLabel}}</span>
                <textarea class="workflow-settings-description" rows="3"
                    [value]="description" @input="descriptionInput"></textarea>
            </label>
            <label class="workflow-group-field">
                <span>{{timeoutLabel}}</span>
                <input class="workflow-settings-timeout" type="number" min="0" step="100"
                    [value]="timeout" @input="timeoutInput" />
            </label>
            <div class="workflow-publish-error" v-if="error">{{error}}</div>
            <div class="workflow-publish-actions">
                <ui-button className="workflow-btn" :label="cancelLabel" :action="cancelPressed"></ui-button>
                <ui-button className="workflow-btn workflow-btn-primary workflow-settings-save"
                    tone="accent" :label="saveLabel" :action="savePressed"></ui-button>
            </div>
        </div>
    </div>`
})
export class WorkflowSettingsPanelComponent {
    @Attribute() description = '';
    @Attribute() timeout = '0';
    @Attribute() error = '';
    @Attribute() locale = 'zh-CN';
    @Attribute() descriptionAction?: (value: string) => void;
    @Attribute() timeoutAction?: (value: string) => void;
    @Attribute() saveAction?: () => void;
    @Attribute() cancelAction?: () => void;

    constructor(@Optional() private translator?: Translator) { }

    readonly savePressed = (): void => { this.saveAction?.(); };

    readonly cancelPressed = (): void => { this.cancelAction?.(); };

    descriptionInput(event: any): void {
        this.descriptionAction?.(String(event?.target?.value ?? ''));
    }

    timeoutInput(event: any): void {
        this.timeoutAction?.(String(event?.target?.value ?? '0'));
    }

    close(): void {
        this.cancelAction?.();
    }

    get title(): string { return this.t('settings', 'Workflow settings'); }
    get descriptionLabel(): string { return this.t('description', 'Description'); }
    get timeoutLabel(): string { return this.t('runTimeout', 'Run timeout'); }
    get cancelLabel(): string { return this.t('cancel', 'Cancel'); }
    get saveLabel(): string { return this.t('save', 'Save'); }
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
