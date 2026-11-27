import type { DynamicFormField } from './dynamic-form.types';
import * as editor from './dynamic-form.editors';

/**
 * Editor/list projection methods installed on the dynamic form.
 *
 * Keeping the one-line projection delegates in a base class prevents the form
 * component (schema state + editing flow) from growing every time a renderer
 * needs another view helper.
 */
export class DynamicFormEditorMethods {
    isJsonRaw(field: DynamicFormField): boolean { return editor.isJsonRaw(this as any, field); }

    isJsonObjectValue(field: DynamicFormField): boolean { return editor.isJsonObjectValue(this as any, field); }

    isJsonObjectEditor(field: DynamicFormField): boolean { return editor.isJsonObjectEditor(this as any, field); }

    isJsonTextArea(field: DynamicFormField): boolean { return editor.isJsonTextArea(this as any, field); }

    jsonTextValue(field: DynamicFormField): string { return editor.jsonTextValue(this as any, field); }

    toggleJsonMode(field: DynamicFormField): void { editor.toggleJsonMode(this as any, field); }

    jsonEntries(field: DynamicFormField): Array<{ key: string; value: any; display: string }> { return editor.jsonEntries(this as any, field); }


    addJsonEntry(field: DynamicFormField): void { editor.addJsonEntry(this as any, field); }

    removeJsonEntry(field: DynamicFormField, index: number): void { editor.removeJsonEntry(this as any, field, index); }

    changeJsonEntryKey(field: DynamicFormField, index: number, event: any): void { editor.changeJsonEntryKey(this as any, field, index, event); }

    changeJsonEntryValue(field: DynamicFormField, index: number, event: any): void { editor.changeJsonEntryValue(this as any, field, index, event); }


    isKeyValueInput(field: DynamicFormField): boolean { return editor.isKeyValueInput(field); }

    keyValueValueType(field: DynamicFormField): 'text' | 'number' | 'boolean' { return editor.keyValueValueType(field); }

    keyValueEntries(field: DynamicFormField): Array<{ key: string; value: any }> { return editor.keyValueEntries(this as any, field); }


    addKeyValue(field: DynamicFormField): void { editor.addKeyValue(this as any, field); }

    removeKeyValue(field: DynamicFormField, index: number): void { editor.removeKeyValue(this as any, field, index); }

    changeKeyValueKey(field: DynamicFormField, index: number, event: any): void { editor.changeKeyValueKey(this as any, field, index, event); }

    changeKeyValueValue(field: DynamicFormField, index: number, event: any): void { editor.changeKeyValueValue(this as any, field, index, event); }


    isJsonInput(field: DynamicFormField): boolean { return editor.isJsonInput(field); }

    isListInput(field: DynamicFormField): boolean { return editor.isListInput(field); }

    listIndex(field: DynamicFormField, item: any): number { return editor.listIndex(this as any, field, item); }

    listItems(field: DynamicFormField): any[] { return editor.listItems(this as any, field); }

    listItemValue(item: any, child: DynamicFormField): any { return editor.listItemValue(this as any, item, child); }
    listItemValueAt(field: DynamicFormField, index: number, child: DynamicFormField): any { return editor.listItemValue(this as any, editor.listItems(this as any, field)[index] || {}, child); }
    listItemErrorAt(field: DynamicFormField, index: number, child: DynamicFormField): string { return editor.listItemError(this as any, child, editor.listItems(this as any, field)[index] || {}); }

    listItemChecked(item: any, child: DynamicFormField): boolean { return editor.listItemChecked(item, child); }

    isListItemVisible(child: DynamicFormField, item: any): boolean { return editor.isListItemVisible(child, item); }

    listItemError(child: DynamicFormField, item: any): string { return editor.listItemError(this as any, child, item); }


    addListItem(field: DynamicFormField): void { editor.addListItem(this as any, field); }
    moveListItem(field: DynamicFormField, index: number, delta: number): void { editor.moveListItem(this as any, field, index, delta); }
    listRowSummary(field: DynamicFormField, item: any, index: number): string { return editor.listRowSummary(field, item, index); }

    removeListItem(field: DynamicFormField, index: number): void { editor.removeListItem(this as any, field, index); }

    changeListItem(field: DynamicFormField, index: number, child: DynamicFormField, event: any): void { editor.changeListItem(this as any, field, index, child, event); }

    listItemTypedType(item: any, child: DynamicFormField): string { return editor.listItemTypedType(this as any, item, child); }

    changeListItemTypedType(field: DynamicFormField, index: number, child: DynamicFormField, event: any): void { editor.changeListItemTypedType(this as any, field, index, child, event); }

    changeListItemOption(field: DynamicFormField, index: number, child: DynamicFormField, value: any): void { editor.changeListItemOption(this as any, field, index, child, value); }

    changeListItemSelect(field: DynamicFormField, index: number, child: DynamicFormField, event: any): void { editor.changeListItemSelect(this as any, field, index, child, event); }

}
