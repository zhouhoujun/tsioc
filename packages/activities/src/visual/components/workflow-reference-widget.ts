import { Attribute, Component } from '@tsdi/components';
import { AutoCompleteComponent, AutoCompleteOption } from '@tsdi/components/common/autocomplete';
import type { DynamicFormField } from '@tsdi/components/common/dynamic-form';

/**
 * Searchable reference picker used by workflow node configs.
 *
 * The form owns the stored id and the label-row create/edit actions; this
 * widget only provides a type-ahead view over the reference options. Typing
 * filters locally and does not write the config until an option is chosen.
 */
@Component({
    selector: 'workflow-reference-widget',
    imports: [AutoCompleteComponent],
    template: `
    <ui-autocomplete :value="query" :options="suggestions"
        :placeholder="placeholder" :emptyLabel="emptyLabel" :ariaLabel="label"
        :disabled="disabled" :changeAction="queryChanged" :selectAction="choose">
    </ui-autocomplete>`
})
export class WorkflowReferenceWidgetComponent {
    @Attribute() field!: DynamicFormField;
    @Attribute() disabled = false;
    @Attribute() changeAction?: (value: any) => void;

    query = '';

    @Attribute()
    set value(value: any) {
        this._value = value;
        this.syncQuery();
    }
    get value(): any { return this._value; }
    protected _value: any;

    onInit(): void {
        this.syncQuery();
    }

    get options(): AutoCompleteOption[] {
        return (this.field?.options || []).map(option => ({
            label: String(option.label ?? option.value ?? ''),
            value: String(option.value ?? ''),
            description: undefined
        }));
    }

    get suggestions(): AutoCompleteOption[] {
        const options = this.options;
        const text = String(this.query || '').trim().toLowerCase();
        const selected = this.selectedLabel();
        if (!text || (selected && text === selected.toLowerCase())) {
            return options;
        }
        return options.filter(option =>
            option.label.toLowerCase().includes(text) || option.value.toLowerCase().includes(text));
    }

    get label(): string { return this.field?.label || ''; }
    get placeholder(): string { return this.field?.placeholder || ''; }
    get emptyLabel(): string { return 'No matches'; }

    queryChanged(value: string): void {
        this.query = String(value ?? '');
    }

    choose(value: string): void {
        const next = String(value ?? '');
        this.query = this.options.find(option => option.value === next)?.label || next;
        this.changeAction?.(next);
    }

    protected selectedLabel(): string {
        const current = this._value === undefined || this._value === null ? '' : String(this._value);
        if (!current) {
            return '';
        }
        return this.options.find(option => option.value === current)?.label || current;
    }

    protected syncQuery(): void {
        const current = this._value === undefined || this._value === null ? '' : String(this._value);
        this.query = current ? this.selectedLabel() : '';
    }
}
