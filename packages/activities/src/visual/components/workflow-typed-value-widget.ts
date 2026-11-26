import { Attribute, Component } from '@tsdi/components';
import type { DynamicFormField, DynamicFormTypedSource } from '@tsdi/components/common/dynamic-form';
import { WORKFLOW_TYPED_CODEC } from '../workflow-typed-value';

const DEFAULT_SOURCES: DynamicFormTypedSource[] = [
    { value: 'literal', label: 'Literal' },
    { value: 'msg', label: 'msg' },
    { value: 'flow', label: 'flow' },
    { value: 'global', label: 'global' },
    { value: 'env', label: 'env' }
];

/**
 * Typed value editor for workflow node config rows.
 *
 * Uses the host codec for storage and the field's typed sources for the source
 * selector. Numeric/boolean/JSON/expression sources get an appropriate editor;
 * the label-row `ƒ` action still opens the full expression editor.
 */
@Component({
    selector: 'workflow-typed-value-widget',
    template: `
    <div class="workflow-typed-widget">
        <select class="workflow-select workflow-field-value-type" data-value-type="true"
            aria-label="{{label}} value source" [disabled]="disabled" @change="changeSource($event)">
            <option v-for="option in sources" [value]="option.value"
                [selected]="source === option.value">{{option.label}}</option>
        </select>
        <select v-if="source === 'bool'" class="workflow-select workflow-typed-boolean"
            aria-label="{{label}}" aria-invalid="{{error ? 'true' : 'false'}}"
            aria-describedby="{{describedBy}}" [required]="required"
            [disabled]="disabled" @change="changeBoolean($event)">
            <option value="true" [selected]="text === 'true'">true</option>
            <option value="false" [selected]="text === 'false'">false</option>
        </select>
        <textarea v-else-if="source === 'json' || source === 'expression'"
            class="workflow-input workflow-typed-textarea" rows="3"
            aria-label="{{label}}" aria-invalid="{{error ? 'true' : 'false'}}"
            aria-describedby="{{describedBy}}" [required]="required"
            [value]="text" [placeholder]="placeholder" [disabled]="disabled"
            @input="inputText($event)"></textarea>
        <input v-else class="workflow-input workflow-typed-input"
            aria-label="{{label}}" aria-invalid="{{error ? 'true' : 'false'}}"
            aria-describedby="{{describedBy}}" [required]="required"
            type="{{inputType}}" [value]="text" [placeholder]="placeholder"
            [disabled]="disabled" @input="inputText($event)" />
    </div>`
})
export class WorkflowTypedValueWidgetComponent {
    @Attribute() field!: DynamicFormField;
    @Attribute() disabled = false;
    @Attribute() label = '';
    @Attribute() error = '';
    @Attribute() describedBy = '';
    @Attribute() required: boolean | string = false;
    @Attribute() changeAction?: (value: any) => void;

    source = 'literal';
    text = '';

    @Attribute()
    set value(value: any) {
        const decoded = WORKFLOW_TYPED_CODEC.decode(value);
        this.source = decoded.source || 'literal';
        this.text = decoded.text;
    }
    get value(): any { return undefined; }

    get sources(): DynamicFormTypedSource[] {
        return this.field?.typedSources?.length ? this.field.typedSources : DEFAULT_SOURCES;
    }

    get placeholder(): string { return this.field?.placeholder || ''; }

    get inputType(): string {
        if (this.source === 'num') {
            return 'number';
        }
        return this.sources.find(item => item.value === this.source)?.input || 'text';
    }

    changeSource(event: any): void {
        const next = String(event?.target?.value ?? 'literal');
        let text = this.text;
        if (next === 'bool' && text !== 'true' && text !== 'false') {
            text = 'true';
        }
        this.source = next;
        this.text = text;
        this.commit();
    }

    changeBoolean(event: any): void {
        this.text = String(event?.target?.value ?? 'true');
        this.commit();
    }

    inputText(event: any): void {
        this.text = String(event?.target?.value ?? '');
        this.commit();
    }

    protected commit(): void {
        this.changeAction?.(WORKFLOW_TYPED_CODEC.encode(this.source, this.text));
    }
}
