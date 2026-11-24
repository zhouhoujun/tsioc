import { Attribute, Component, NoReactive } from '@tsdi/components';
import { Optional } from '@tsdi/ioc';
import { Translator } from '@tsdi/i18n';
import { translateWorkflow } from '../i18n';
import type { WorkflowDesigner } from '../workflow-designer';
import { decodeWorkflowTypedValue } from '../workflow-typed-value';
import { patchConfigPath, readConfigPath } from '../workflow-config-path';
import { preloadWorkflowExpressions, validateWorkflowExpression } from '../workflow-expression';
import { WORKFLOW_EXPRESSION_SUGGESTIONS, workflowExpressionScopeSuggestions } from '../workflow-expression-suggestions';

/**
 * Expression editing overlay for typed values.
 *
 * Owns its open/validate/apply cycle so the designer shell only forwards the
 * field action. The textarea opts into the progressive-enhancement CodeMirror
 * directive (`data-dynamic-code`), so highlighting keeps living in the lazy
 * editor chunks; without the editor module the plain textarea still works.
 */
@Component({
    selector: 'workflow-expression-panel',
    template: `
    <div class="workflow-expression-host">
    <div class="workflow-publish workflow-expression" v-if="visible">
        <div class="workflow-publish-panel workflow-expression-panel">
            <div class="workflow-publish-head">
                <span class="workflow-publish-title">{{title}}</span>
                <button class="workflow-btn workflow-expression-close" type="button"
                    [aria-label]="cancelLabel" [title]="cancelLabel" @click="cancel">✕</button>
            </div>
            <div class="workflow-publish-hint">{{hint}}</div>
            <textarea class="workflow-expression-text" rows="9" data-dynamic-code="javascript"
                data-code-value="{{encodedValue}}" data-code-suggestions="{{suggestionData}}"
                [value]="value" placeholder="payload.total * 2" @input="input"></textarea>
            <div class="workflow-expression-error" v-if="error">{{error}}</div>
            <div class="workflow-expression-ok" v-if="valid && !error">{{validLabel}}</div>
            <div class="workflow-publish-actions">
                <ui-button className="workflow-btn workflow-expression-validate"
                    :label="validateLabel" :action="validatePressed"></ui-button>
                <ui-button className="workflow-btn" :label="cancelLabel" :action="cancelPressed"></ui-button>
                <ui-button className="workflow-btn workflow-btn-primary workflow-expression-apply"
                    tone="accent" :label="applyLabel" :action="applyPressed"></ui-button>
            </div>
        </div>
    </div>
    </div>`
})
export class WorkflowExpressionPanelComponent {
    @Attribute() designer?: WorkflowDesigner;
    @Attribute() locale = 'zh-CN';
    /** Notify the host that the document changed (dirty state/autosave). */
    @Attribute() notifyAction?: () => void;
    /** Completion names for the lazy CodeMirror editor. */
    @Attribute() suggestions: string[] = WORKFLOW_EXPRESSION_SUGGESTIONS;

    visible = false;
    value = '';
    error = '';
    valid = false;
    protected target?: { nodeId: string; path: string };
    protected selfRef?: WorkflowExpressionPanelComponent;
    @NoReactive() private suggestionCache?: { execution: any; base: string; values: string };

    constructor(@Optional() private translator?: Translator) { }

    onInit(): void {
        this.selfRef = this;
    }

    /** Open the JSONata editor seeded with the field's current text. */
    open(path: string, nodeId?: string): void {
        const self = (this.selfRef || this) as WorkflowExpressionPanelComponent;
        const designer = self.designer;
        const node = nodeId
            ? designer?.nodes.find(item => item.id === nodeId)
            : designer?.selectedNode;
        if (!node) {
            return;
        }
        self.target = { nodeId: node.id, path };
        self.value = decodeWorkflowTypedValue(readConfigPath(node.config, path)).text;
        self.error = '';
        self.valid = false;
        self.visible = true;
    }

    closeEditor(): void {
        const self = (this.selfRef || this) as WorkflowExpressionPanelComponent;
        self.visible = false;
        self.error = '';
        self.valid = false;
        self.target = undefined;
    }

    async validateExpression(): Promise<void> {
        const self = (this.selfRef || this) as WorkflowExpressionPanelComponent;
        // Loads the lazy evaluator once; validation is silent when the optional
        // package is not installed.
        await preloadWorkflowExpressions();
        const error = validateWorkflowExpression(self.value);
        self.error = error || '';
        self.valid = !error;
    }

    applyExpression(): void {
        const self = (this.selfRef || this) as WorkflowExpressionPanelComponent;
        const target = self.target;
        const designer = self.designer;
        if (!target || !designer) {
            return;
        }
        const node = designer.nodes.find(item => item.id === target.nodeId);
        designer.updateNodeConfig(
            target.nodeId,
            patchConfigPath(node?.config, target.path, { type: 'expression', value: self.value })
        );
        self.closeEditor();
        self.notifyAction?.();
    }

    /** `data-code-value` is URL encoded because the editor directive decodes it. */
    get encodedValue(): string {
        return encodeURIComponent(String(this.value ?? ''));
    }

    get suggestionData(): string {
        const execution = this.designer?.execution;
        const base = (this.suggestions || []).join('\u0000');
        const cache = this.suggestionCache;
        if (cache && cache.execution === execution && cache.base === base) {
            return cache.values;
        }
        const values = new Set(this.suggestions || []);
        workflowExpressionScopeSuggestions(this.designer).forEach(value => values.add(value));
        const encoded = encodeURIComponent(JSON.stringify(Array.from(values)));
        this.suggestionCache = { execution, base, values: encoded };
        return encoded;
    }

    readonly input = (event: any): void => {
        const self = (this.selfRef || this) as WorkflowExpressionPanelComponent;
        self.value = String(event?.target?.value ?? '');
        self.error = '';
        self.valid = false;
    };

    readonly validatePressed = (): void => {
        void ((this.selfRef || this) as WorkflowExpressionPanelComponent).validateExpression();
    };

    readonly applyPressed = (): void => {
        ((this.selfRef || this) as WorkflowExpressionPanelComponent).applyExpression();
    };

    readonly cancelPressed = (): void => {
        ((this.selfRef || this) as WorkflowExpressionPanelComponent).closeEditor();
    };

    cancel(): void {
        this.cancelPressed();
    }

    get title(): string { return this.t('expressionTitle', 'Expression'); }
    get hint(): string {
        return this.t(
            'expressionHint',
            'JSONata expression over payload/msg, flow, global and env. Validate checks the syntax before you apply it.'
        );
    }
    get validateLabel(): string { return this.t('expressionValidate', 'Validate'); }
    get applyLabel(): string { return this.t('apply', 'Apply'); }
    get cancelLabel(): string { return this.t('cancel', 'Cancel'); }
    get validLabel(): string { return this.t('expressionValid', 'Expression is valid.'); }

    private t(key: string, fallback: string): string {
        return translateWorkflow(
            this.translator,
            String(this.locale || '').toLowerCase().startsWith('en') ? 'en' : 'zh-CN',
            `workflow.ui.${key}`,
            fallback
        );
    }
}
