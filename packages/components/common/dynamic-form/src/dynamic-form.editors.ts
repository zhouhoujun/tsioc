import { DynamicFormField } from './dynamic-form.types';

/**
 * State/editing host implemented by {@link DynamicFormComponent}. Functions take
 * the reactive component proxy so reads keep their binding dependencies.
 */
export interface DynamicFormEditorHost {
    messages: Record<string, string>;
    fieldValue(field: DynamicFormField): any;
    fieldDisplayValue(field: DynamicFormField, value: any): any;
    coerceValue(field: DynamicFormField, value: any): any;
    updateValue(field: DynamicFormField, raw: any): void;
    optionValue(field: DynamicFormField, raw: any): any;
    sameOptionValue(a: any, b: any): boolean;
    setEditorValue(field: DynamicFormField, value: any): void;
    isJsonRawField(field: DynamicFormField): boolean;
    setJsonRawField(field: DynamicFormField, raw: boolean): void;
}

export function isJsonRaw(host: DynamicFormEditorHost, field: DynamicFormField): boolean {
    return host.isJsonRawField(field);
}

export function isJsonObjectValue(host: DynamicFormEditorHost, field: DynamicFormField): boolean {
    const value = host.fieldValue(field);
    return value === undefined || value === null || value === ''
        || (typeof value === 'object' && !Array.isArray(value));
}

export function isJsonObjectEditor(host: DynamicFormEditorHost, field: DynamicFormField): boolean {
    return field.type === 'json' && !isJsonRaw(host, field) && isJsonObjectValue(host, field);
}

export function isJsonTextArea(host: DynamicFormEditorHost, field: DynamicFormField): boolean {
    return field.type === 'json' && !isJsonObjectEditor(host, field);
}

export function jsonTextValue(host: DynamicFormEditorHost, field: DynamicFormField): string {
    const value = host.fieldValue(field);
    if (typeof value === 'string') {
        return value;
    }
    try {
        return JSON.stringify(value ?? {}, null, 2);
    } catch {
        return '';
    }
}

export function toggleJsonMode(host: DynamicFormEditorHost, field: DynamicFormField): void {
    if (isJsonRaw(host, field)) {
        host.setJsonRawField(field, false);
        const value = host.fieldValue(field);
        if (typeof value === 'string' && value.trim()) {
            try {
                host.updateValue(field, JSON.parse(value));
            } catch {
                // Keep the raw string until it becomes valid JSON.
            }
        }
        return;
    }
    host.setJsonRawField(field, true);
}

export function jsonEntries(
    host: DynamicFormEditorHost,
    field: DynamicFormField
): Array<{ key: string; value: any; display: string }> {
    const value = host.fieldValue(field);
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        return [];
    }
    return Object.entries(value).map(([key, item]) => ({
        key,
        value: item,
        display: typeof item === 'object' && item !== null ? JSON.stringify(item) : String(item ?? '')
    }));
}

function updateJsonObject(
    host: DynamicFormEditorHost,
    field: DynamicFormField,
    entries: Array<{ key: string; value: any }>
): void {
    const value: Record<string, any> = {};
    for (const entry of entries) {
        value[entry.key] = entry.value;
    }
    host.setEditorValue(field, value);
}

export function addJsonEntry(host: DynamicFormEditorHost, field: DynamicFormField): void {
    const entries = jsonEntries(host, field).map(entry => ({ key: entry.key, value: entry.value }));
    const used = new Set(entries.map(entry => entry.key));
    let index = entries.length + 1;
    while (used.has(`field${index}`)) {
        index += 1;
    }
    entries.push({ key: `field${index}`, value: '' });
    updateJsonObject(host, field, entries);
}

export function removeJsonEntry(host: DynamicFormEditorHost, field: DynamicFormField, index: number): void {
    const entries = jsonEntries(host, field).map(entry => ({ key: entry.key, value: entry.value }));
    entries.splice(index, 1);
    updateJsonObject(host, field, entries);
}

