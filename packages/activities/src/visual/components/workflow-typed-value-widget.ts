import { Attribute, Component, NoReactive, OnDestroy } from '@tsdi/components';
import { TypedCompletionController } from '@tsdi/components/common/dynamic-form';
import type {
    DynamicFormField,
    DynamicFormTypedCompletionItem,
    DynamicFormTypedSource
} from '@tsdi/components/common/dynamic-form';
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
    <div class="workflow-typed-widget" data-status="{{status}}" aria-busy="{{pending ? 'true' : 'false'}}">
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
            aria-describedby="{{describedBy}}" [required]="required" autocomplete="off"
            aria-autocomplete="list" aria-expanded="{{completionOpen ? 'true' : 'false'}}"
            type="{{inputType}}" [value]="text" [placeholder]="placeholder"
            [disabled]="disabled" @input="inputText($event)" @focus="requestCompletion()"
            @blur="closeCompletion()" @keydown="completionKeydown($event)" />
        <div class="workflow-typed-suggestions" role="listbox" v-if="completionOpen && suggestions.length">
            <button class="workflow-typed-suggestion" type="button" role="option"
                v-for="(item, index) in suggestions" trackBy="value"
                aria-selected="{{index === suggestionIndex}}"
                @mousedown="keepSuggestionFocus($event)"
                @click="applySuggestion(item)">
                <span class="workflow-typed-suggestion-label">{{item.label}}</span>
                <span class="workflow-typed-suggestion-description" v-if="item.description">{{item.description}}</span>
            </button>
        </div>
    </div>`
})
export class WorkflowTypedValueWidgetComponent implements OnDestroy {
    @Attribute() field!: DynamicFormField;
    @Attribute() disabled = false;
    @Attribute() label = '';
    @Attribute() error = '';
    @Attribute() describedBy = '';
    @Attribute() required: boolean | string = false;
    @Attribute() changeAction?: (value: any) => void;
    /** Async validation state forwarded by `dynamic-field-widget`. */
    @Attribute() pending: boolean | string = false;
    @Attribute() valid: boolean | string = false;
    @Attribute() status = 'default';
    @Attribute() asyncError = '';
    @Attribute() pendingLabel = 'Checking…';
    @Attribute() validLabel = 'Valid';
    source = 'literal';
    text = '';
    suggestions: DynamicFormTypedCompletionItem[] = [];
    suggestionIndex = 0;
    completionOpen = false;
    protected completionRequest = 0;

    /** Non-reactive controller: a proxy would break AbortController internals. */
    @NoReactive() protected completion = new TypedCompletionController();

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

    get activeSource(): DynamicFormTypedSource | undefined {
        return this.sources.find(item => item.value === this.source);
    }

    /** Text sources with a host completion hook use the shared combobox. */
    get hasCompletion(): boolean {
        return this.source !== 'bool'
            && this.source !== 'json'
            && this.source !== 'expression'
            && typeof this.activeSource?.completionSource === 'function';
    }

    onDestroy(): void {
        this.completion.dispose();
    }

    /** Ask the active source for paths matching the current text. */
    requestCompletion(): void {
        if (!this.hasCompletion) {
            this.closeCompletion();
            return;
        }
        const request = ++this.completionRequest;
        void this.completion.query(this.activeSource, this.text)
            .then(items => {
                if (request !== this.completionRequest || this.destroyedRequest()) {
                    return;
                }
                this.suggestions = items;
                this.suggestionIndex = 0;
                this.completionOpen = items.length > 0;
            })
            .catch(() => {
                if (request === this.completionRequest) {
                    this.closeCompletion();
                }
            });
    }

    protected destroyedRequest(): boolean {
        return !this.hasCompletion;
    }

    closeCompletion(): void {
        this.completionRequest += 1;
        this.suggestions = [];
        this.suggestionIndex = 0;
        this.completionOpen = false;
    }

    keepSuggestionFocus(event: any): void {
        event?.preventDefault?.();
    }

    applySuggestion(item: DynamicFormTypedCompletionItem): void {
        if (!item) {
            return;
        }
        this.text = item.value;
        this.commit();
        this.closeCompletion();
    }

    completionKeydown(event: any): void {
        const key = event?.key;
        if (this.completionOpen && this.suggestions.length) {
            if (key === 'ArrowDown' || key === 'ArrowUp') {
                event.preventDefault?.();
                const delta = key === 'ArrowDown' ? 1 : -1;
                const size = this.suggestions.length;
                this.suggestionIndex = (this.suggestionIndex + delta + size) % size;
                return;
            }
            if (key === 'Enter') {
                event.preventDefault?.();
                this.applySuggestion(this.suggestions[this.suggestionIndex] || this.suggestions[0]);
                return;
            }
            if (key === 'Escape') {
                event.preventDefault?.();
                this.closeCompletion();
                return;
            }
        }
        if (key === 'ArrowDown' && this.hasCompletion) {
            event.preventDefault?.();
            this.requestCompletion();
        }
    }

    changeSource(event: any): void {
        const next = String(event?.target?.value ?? 'literal');
        this.completion.cancel();
        this.closeCompletion();
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
        this.requestCompletion();
    }

    protected commit(): void {
        this.changeAction?.(WORKFLOW_TYPED_CODEC.encode(this.source, this.text));
    }
}
