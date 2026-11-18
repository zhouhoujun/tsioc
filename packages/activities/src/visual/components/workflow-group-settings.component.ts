import { Attribute, Component } from '@tsdi/components';
import { Optional } from '@tsdi/ioc';
import { Translator } from '@tsdi/i18n';
import { WorkflowDesigner } from '../workflow-designer';
import { translateWorkflow } from '../i18n';

/**
 * Group name/colour dialog. Extracted from the designer preview so the preview
 * stays a composition root; the dialog owns its transient state.
 */
@Component({
    selector: 'workflow-group-settings',
    template: `
    <div class="workflow-group-settings-host" v-show="visible">
    <div class="workflow-publish workflow-group-settings" v-if="visible">
        <div class="workflow-publish-panel workflow-group-settings-panel">
            <div class="workflow-publish-head">
                <span class="workflow-publish-title">{{title}}</span>
                <button class="workflow-btn workflow-publish-close" type="button"
                    [aria-label]="closeLabel" [title]="closeLabel" @click="close">✕</button>
            </div>
            <label class="workflow-group-field">
                <span>{{nameLabel}}</span>
                <input class="workflow-group-name-input" type="text"
                    [value]="name" @input="nameInput" @keydown="dialogKey" />
            </label>
            <label class="workflow-group-field">
                <span>{{colorLabel}}</span>
                <input class="workflow-group-color-input" type="color"
                    [value]="color" @input="colorInput" />
            </label>
            <div class="workflow-publish-error" v-if="error">{{error}}</div>
            <div class="workflow-publish-actions">
                <button class="workflow-btn" type="button" @click="close">{{cancelLabel}}</button>
                <button class="workflow-btn workflow-btn-primary workflow-group-save" type="button"
                    @click="save">{{saveLabel}}</button>
            </div>
        </div>
    </div>
    </div>
    `
})
export class WorkflowGroupSettingsComponent {
    @Attribute() designer!: WorkflowDesigner;
    @Attribute() locale = 'zh-CN';
    @Attribute() notifyAction?: () => void;

    visible = false;
    groupId = '';
    name = '';
    color = '#60a5fa';
    error = '';

    constructor(@Optional() private translator?: Translator) { }

    protected t(key: string, fallback: string): string {
        return translateWorkflow(this.translator, this.locale as any, `workflow.ui.${key}`, fallback);
    }

    get title(): string { return this.t('groupSettings', 'Group settings'); }
    get nameLabel(): string { return this.t('groupName', 'Group name'); }
    get colorLabel(): string { return this.t('groupColor', 'Color'); }
    get closeLabel(): string { return this.t('close', 'Close'); }
    get cancelLabel(): string { return this.t('cancel', 'Cancel'); }
    get saveLabel(): string { return this.t('save', 'Save'); }

    open(groupId: string): void {
        const group = (this.designer?.definition.groups || []).find(item => item.id === groupId);
        if (!group) {
            return;
        }
        this.groupId = group.id;
        this.name = group.name;
        this.color = group.color || '#60a5fa';
        this.error = '';
        this.visible = true;
    }

    close(): void {
        this.visible = false;
        this.error = '';
        this.notifyAction?.();
    }

    nameInput(event: any): void {
        this.name = String(event?.target?.value ?? '');
        this.error = '';
    }

    colorInput(event: any): void {
        this.color = String(event?.target?.value ?? '#60a5fa');
    }

    dialogKey(event: any): void {
        const key = String(event?.key || '');
        if (key === 'Enter') {
            event?.preventDefault?.();
            this.save();
        } else if (key === 'Escape') {
            event?.preventDefault?.();
            this.close();
        }
    }

    save(): void {
        if (!this.designer || !this.groupId) {
            return;
        }
        const saved = this.designer.updateGroup(this.groupId, {
            name: this.name,
            color: this.color
        });
        if (!saved) {
            this.error = this.t('groupNameRequired', 'Enter a group name');
            return;
        }
        this.visible = false;
        this.error = '';
        this.notifyAction?.();
    }
}
