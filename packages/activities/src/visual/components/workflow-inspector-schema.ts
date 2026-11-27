import {
    createTypedPathCompletion,
    DynamicFormField,
    DynamicFormSchema,
    DynamicFormTypedSource,
    typedPathsFromSuggestions
} from '@tsdi/components/common/dynamic-form';
import { WORKFLOW_TYPED_CODEC } from '../workflow-typed-value';
import { workflowTypedPaths } from '../workflow-typed-paths';
import { WorkflowInspectorFieldView, WorkflowInspectorModel } from '../types';
import { WorkflowReferenceWidgetComponent } from './workflow-reference-widget';
import { WorkflowReferenceMultiWidgetComponent } from './workflow-reference-multi-widget';
import { WorkflowTypedValueWidgetComponent } from './workflow-typed-value-widget';

/** State the inspector exposes while deriving its dynamic-form schema. */
export interface WorkflowInspectorSchemaHost {
    model: WorkflowInspectorModel;
    codeSuggestions: string[];
    typedContext: any;
    t(key: string, fallback: string): string;
}

/** Typed sources offered by value fields (literal classes + runtime scopes). */
export function inspectorTypedSources(host: WorkflowInspectorSchemaHost): DynamicFormTypedSource[] {
    const sources: DynamicFormTypedSource[] = [
        { value: 'literal', label: host.t('typedLiteral', 'Literal') },
        { value: 'num', label: host.t('typedNumber', 'Number'), input: 'number' },
        { value: 'bool', label: host.t('typedBoolean', 'Boolean') },
        { value: 'json', label: host.t('typedJson', 'JSON') },
        { value: 're', label: host.t('typedRegex', 'Regex') },
        { value: 'expression', label: host.t('typedExpression', 'Expression') },
        { value: 'msg', label: 'msg' },
        { value: 'flow', label: 'flow' },
        { value: 'global', label: 'global' },
        { value: 'env', label: 'env' },
        { value: 'node', label: 'node' }
    ];
    const completionScopes = new Set(['msg', 'flow', 'global', 'env', 'node']);
    return sources.map(source => {
        if (!completionScopes.has(source.value)) {
            return source;
        }
        return {
            ...source,
            completion: source.value as DynamicFormTypedSource['completion'],
            // Resolve per request so a newly completed run enriches completion
            // without rebuilding the form schema.
            completionSource: (query: string) =>
                createTypedPathCompletion(typedSourcePaths(host, source.value))(query)
        };
    });
}

/** Run-context paths plus host code suggestions for one typed scope. */
export function typedSourcePaths(host: WorkflowInspectorSchemaHost, source: string): string[] {
    const paths = new Set<string>(workflowTypedPaths(host.typedContext)?.[source] || []);
    typedPathsFromSuggestions(host.codeSuggestions, source).forEach(path => paths.add(path));
    return Array.from(paths);
}

/** Build the inspector's dynamic-form schema from the selected node model. */
export function buildWorkflowInspectorSchema(host: WorkflowInspectorSchemaHost): DynamicFormSchema {
    const fields: DynamicFormField[] = [];
    if (!host.model.hasSelection) {
        return { fields };
    }
    const defaultGroupLabel = host.t('properties', 'Properties');
    fields.push({
        key: 'name',
        type: 'text',
        label: host.t('name', 'Name'),
        placeholder: host.t('namePlaceholder', 'Node name'),
        required: true,
        inputClass: 'workflow-inspector-name'
    });
    fields.push({
        key: 'description',
        type: 'text',
        label: host.t('description', 'Description'),
        placeholder: host.t('descriptionPlaceholder', 'Optional note for this node'),
        inputClass: 'workflow-inspector-description'
    });
    fields.push({
        key: 'enabled',
        type: 'checkbox',
        label: host.t('enabled', 'Enabled'),
        defaultValue: true
    });
    fields.push({
        key: 'icon',
        type: 'text',
        label: host.t('icon', 'Icon'),
        group: host.t('appearance', 'Appearance'),
        maxLength: 4,
        defaultValue: '◆',
        placeholder: '◆',
        inputClass: 'workflow-inspector-icon'
    });
    fields.push({
        key: 'color',
        type: 'color',
        label: host.t('color', 'Color'),
        group: host.t('appearance', 'Appearance'),
        defaultValue: '#64748b',
        inputClass: 'workflow-inspector-color'
    });
    const typedSources = inspectorTypedSources(host);
    host.model.fields.forEach(field => {
        fields.push(toDynamicField(host, field, typedSources));
    });
    return {
        fields,
        widgets: [
            { type: 'workflow-reference', component: WorkflowReferenceWidgetComponent },
            { type: 'workflow-reference-multi', component: WorkflowReferenceMultiWidgetComponent },
            { type: 'workflow-typed-value', component: WorkflowTypedValueWidgetComponent }
        ],
        defaultGroupLabel,
        jsonFieldsLabel: host.t('fields', 'Fields'),
        jsonTextLabel: host.t('json', 'JSON'),
        // `msg`/`flow`/`global`/`env` are runtime identifiers; only the
        // literal source needs translating.
        typedSources: [
            { value: 'literal', label: host.t('typedLiteral', 'Literal') },
            { value: 'msg', label: 'msg' },
            { value: 'flow', label: 'flow' },
            { value: 'global', label: 'global' },
            { value: 'env', label: 'env' }
        ]
    };
}

