import { Attribute, Component } from '@tsdi/components';
import { Optional } from '@tsdi/ioc';
import { Translator } from '@tsdi/i18n';
import { translateWorkflow } from '../i18n';

/** Rename workflow dialog. Presentational: the host owns the draft and validation. */
@Component({
    selector: 'workflow-rename-panel',
    template: `
    <div class="workflow-rename">
        <div class="workflow-rename-panel">
            <div class="workflow-rename-head">
                <span class="workflow-rename-title">{{title}}</span>
                <button class="workflow-btn workflow-rename-close" type="button"
                    [aria-label]="cancelLabel" [title]="cancelLabel" @click="cancelPressed">
                    <icon name="close" size="sm"></icon>
                </button>
            </div>
            <input class="workflow-rename-input" type="text" [value]="value"
                placeholder="{{placeholder}}" aria-label="{{title}}"
                @input="valueInput" @keydown="valueKey" />
            <div class="workflow-rename-error" v-if="error">{{error}}</div>
            <div class="workflow-rename-actions">
                <ui-button className="workflow-btn" :label="cancelLabel" :action="cancelPressed"></ui-button>
                <ui-button className="workflow-btn workflow-btn-primary"
                    tone="accent" :label="confirmLabel" :action="confirmPressed"></ui-button>
            </div>
        </div>
    </div>`
})
export class WorkflowRenamePanelComponent {
    @Attribute() value = '';
    @Attribute() error = '';
    @Attribute() locale = 'zh-CN';
    @Attribute() valueAction?: (value: string) => void;
    @Attribute() keyAction?: (event: any) => void;
    @Attribute() confirmAction?: () => void;
    @Attribute() cancelAction?: () => void;

    constructor(@Optional() private translator?: Translator) { }

    readonly confirmPressed = (): void => { this.confirmAction?.(); };

    readonly cancelPressed = (): void => { this.cancelAction?.(); };

    valueInput(event: any): void {
        this.valueAction?.(String(event?.target?.value ?? ''));
    }

    valueKey(event: any): void {
        this.keyAction?.(event);
    }

    get title(): string { return this.t('renameTitle', 'Rename workflow'); }
    get placeholder(): string { return this.t('renamePlaceholder', 'Workflow name'); }
    get confirmLabel(): string { return this.t('renameConfirm', 'Rename'); }
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
