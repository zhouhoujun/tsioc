import { Attribute, Component, ElementRef, OnDestroy, noReact } from '@tsdi/components';
import { Optional } from '@tsdi/ioc';
import { markElementRefRaw } from '../../src/raw-element';
import { installTypeaheadStyles } from './typeahead.styles';
import { AutoCompleteComponent, AutoCompleteOption } from '../../autocomplete/src/autocomplete';
import {
    createTypeaheadMachineState,
    transitionTypeaheadMachine,
    TYPEAHEAD_REQUEST_TIMEOUT_MS,
    typeaheadMachineError,
    typeaheadMachineItems,
    typeaheadMachinePending,
    TypeaheadMachineEvent,
    TypeaheadMachineState
} from './typeahead.machine';

export interface TypeaheadResult {
    items: AutoCompleteOption[];
    total?: number;
    error?: string;
}

export type TypeaheadSource = (query: string, signal: AbortSignal) => Promise<TypeaheadResult>;

/**
 * Async typeahead built on the shared autocomplete input. The host supplies a
 * `source(query, signal)`; debounce, cache, stale rows, timeout, retry and
 * abortable requests are driven by a pure state machine.
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
export class TypeaheadComponent implements OnDestroy {
    constructor(@Optional() protected elementRef?: ElementRef) {
        markElementRefRaw(elementRef);
    }

    onInit(): void {
        installTypeaheadStyles((this.elementRef?.nativeElement as { ownerDocument?: Document } | undefined)?.ownerDocument);
        if (this.source && this.minQueryLength === 0) {
            this.dispatch({ type: 'input.changed', query: '', delayMs: 0, minChars: 0 });
        }
    }

    onDestroy(): void {
        this.dispatch({ type: 'disposed' });
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
    /** Milliseconds to wait after typing before calling the source. */
    @Attribute() debounce = 0;
    /** Abort a request that stalls; the list becomes retryable instead of loading forever. */
    @Attribute() requestTimeout = TYPEAHEAD_REQUEST_TIMEOUT_MS;
    @Attribute() changeAction?: (value: string) => void;
    @Attribute() selectAction?: (value: string) => void;

    private machine: TypeaheadMachineState<AutoCompleteOption> = createTypeaheadMachineState<AutoCompleteOption>();
    private timer?: ReturnType<typeof setTimeout>;
    private aborter?: AbortController;
    private _open = false;
    private destroyed = false;

    get options(): AutoCompleteOption[] {
        return typeaheadMachineItems(this.machine);
    }

    get openState(): boolean {
        return this._open;
    }

    get loadingState(): boolean {
        return typeaheadMachinePending(this.machine);
    }

    get error(): string {
        return typeaheadMachineError(this.machine);
    }

    get stale(): boolean {
        return this.machine.status !== 'disposed' && this.machine.stale;
    }

    get minQueryLength(): number {
        const value = Math.floor(Number(this.minChars));
        return Number.isFinite(value) && value >= 0 ? value : 1;
    }

    get debounceMs(): number {
        const value = Math.floor(Number(this.debounce));
        return Number.isFinite(value) && value > 0 ? value : 0;
    }

    onInput(text: string): void {
        this.value = String(text ?? '');
        this.changeAction?.(this.value);
        if (!this.source) {
            return;
        }
        const query = this.value;
        if (query.trim().length < this.minQueryLength) {
            this._open = false;
            this.dispatch({ type: 'input.changed', query, delayMs: 0, minChars: this.minQueryLength });
            return;
        }
        this._open = true;
        this.dispatch({ type: 'input.changed', query, delayMs: this.debounceMs, minChars: this.minQueryLength });
    }

    onSelect(value: string): void {
        this.value = String(value ?? '');
        this._open = false;
        this.selectAction?.(this.value);
    }

    retry(): void {
        this._open = true;
        this.dispatch({ type: 'retry.requested' });
    }

    /** Clear cached responses (for example after the host invalidates its data). */
    clearCache(): void {
        if (this.machine.status === 'disposed') {
            return;
        }
        this.machine = {
            ...this.machine,
            cache: new Map<string, AutoCompleteOption[]>()
        };
    }

    /** Kept for hosts that drive the component directly; honors the configured debounce. */
    load(query: string): void {
        this.onInput(query);
    }

    protected dispatch(event: TypeaheadMachineEvent<AutoCompleteOption>): void {
        if (this.destroyed) {
            return;
        }
        const previous = this.machine;
        const next = transitionTypeaheadMachine(previous, event);
        if (next.state !== previous) {
            this.machine = next.state;
        }
        next.effects.forEach(effect => this.runEffect(effect));
    }

    protected runEffect(effect: { type: string; attempt?: number; delayMs?: number; query?: string }): void {
        if (this.timer !== undefined) {
            clearTimeout(this.timer);
            this.timer = undefined;
        }
        if (effect.type === 'cancel') {
            this.aborter?.abort();
            this.aborter = undefined;
            return;
        }
        if (effect.type === 'debounce') {
            this.timer = setTimeout(() => {
                this.timer = undefined;
                this.dispatch({ type: 'debounce.elapsed', attempt: effect.attempt as number });
            }, Math.max(0, effect.delayMs as number));
            return;
        }
        if (effect.type !== 'request') {
            return;
        }
        const attempt = effect.attempt as number;
        const query = String(effect.query ?? '');
        const source = this.source;
        if (!source) {
            return;
        }
        this.aborter?.abort();
        const aborter = new AbortController();
        // AbortController/AbortSignal use private fields; proxying them breaks abort().
        (aborter as any)[noReact] = true;
        (aborter.signal as any)[noReact] = true;
        this.aborter = aborter;
        this._open = true;
        const timeout = Math.max(1, Number(this.requestTimeout) || TYPEAHEAD_REQUEST_TIMEOUT_MS);
        this.timer = setTimeout(() => {
            this.timer = undefined;
            this.dispatch({ type: 'request.timed-out', attempt });
        }, timeout);
        source(query, aborter.signal).then(
            result => {
                if (this.destroyed || aborter.signal.aborted) {
                    return;
                }
                this.dispatch({ type: 'request.succeeded', attempt, result });
                this._open = true;
            },
            error => {
                if (this.destroyed || aborter.signal.aborted) {
                    return;
                }
                this.dispatch({
                    type: 'request.failed',
                    attempt,
                    message: error instanceof Error ? error.message : String(error)
                });
                this._open = true;
            }
        );
    }
}