function toDynamicField(
    host: WorkflowInspectorSchemaHost,
    field: WorkflowInspectorFieldView,
    typedSources: DynamicFormTypedSource[]
): DynamicFormField {
    const typed = field.typed === true;
    const typedValueWidget = typed && field.typedValue === true;
    const multiReference = !typedValueWidget && field.reference?.multiple === true;
    const searchableReference = !typedValueWidget && !multiReference && !!field.reference;
    return {
        key: field.key,
        type: typedValueWidget || multiReference || searchableReference ? 'widget' : dynamicType(field),
        widget: typedValueWidget ? 'workflow-typed-value'
            : multiReference ? 'workflow-reference-multi'
                : searchableReference ? 'workflow-reference' : undefined,
        typed,
        // Value fields store references and literal classes explicitly so
        // text that looks like a reference is never misread; path fields keep
        // the `msg.`-prefixed string form.
        typedCodec: typed && field.typedValue === true ? WORKFLOW_TYPED_CODEC : undefined,
        typedSources: typed && field.typedValue === true ? typedSources : undefined,
        label: field.label,
        placeholder: field.placeholder,
        description: field.description,
        group: field.group,
        options: field.options.map(option => ({ label: option.label, value: option.value })),
        multiple: field.reference?.multiple === true,
        defaultValue: field.hasDefault ? field.resetValue : undefined,
        rows: field.rows,
        min: field.min,
        max: field.max,
        step: field.step,
        unit: field.unit,
        span: field.span,
        minLength: field.minLength,
        maxLength: field.maxLength,
        required: field.required,
        readonly: field.readonly,
        disabled: field.disabled,
        pattern: field.pattern,
        rules: field.rules,
        errorMessages: field.errorMessages,
        itemFields: field.itemFields?.map(child => toDynamicField(host, child, typedSources)),
        addLabel: field.addLabel,
        removeLabel: field.removeLabel,
        minItems: field.minItems,
        maxItems: field.maxItems,
        visibleWhen: field.visibleWhen,
        inputClass: field.inputClass,
        fieldClass: field.fieldClass,
        language: field.language,
        suggestions: host.codeSuggestions,
        actions: field.typedValue === true
            // Value fields can be authored as a JSONata expression in the
            // expanded editor even when the stored source is a literal.
            ? [{ id: 'expression', label: 'ƒ', title: host.t('editExpression', 'Edit as expression') }]
            : field.actions,
        rowEditor: field.rowEditor,
        rowActions: field.rowActions,
        hidden: field.visible === false
    };
}

function dynamicType(field: WorkflowInspectorFieldView): DynamicFormField['type'] {
    // Most node field types are already shared dynamic-form types; only the
    // boolean alias needs mapping. Choice fields render as a native `<select>`.
    if (field.type === 'boolean') {
        return 'checkbox';
    }
    return field.type as DynamicFormField['type'];
}
