import { Attribute, Component } from '@tsdi/components';
import { Optional } from '@tsdi/ioc';
import { Translator } from '@tsdi/i18n';
import { translateWorkflow } from '../i18n';

/**
 * Encrypted credential storage overlay. Purely presentational: the host owns
 * the name/value drafts and the store calls, so the list and errors update on
 * the host's reactive instance. Values are write-only.
 */
@Component({
    selector: 'workflow-credential-panel',
    template: `
    <div class="workflow-publish workflow-credentials">
        <div class="workflow-publish-panel workflow-credentials-panel">
            <div class="workflow-publish-head">
                <span class="workflow-publish-title">{{title}}</span>
                <button class="workflow-btn workflow-publish-close" type="button"
                    [aria-label]="closeLabel" [title]="closeLabel" @click="close">✕</button>
            </div>
            <div class="workflow-publish-error" v-if="error">{{error}}</div>
            <div class="workflow-credentials-list" v-if="names.length">
                <div class="workflow-credential-row" v-for="name in names" data-credential-name="{{name}}">
                    <span class="workflow-credential-name">{{name}}</span>
                    <button class="workflow-btn workflow-credential-remove" type="button"
                        [disabled]="busy" @click="remove(name)">{{removeLabel}}</button>
                </div>
            </div>
            <ui-empty class="workflow-credential-empty" v-else icon="key" :title="emptyLabel"></ui-empty>
            <label class="workflow-group-field">
                <span>{{nameLabel}}</span>
                <input class="workflow-credential-name-input" type="text" [value]="draftName"
                    placeholder="api-token" @input="nameInput" />
            </label>
            <label class="workflow-group-field">
                <span>{{valueLabel}}</span>
                <input class="workflow-credential-value-input" type="password" [value]="draftValue"
                    @input="valueInput" />
            </label>
            <div class="workflow-publish-actions">
                <button class="workflow-btn" type="button" [disabled]="busy" @click="refresh">{{refreshLabel}}</button>
                <button class="workflow-btn" type="button" @click="close">{{closeLabel}}</button>
                <button class="workflow-btn workflow-btn-primary workflow-credential-save" type="button"
                    [disabled]="busy" @click="save">{{saveLabel}}</button>
            </div>
        </div>
    </div>`
})
export class WorkflowCredentialPanelComponent {
    @Attribute() names: string[] = [];
    @Attribute() busy = false;
    @Attribute() error = '';
    @Attribute() draftName = '';
    @Attribute() draftValue = '';
    @Attribute() locale = 'zh-CN';
    @Attribute() nameAction?: (value: string) => void;
    @Attribute() valueAction?: (value: string) => void;
    @Attribute() saveAction?: () => void;
    @Attribute() removeAction?: (name: string) => void;
    @Attribute() refreshAction?: () => void;
    @Attribute() closeAction?: () => void;

    constructor(@Optional() private translator?: Translator) { }

    nameInput(event: any): void {
        this.nameAction?.(String(event?.target?.value ?? ''));
    }

    valueInput(event: any): void {
        this.valueAction?.(String(event?.target?.value ?? ''));
    }

    save(): void {
        this.saveAction?.();
    }

    remove(name: string): void {
        this.removeAction?.(name);
    }

    refresh(): void {
        this.refreshAction?.();
    }

    close(): void {
        this.closeAction?.();
    }

    get title(): string { return this.t('credentials', 'Credentials'); }
    get emptyLabel(): string { return this.t('credentialsEmpty', 'No credentials stored yet.'); }
    get nameLabel(): string { return this.t('credentialName', 'Name'); }
    get valueLabel(): string { return this.t('credentialValue', 'Secret value'); }
    get removeLabel(): string { return this.t('remove', 'Delete'); }
    get refreshLabel(): string { return this.t('refresh', 'Refresh'); }
    get closeLabel(): string { return this.t('close', 'Close'); }
    get saveLabel(): string { return this.t('save', 'Save'); }

    private t(key: string, fallback: string): string {
        return translateWorkflow(
            this.translator,
            String(this.locale || '').toLowerCase().startsWith('en') ? 'en' : 'zh-CN',
            `workflow.ui.${key}`,
            fallback
        );
    }
}
