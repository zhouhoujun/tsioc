import { Attribute, Component, ElementRef } from '@tsdi/components';
import { Optional } from '@tsdi/ioc';
import { markElementRefRaw } from '../../src/raw-element';
import { installTypeaheadStyles } from './typeahead.styles';
import { AutoCompleteComponent, AutoCompleteOption } from '../../autocomplete/src/autocomplete';
import { normalizeBoolean } from '../../src/ui';

export interface TypeaheadResult {
    items: AutoCompleteOption[];
    total?: number;
    error?: string;
}

export type TypeaheadSource = (query: string, signal: AbortSignal) => Promise<TypeaheadResult>;

/**
 * Async typeahead built on the shared autocomplete input. The host supplies a
 * `source(query, signal)`; stale requests are aborted/ignored, and loading,
 * empty, error and retry states are renderer-neutral.
 */
@Component({
    selector: 'ui-typeahead',
    imports: [AutoCompleteComponent],
    template: `
    <div class="ui-typeahead {{className}}">
        <ui-autocomplete :value="value" :options="options" :open="openState" :loading="loadingState"
            :placeholder="placeholder" :emptyLabel="emptyLabel" :ariaLabel="ariaLabel"
            :changeAction="onInput" :selectAction="onSelect"></ui-autocomplete>
        <div class="ui-typeahead-status">
            <span class="ui-typeahead-loading" v-if="loadingState">{{loadingLabel}}</span>
            <span class="ui-typeahead-error" role="alert" v-if="error">{{error}}</span>
            <button class="ui-typeahead-retry ui-plain-button" type="button" v-if="error" @click="retry">{{retryLabel}}</button>
        </div>
    </div>`
})
export class TypeaheadComponent {
    constructor(@Optional() protected elementRef?: ElementRef) {
        markElementRefRaw(elementRef);
    }

    onInit(): void {
        installTypeaheadStyles((this.elementRef?.nativeElement as { ownerDocument?: Document } | undefined)?.ownerDocument);
    }

    @Attribute() value = '';
    @Attribute() source?: TypeaheadSource;
    @Attribute() placeholder = '';
    @Attribute() emptyLabel = 'No matches';
    @Attribute() loadingLabel = 'Loading…';
    @Attribute() retryLabel = 'Retry';
    @Attribute() ariaLabel = 'Search';
    @Attribute() className = '';
    @Attribute() minChars = 1;
    @Attribute() changeAction?: (value: string) => void;
    @Attribute() selectAction?: (value: string) => void;

    private _options: AutoCompleteOption[] = [];
    private _open = false;
    private _loading = false;
    private _error = '';
    private lastQuery = '';
    private requestId = 0;
    private aborter?: AbortController;

    get options(): AutoCompleteOption[] {
        return this._options;
    }

    get openState(): boolean {
        return this._open;
    }

    get loadingState(): boolean {
        return this._loading;
    }

    get error(): string {
        return this._error;
    }

    get minQueryLength(): number {
        const value = Math.floor(Number(this.minChars));
        return Number.isFinite(value) && value >= 0 ? value : 1;
    }

    onInput(text: string): void {
        this.value = String(text ?? '');
        this.lastQuery = this.value;
        this.changeAction?.(this.value);
        if (!this.source) {
            return;
        }
        void this.load(this.value);
    }

    onSelect(value: string): void {
        this.value = String(value ?? '');
        this._open = false;
        this.selectAction?.(this.value);
    }

    retry(): void {
        void this.load(this.lastQuery || this.value);
    }

    async load(query: string): Promise<void> {
        const source = this.source;
        if (!source) {
            return;
        }
        const text = String(query ?? '');
        this.lastQuery = text;
        if (text.trim().length < this.minQueryLength) {
            this._options = [];
            this._open = false;
            this._error = '';
            this._loading = false;
            return;
        }
        this.aborter?.abort();
        const aborter = new AbortController();
        this.aborter = aborter;
        const request = ++this.requestId;
        this._loading = true;
        this._error = '';
        try {
            const result = await source(text, aborter.signal);
            if (request !== this.requestId) {
                return;
            }
            this._options = Array.isArray(result?.items) ? result.items : [];
            this._error = String(result?.error ?? '');
            this._open = true;
        } catch (error) {
            if (request !== this.requestId) {
                return;
            }
            this._options = [];
            this._error = error instanceof Error ? error.message : String(error);
            this._open = true;
        } finally {
            if (request === this.requestId) {
                this._loading = false;
            }
        }
    }
}
