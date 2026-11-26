import { Attribute, Component } from '@tsdi/components';
import { AutoCompleteComponent, AutoCompleteOption } from '@tsdi/components/common/autocomplete';
import type { DynamicFormField } from '@tsdi/components/common/dynamic-form';

/**
 * Multi-value reference picker (catch/complete/status scopes).
 *
 * The stored value stays the existing comma-separated string; the chips are a
 * view over it. Selecting a candidate appends it, removing a chip drops it,
 * and typing only filters the local option list.
 */
@Component({
    selector: 'workflow-reference-multi-widget',
    imports: [AutoCompleteComponent],
    template: `
    <ui-autocomplete :multiple="true" :values="selected" :options="suggestions"
        :placeholder="placeholder" :emptyLabel="emptyLabel" :ariaLabel="label"
        :ariaInvalid="error ? 'true' : 'false'" :ariaDescribedby="describedBy"
        :disabled="disabled" :changeAction="queryChanged" :selectAction="add"
        :removeAction="remove"></ui-autocomplete>`
})
export class WorkflowReferenceMultiWidgetComponent {
    @Attribute() field!: DynamicFormField;
    @Attribute() disabled = false;
    @Attribute() label = '';
    @Attribute() error = '';
    @Attribute() describedBy = '';
    @Attribute() changeAction?: (value: any) => void;

    query = '';
    protected selfRef?: any;

    onInit(): void {
        this.selfRef = this;
    }

    @Attribute()
    set value(value: any) {
        this._value = value;
        this.syncQuery();
    }
    get value(): any { return this._value; }
    protected _value: any;

    get selected(): string[] {
        if (Array.isArray(this._value)) {
            return this._value.map(item => String(item)).filter(Boolean);
        }
        return String(this._value ?? '').split(',').map(item => item.trim()).filter(Boolean);
    }

    get options(): AutoCompleteOption[] {
        return (this.field?.options || []).map(option => ({
            label: String(option.label ?? option.value ?? ''),
            value: String(option.value ?? '')
        }));
    }

    get suggestions(): AutoCompleteOption[] {
        const options = this.options;
        const text = String(this.query || '').trim().toLowerCase();
        if (!text) {
            return options;
        }
        return options.filter(option =>
            option.label.toLowerCase().includes(text) || option.value.toLowerCase().includes(text));
    }

    get placeholder(): string { return this.field?.placeholder || ''; }
    get emptyLabel(): string { return 'No matches'; }

    readonly queryChanged = (value: string): void => {
        const self = (this as any).selfRef || this;
        self.query = String(value ?? '');
    };

    readonly add = (value: string): void => {
        const self = (this as any).selfRef || this;
        const next = String(value ?? '');
        if (!next || self.selected.includes(next)) {
            return;
        }
        self.query = '';
        self.commit([...self.selected, next]);
    };

    readonly remove = (value: string): void => {
        const self = (this as any).selfRef || this;
        const next = String(value ?? '');
        self.commit(self.selected.filter((item: string) => item !== next));
    };

    protected commit(values: string[]): void {
        this._value = values.join(',');
        this.changeAction?.(this._value);
    }

    protected syncQuery(): void {
        this.query = '';
    }
}