export function changeJsonEntryKey(
    host: DynamicFormEditorHost,
    field: DynamicFormField,
    index: number,
    event: any
): void {
    const entries = jsonEntries(host, field).map(entry => ({ key: entry.key, value: entry.value }));
    entries[index] = { ...entries[index], key: String(event?.target?.value ?? '') };
    updateJsonObject(host, field, entries);
}

export function changeJsonEntryValue(
    host: DynamicFormEditorHost,
    field: DynamicFormField,
    index: number,
    event: any
): void {
    const entries = jsonEntries(host, field).map(entry => ({ key: entry.key, value: entry.value }));
    const raw = String(event?.target?.value ?? '');
    let value: any = raw;
    if (raw !== '') {
        try {
            value = JSON.parse(raw);
        } catch {
            value = raw;
        }
    } else {
        value = '';
    }
    entries[index] = { ...entries[index], value };
    updateJsonObject(host, field, entries);
}

export function isKeyValueInput(field: DynamicFormField): boolean {
    return field.type === 'keyvalue';
}

export function keyValueValueType(field: DynamicFormField): 'text' | 'number' | 'boolean' {
    return field.valueType === 'number' || field.valueType === 'boolean' ? field.valueType : 'text';
}

export function keyValueEntries(host: DynamicFormEditorHost, field: DynamicFormField): Array<{ key: string; value: any }> {
    const value = host.fieldValue(field);
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        return [];
    }
    return Object.entries(value).map(([key, item]) => ({ key, value: item }));
}

function updateKeyValue(
    host: DynamicFormEditorHost,
    field: DynamicFormField,
    entries: Array<{ key: string; value: any }>
): void {
    const value: Record<string, any> = {};
    for (const entry of entries) {
        value[entry.key] = entry.value;
    }
    host.setEditorValue(field, value);
}

export function addKeyValue(host: DynamicFormEditorHost, field: DynamicFormField): void {
    const entries = keyValueEntries(host, field);
    const used = new Set(entries.map(entry => entry.key));
    let index = entries.length + 1;
    while (used.has(`field${index}`)) {
        index += 1;
    }
    const valueType = keyValueValueType(field);
    entries.push({
        key: `field${index}`,
        value: valueType === 'number' ? 0 : valueType === 'boolean' ? false : ''
    });
    updateKeyValue(host, field, entries);
}

export function removeKeyValue(host: DynamicFormEditorHost, field: DynamicFormField, index: number): void {
    const entries = keyValueEntries(host, field);
    entries.splice(index, 1);
    updateKeyValue(host, field, entries);
}

export function changeKeyValueKey(
    host: DynamicFormEditorHost,
    field: DynamicFormField,
    index: number,
    event: any
): void {
    const entries = keyValueEntries(host, field);
    entries[index] = { ...entries[index], key: String(event?.target?.value ?? '') };
    updateKeyValue(host, field, entries);
}

export function changeKeyValueValue(
    host: DynamicFormEditorHost,
    field: DynamicFormField,
    index: number,
    event: any
): void {
    const entries = keyValueEntries(host, field);
    const type = keyValueValueType(field);
    const raw = type === 'boolean' ? !!event?.target?.checked : event?.target?.value;
    const value = type === 'number'
        ? (raw === '' ? 0 : Number(raw))
        : type === 'boolean' ? !!raw : raw;
    entries[index] = { ...entries[index], value };
    updateKeyValue(host, field, entries);
}

export function isJsonInput(field: DynamicFormField): boolean {
    return field.type === 'json';
}

export function isListInput(field: DynamicFormField): boolean {
    return field.type === 'list';
}

export function listItems(host: DynamicFormEditorHost, field: DynamicFormField): any[] {
    const value = host.fieldValue(field);
    return Array.isArray(value) ? value : [];
}

export function listIndex(host: DynamicFormEditorHost, field: DynamicFormField, item: any): number {
    const index = listItems(host, field).indexOf(item);
    return index < 0 ? 0 : index;
}

export function listItemValue(host: DynamicFormEditorHost, item: any, child: DynamicFormField): any {
    const value = item?.[child.key];
    return host.fieldDisplayValue(child, value === undefined ? child.defaultValue : value);
}

