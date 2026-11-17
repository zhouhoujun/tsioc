/**
 * Class-name map for the renderer-neutral dynamic form.
 *
 * Building these strings once per `classPrefix` avoids allocating them on every
 * template binding pass (the template used to call ~30 `xxxClass()` methods for
 * every field row).
 */
export interface DynamicFormClasses {
    form: string;
    schemaError: string;
    typedRow: string;
    typedType: string;
    group: string;
    groupFields: string;
    groupTitle: string;
    noFields: string;
    labelRow: string;
    label: string;
    required: string;
    reset: string;
    inputUnit: string;
    checkboxRow: string;
    options: string;
    error: string;
    hint: string;
    actions: string;
    btn: string;
    btnPrimary: string;
    jsonMode: string;
    keyValue: string;
    keyValueRow: string;
    keyValueKey: string;
    keyValueValue: string;
    list: string;
    listRow: string;
    listFields: string;
    listField: string;
    listAdd: string;
    listRemove: string;
}

export function createDynamicFormClasses(classPrefix: string | undefined): DynamicFormClasses {
    const prefix = String(classPrefix || 'df');
    const p = (suffix: string): string => `${prefix}-${suffix}`;
    return {
        form: `${p('form')} dynamic-form`,
        schemaError: p('schema-error'),
        typedRow: p('field-value-type-row'),
        typedType: p('field-value-type'),
        group: p('field-group'),
        groupFields: p('fields'),
        groupTitle: p('field-group-title'),
        noFields: p('no-fields'),
        labelRow: p('field-label-row'),
        label: p('field-label'),
        required: p('field-required'),
        reset: p('field-reset'),
        inputUnit: p('input-unit'),
        checkboxRow: p('checkbox-row'),
        options: p('options'),
        error: p('field-error'),
        hint: p('field-hint'),
        actions: p('actions'),
        btn: p('btn'),
        btnPrimary: p('btn-primary'),
        jsonMode: p('field-mode'),
        keyValue: p('keyvalue'),
        keyValueRow: p('keyvalue-row'),
        keyValueKey: `${p('input')} ${p('keyvalue-key')}`,
        keyValueValue: `${p('input')} ${p('keyvalue-value')}`,
        list: p('list'),
        listRow: p('list-row'),
        listFields: p('list-fields'),
        listField: p('list-field'),
        listAdd: p('list-add'),
        listRemove: p('list-remove')
    };
}
