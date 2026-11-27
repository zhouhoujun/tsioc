import { token } from '@tsdi/ioc';
import type { DynamicFormField, DynamicFormSchema, DynamicFormWidget } from './dynamic-form.types';

/** Host-wide widget registry; schema.widgets still wins for per-form overrides. */
export const DYNAMIC_FORM_WIDGETS = token<DynamicFormWidget[]>('DYNAMIC_FORM_WIDGETS');

/** Registered widget for a field (`field.type === 'widget'`). */
export function fieldWidget(
    schema: DynamicFormSchema | undefined,
    field: DynamicFormField,
    extra: DynamicFormWidget[] = []
): DynamicFormWidget | undefined {
    const type = String(field?.widget || '').trim();
    if (!type) {
        return undefined;
    }
    return [...(schema?.widgets || []), ...(extra || [])].find(widget => widget?.type === type);
}

export function fieldWidgetComponent(
    schema: DynamicFormSchema | undefined,
    field: DynamicFormField,
    extra: DynamicFormWidget[] = []
): any {
    return fieldWidget(schema, field, extra)?.component;
}

/** Registered widget used for a whole list row (`field.rowEditor`). */
export function rowEditorComponent(
    schema: DynamicFormSchema | undefined,
    field: DynamicFormField,
    extra: DynamicFormWidget[] = []
): any {
    const type = String(field?.rowEditor || '').trim();
    if (!type) {
        return undefined;
    }
    return [...(schema?.widgets || []), ...(extra || [])].find(widget => widget?.type === type)?.component;
}
