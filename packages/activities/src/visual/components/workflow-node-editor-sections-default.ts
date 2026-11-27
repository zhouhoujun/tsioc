import { Attribute, Component } from '@tsdi/components';
import { Optional } from '@tsdi/ioc';
import { Translator } from '@tsdi/i18n';
import { translateWorkflow } from '../i18n';
import type { IVisualWorkflowNode } from '../types';
import { WorkflowNodeEditorContribution } from '../workflow-node-editors';

function displayValue(value: any): string {
    if (value === undefined || value === null || value === '') {
        return '—';
    }
    if (typeof value === 'object') {
        if (typeof value.path === 'string' && value.path) {
            return String(value.path);
        }
        if (typeof value.value === 'string') {
            return value.value;
        }
        try {
            return JSON.stringify(value);
        } catch {
            return '—';
        }
    }
    return String(value);
}

function objectSize(value: any): number {
    if (!value) {
        return 0;
    }
    if (typeof value === 'string') {
        try {
            const parsed = JSON.parse(value);
            return parsed && typeof parsed === 'object' ? Object.keys(parsed).length : 0;
        } catch {
            return 0;
        }
    }
    return typeof value === 'object' ? Object.keys(value).length : 0;
}

interface NodePreviewSection {
    values: Record<string, any>;
    locale: string;
    translator?: Translator;
}

function sectionLabel(section: NodePreviewSection, key: string, fallback: string): string {
    return translateWorkflow(section.translator, section.locale, `workflow.ui.${key}`, fallback);
}

/** Run/request summary contributed to HTTP request nodes. */
@Component({
    selector: 'workflow-http-request-section',
    template: `
    <div class="workflow-node-preview">
        <div class="workflow-node-preview-row">
            <span class="workflow-node-preview-label">{{methodLabel}}</span>
            <code class="workflow-node-preview-value" data-preview="method">{{method}}</code>
        </div>
        <div class="workflow-node-preview-row">
            <span class="workflow-node-preview-label">{{urlLabel}}</span>
            <code class="workflow-node-preview-value" data-preview="url">{{url}}</code>
        </div>
        <div class="workflow-node-preview-row">
            <span class="workflow-node-preview-label">{{headersLabel}}</span>
            <code class="workflow-node-preview-value" data-preview="headers">{{headerCount}}</code>
        </div>
        <div class="workflow-node-preview-row">
            <span class="workflow-node-preview-label">{{bodyLabel}}</span>
            <code class="workflow-node-preview-value" data-preview="body">{{body}}</code>
        </div>
        <div class="workflow-node-preview-warning" role="status" v-if="missingUrl">{{missingUrlLabel}}</div>
    </div>`
})
export class WorkflowHttpRequestSectionComponent implements NodePreviewSection {
    @Attribute() node?: IVisualWorkflowNode;
    @Attribute() values: Record<string, any> = {};
    @Attribute() locale = 'zh-CN';

    constructor(@Optional() public translator?: Translator) { }

    protected t(key: string, fallback: string): string {
        return sectionLabel(this, key, fallback);
    }

    protected value(key: string): any {
        return this.values?.[key];
    }

    get method(): string {
        return this.value('method') ? String(this.value('method')).toUpperCase() : 'GET';
    }

    get url(): string {
        return displayValue(this.value('url')) || this.t('previewNoUrl', '—');
    }

    get headerCount(): string {
        return String(objectSize(this.value('headers')));
    }

    get body(): string {
        const body = this.value('body');
        if (body === undefined || body === null || body === '') {
            return '—';
        }
        if (typeof body === 'string') {
            return `${body.length} chars`;
        }
        return typeof body === 'object' ? `${objectSize(body)} fields` : displayValue(body);
    }

    get missingUrl(): boolean {
        return !this.value('url');
    }

    get methodLabel(): string { return this.t('previewMethod', 'Method'); }
    get urlLabel(): string { return this.t('previewUrl', 'URL'); }
    get headersLabel(): string { return this.t('previewHeaders', 'Headers'); }
    get bodyLabel(): string { return this.t('previewBody', 'Body'); }
    get missingUrlLabel(): string {
        return this.t('previewMissingUrl', 'Set a URL or endpoint to preview the request.');
    }
}

