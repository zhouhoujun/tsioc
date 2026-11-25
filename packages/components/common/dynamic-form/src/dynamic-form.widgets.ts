import type { DynamicFormField, DynamicFormSchema, DynamicFormWidget } from './dynamic-form.types';

/** Registered widget for a field (`field.type === 'widget'`). */
export function fieldWidget(schema: DynamicFormSchema | undefined, field: DynamicFormField): DynamicFormWidget | undefined {
    const type = String(field?.widget || '').trim();
    if (!type) {
        return undefined;
    }
    return (schema?.widgets || []).find(widget => widget?.type === type);
}

export function fieldWidgetComponent(schema: DynamicFormSchema | undefined, field: DynamicFormField): any {
    return fieldWidget(schema, field)?.component;
}