export function listItemChecked(item: any, child: DynamicFormField): boolean {
    return item?.[child.key] === true;
}

export function isListItemVisible(child: DynamicFormField, item: any): boolean {
    const condition = child.visibleWhen;
    if (!condition) {
        return true;
    }
    const value = item?.[condition.key];
    if (condition.equals !== undefined) return String(value) === String(condition.equals);
    if (condition.notEquals !== undefined) return String(value) !== String(condition.notEquals);
    if (condition.in) return condition.in.map(entry => String(entry)).includes(String(value));
    if (condition.truthy !== undefined) return condition.truthy ? !!value : !value;
    if (condition.falsy !== undefined) return condition.falsy ? !value : !!value;
    return true;
}

export function listItemError(host: DynamicFormEditorHost, child: DynamicFormField, item: any): string {
    const value = listItemValue(host, item, child);
    const empty = value === undefined || value === null || value === '';
    if (child.required && empty) {
        return host.messages?.required || child.errorMessages?.required || 'Required';
    }
    return '';
}

function updateList(host: DynamicFormEditorHost, field: DynamicFormField, items: any[]): void {
    host.setEditorValue(field, [...items]);
}

export function addListItem(host: DynamicFormEditorHost, field: DynamicFormField): void {
    const items = listItems(host, field).map(item => ({ ...item }));
    const next: Record<string, any> = {};
    (field.itemFields || []).forEach(child => {
        next[child.key] = child.defaultValue !== undefined
            ? child.defaultValue
            : (child.type === 'checkbox' || child.type === 'switch' ? false : '');
    });
    items.push(next);
    updateList(host, field, items);
}

export function removeListItem(host: DynamicFormEditorHost, field: DynamicFormField, index: number): void {
    const items = listItems(host, field).map(item => ({ ...item }));
    items.splice(index, 1);
    updateList(host, field, items);
}

export function changeListItem(
    host: DynamicFormEditorHost,
    field: DynamicFormField,
    index: number,
    child: DynamicFormField,
    event: any
): void {
    const items = listItems(host, field).map(item => ({ ...item }));
    let raw = child.type === 'checkbox' || child.type === 'switch'
        ? !!event?.target?.checked
        : event?.target?.value;
    if (child.typed === true && typeof raw === 'string' && raw !== '') {
        const type = listItemTypedType(host, items[index], child);
        if (type !== 'literal' && !/^(msg|flow|global|env)\./.test(raw)) {
            raw = `${type}.${raw}`;
        }
    }
    items[index] = { ...(items[index] || {}), [child.key]: host.coerceValue(child, raw) };
    updateList(host, field, items);
}

export function listItemTypedType(host: DynamicFormEditorHost, item: any, child: DynamicFormField): string {
    const value = String(listItemValue(host, item, child) ?? '');
    const match = /^(msg|flow|global|env)\./.exec(value);
    return match ? match[1] : 'literal';
}

export function changeListItemTypedType(
    host: DynamicFormEditorHost,
    field: DynamicFormField,
    index: number,
    child: DynamicFormField,
    event: any
): void {
    const item = listItems(host, field)[index] || {};
    const current = String(listItemValue(host, item, child) ?? '');
    const text = current.replace(/^(msg|flow|global|env)\./, '');
    const next = String(event?.target?.value || 'literal');
    changeListItemOption(host, field, index, child, next === 'literal' ? text : `${next}.${text}`);
}

export function changeListItemOption(
    host: DynamicFormEditorHost,
    field: DynamicFormField,
    index: number,
    child: DynamicFormField,
    value: any
): void {
    const items = listItems(host, field).map(item => ({ ...item }));
    items[index] = { ...(items[index] || {}), [child.key]: value };
    updateList(host, field, items);
}

export function changeListItemSelect(
    host: DynamicFormEditorHost,
    field: DynamicFormField,
    index: number,
    child: DynamicFormField,
    event: any
): void {
    changeListItemOption(host, field, index, child, host.optionValue(child, event?.target?.value));
}