/** Iteration summary contributed to loop nodes. */
@Component({
    selector: 'workflow-loop-section',
    template: `
    <div class="workflow-node-preview">
        <div class="workflow-node-preview-row">
            <span class="workflow-node-preview-label">{{iterationsLabel}}</span>
            <code class="workflow-node-preview-value" data-preview="iterations">{{iterations}}</code>
        </div>
        <div class="workflow-node-preview-row">
            <span class="workflow-node-preview-label">{{workflowLabel}}</span>
            <code class="workflow-node-preview-value" data-preview="workflow">{{workflow}}</code>
        </div>
    </div>`
})
export class WorkflowLoopSectionComponent implements NodePreviewSection {
    @Attribute() node?: IVisualWorkflowNode;
    @Attribute() values: Record<string, any> = {};
    @Attribute() locale = 'zh-CN';

    constructor(@Optional() public translator?: Translator) { }

    protected t(key: string, fallback: string): string {
        return sectionLabel(this, key, fallback);
    }

    protected value(key: string): any {
        return this.values?.[key];
    }

    get iterations(): string { return String(this.value('iterations') || 1); }
    get workflow(): string { return displayValue(this.value('workflow')); }
    get iterationsLabel(): string { return this.t('previewIterations', 'Iterations'); }
    get workflowLabel(): string { return this.t('previewWorkflow', 'Workflow'); }
}

/** Child workflow/port summary contributed to sub-workflow nodes. */
@Component({
    selector: 'workflow-subprocess-section',
    template: `
    <div class="workflow-node-preview">
        <div class="workflow-node-preview-row">
            <span class="workflow-node-preview-label">{{workflowLabel}}</span>
            <code class="workflow-node-preview-value" data-preview="workflow">{{workflow}}</code>
        </div>
        <div class="workflow-node-preview-row">
            <span class="workflow-node-preview-label">{{inputsLabel}}</span>
            <code class="workflow-node-preview-value" data-preview="inputs">{{inputs}}</code>
        </div>
        <div class="workflow-node-preview-row">
            <span class="workflow-node-preview-label">{{outputsLabel}}</span>
            <code class="workflow-node-preview-value" data-preview="outputs">{{outputs}}</code>
        </div>
        <div class="workflow-node-preview-warning" role="status" v-if="missingWorkflow">{{missingWorkflowLabel}}</div>
    </div>`
})
export class WorkflowSubprocessSectionComponent implements NodePreviewSection {
    @Attribute() node?: IVisualWorkflowNode;
    @Attribute() values: Record<string, any> = {};
    @Attribute() locale = 'zh-CN';

    constructor(@Optional() public translator?: Translator) { }

    protected t(key: string, fallback: string): string {
        return sectionLabel(this, key, fallback);
    }

    protected value(key: string): any {
        return this.values?.[key];
    }

    get workflow(): string { return displayValue(this.value('workflow')); }
    get inputs(): string { return String(objectSize(this.value('inputs'))); }
    get outputs(): string { return String(objectSize(this.value('outputs'))); }
    get missingWorkflow(): boolean { return !this.value('workflow'); }
    get workflowLabel(): string { return this.t('previewWorkflow', 'Workflow'); }
    get inputsLabel(): string { return this.t('previewInputs', 'Input ports'); }
    get outputsLabel(): string { return this.t('previewOutputs', 'Output ports'); }
    get missingWorkflowLabel(): string {
        return this.t('previewMissingWorkflow', 'Choose a child workflow before running this node.');
    }
}

/** Built-in node editor sections; hosts may extend/replace this list. */
export const DEFAULT_WORKFLOW_NODE_EDITORS: WorkflowNodeEditorContribution[] = [
    {
        type: ['http', 'http-request'],
        sections: [{
            id: 'request-preview',
            labelKey: 'workflow.ui.nodeEditorHttpPreview',
            label: 'Request preview',
            component: WorkflowHttpRequestSectionComponent,
            order: 10
        }]
    },
    {
        type: ['loop'],
        sections: [{
            id: 'iteration-preview',
            labelKey: 'workflow.ui.nodeEditorLoopPreview',
            label: 'Iteration',
            component: WorkflowLoopSectionComponent,
            order: 10
        }]
    },
    {
        type: ['subprocess'],
        sections: [{
            id: 'child-workflow',
            labelKey: 'workflow.ui.nodeEditorSubprocessPreview',
            label: 'Child workflow',
            component: WorkflowSubprocessSectionComponent,
            order: 10
        }]
    }
];
