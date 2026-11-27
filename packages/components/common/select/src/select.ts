import { Attribute, Component, Computed, OnDestroy, noReact } from '@tsdi/components';
import { clampSelectIndex, resolveSelectWindow } from '../../src/input';
import { nextUiId, normalizeBoolean } from '../../src/ui';
import { SelectionCore } from '../../src/selection-core';
import { getDisplayWidth } from '../../src/display-width';
import {
    createSelectPreviewState,
    transitionSelectPreview,
    SelectPreviewEvent,
    SelectPreviewState
} from './select-preview';

export type SelectSource = (query: string, signal: AbortSignal) => SelectOption[] | Promise<SelectOption[]>;

export interface SelectOption {
    label: string;
    value: string;
    description?: string;
    disabled?: boolean;
    /** Optional group heading (rendered before the first option of a group). */
    group?: string;
}

/**
 * Renderer-neutral select/list shell shared by the TUI and web console.
 * Hosts provide the options, window and styles; the console/html renderer own
 * how `<select>` is painted and how pointer rows are hit-tested.
 */
@Component({
    selector: 'select-list, ui-select-list',
    template: `
    <div class="console-panel select-list {{widthClass}}" role="dialog" aria-label="{{ariaLabel}}">
        <div class="select-shell {{suggestion ? 'select-suggestions' : 'select-card'}}">
            <label class="dialog-close" role="button" tabindex="0" focusable="true"
                aria-label="{{closeTitle}}" data-cell-width="2" @click="close" @keydown="closeKeydown($event)">{{closeLabel}}</label>
            <select class="select-core"
                aria-label="{{ariaLabel}}"
                title="{{title}}" hint="{{hint}}" meta="{{meta}}"
                options="{{optionsJson}}"
                selectedIndex="{{selectedIndexText}}"
                visibleCount="{{visibleCountText}}"
                detailLines="{{detailLinesJson}}"
                optionClass="select-option"
                optionActiveClass="select-option is-selected"
                @keydown="emitKeydown($event)"
                @select-option="emitSelection($event)"></select>
            <div class="select-values" v-if="multiple && selectedLabels.length">
                <span class="select-value" v-for="item in selectedLabels" trackBy="value">{{item.label}}<span
                    class="select-value-remove" role="button" tabindex="0" focusable="true"
                    aria-label="{{removeValueTitle}} {{item.label}}"
                    @click="removeValue(item.value)" @keydown="removeValueKeydown(item.value, $event)">✕</span></span>
                <span class="select-clear" role="button" tabindex="0" focusable="true"
                    v-if="clearable" @click="clearValues" @keydown="clearValuesKeydown($event)">{{clearLabel}}</span>
            </div>
            <input class="select-search" v-if="searchable" type="text" role="combobox"
                aria-label="{{ariaLabel}}" aria-autocomplete="list" aria-expanded="true"
                aria-controls="{{listId}}" aria-activedescendant="{{activeDescendant}}"
                [value]="query" placeholder="{{filterPlaceholder}}"
                @input="setQuery($event?.target?.value)" @keydown="onListboxKeydown($event)" />
            <label class="select-title" v-if="title">{{title}}</label>
            <label class="select-meta" v-if="meta">{{meta}}</label>
            <div class="select-rows" role="listbox" id="{{listId}}" aria-label="{{ariaLabel}}"
                aria-multiselectable="{{multiple}}" aria-activedescendant="{{activeDescendant}}"
                tabindex="{{searchable ? -1 : 0}}" focusable="{{!searchable}}"
                [style]="scrollStyle" @keydown="onListboxKeydown($event)">
                <div class="select-row" v-for="option in visibleOptions" trackBy="index">
                    <span class="select-group" role="presentation" v-if="option.showGroup">{{option.group}}</span>
                    <label class="{{option.className}}" role="option" id="{{optionId(option.index)}}"
                        aria-selected="{{option.selected}}" aria-disabled="{{option.disabled}}"
                        @click="choose(option.index)">
                        <span class="select-option-label">{{option.label}}</span><span class="select-option-description" v-if="option.description">{{option.description}}</span>
                    </label>
                </div>
                <label class="select-loading" role="status" v-if="loading">{{loadingLabel}}</label>
                <label class="select-error" role="alert" v-if="error">{{error}}</label>
                <label class="select-empty" v-if="emptyText && !visibleOptions.length && !loading">{{emptyText}}</label>
                <label class="select-detail" v-for="line in detailLines" v-if="detailLines && detailLines.length">{{line}}</label>
            </div>
            <label class="select-hint" v-if="hint">{{hint}}</label>
        </div>
    </div>`
})
export class SelectComponent implements OnDestroy {
    readonly listId = nextUiId('ui-select-list');
    private readonly selection = new SelectionCore();

    @Attribute() options: SelectOption[] = [];
    /** Host preview hook; return an undo function to revert the preview. */
    @Attribute() highlightAction?: (value: string) => void | (() => void);
    @Attribute() selectedIndex = 0;
    private _open = true;
    private preview: SelectPreviewState = createSelectPreviewState(true);

    @Attribute()
    get open(): boolean { return this._open; }
    set open(value: boolean | string) {
        const next = normalizeBoolean(value, true);
        if (next === this._open) {
            return;
        }
        this._open = next;
        this.dispatchPreview({ type: 'open.changed', open: next });
    }
    private previewUndo?: () => void;

    /** Update the active row and preview it when a highlight hook exists. */
    setSelectedIndex(index: number, preview = true): void {
        this.selectedIndex = index;
        if (preview && this.highlightAction) {
            this.previewAt(index);
        }
    }

    @Attribute() visibleCount = 0;
    @Attribute() title = '';
    @Attribute() hint = '';
    @Attribute() meta = '';
    @Attribute() detailLines: string[] = [];
    /** Empty-state copy shown when a live filter matched nothing. */
    @Attribute() emptyText = '';
    @Attribute() ariaLabel = 'Selection menu';
    /** @deprecated Use `ariaLabel` (kept for existing hosts). */
    @Attribute()
    get accessibilityLabel(): string { return this.ariaLabel; }
    set accessibilityLabel(value: string) { this.ariaLabel = String(value ?? ''); }
    @Attribute() closeLabel = '✕';
    @Attribute() closeTitle = 'Close';
    /** Composer-attached suggestion lists keep the opencode rails. */
    @Attribute() suggestion = false;
    /** Content-fit the blocking menu instead of spanning the terminal. */
    @Attribute() fitContent = false;
    /** Browser-side viewport guard; empty disables the inline scroll box. */
    @Attribute() maxHeight = '60vh';
    @Attribute() maxWidth = 88;
    @Attribute() minWidth = 28;
    /** Unfiltered title used for width (live filter text must not resize the card). */
    @Attribute() widthTitle = '';
    /** Unfiltered options used for width; a filtered `options` list may be shorter. */
    @Attribute() widthOptions?: SelectOption[];
    @Attribute() selectAction?: (value: string) => void;
    @Attribute() valuesAction?: (values: string[]) => void;
    @Attribute() removeAction?: (value: string) => void;
    @Attribute() clearLabel = 'Clear';
    @Attribute() removeValueTitle = 'Remove';
    @Attribute() filterPlaceholder = 'Search…';
    @Attribute() loadingLabel = 'Loading…';
    @Attribute() source?: SelectSource;
    @Attribute() closeAction?: () => void;
    @Attribute() keydownAction?: (event: KeyboardEvent) => void;

    private _multiple = false;
    private _clearable = false;
    private _searchable = false;
    private _tags = false;
    query = '';
    loading = false;
    error = '';
    private sourceItems: SelectOption[] = [];
    private sourceAbort?: AbortController;
    private sourceRequest = 0;
    private typeaheadBuffer = '';
    private typeaheadAt = 0;

    @Attribute()
    get multiple(): boolean { return this._multiple; }
    set multiple(value: boolean | string) { this._multiple = normalizeBoolean(value); }

    @Attribute()
    get clearable(): boolean { return this._clearable; }
    set clearable(value: boolean | string) { this._clearable = normalizeBoolean(value); }

    @Attribute() values: string[] = [];

    @Attribute()
    get searchable(): boolean { return this._searchable; }
    set searchable(value: boolean | string) { this._searchable = normalizeBoolean(value); }

    @Attribute()
    get tags(): boolean { return this._tags; }
    set tags(value: boolean | string) { this._tags = normalizeBoolean(value); }

    @Computed()
    get scrollStyle(): Record<string, string> {
        return this.maxHeight
            ? {
                'max-height': String(this.maxHeight),
                'overflow-y': 'auto',
                'overscroll-behavior': 'contain'
            }
            : {};
    }

    get selectedLabels(): Array<{ value: string; label: string }> {
        const selected = new Set((this.values || []).map(String));
        const source = [...(this.options || []), ...(this.sourceItems || [])]
            .filter((option, index, list) => list.findIndex(item => String(item.value) === String(option?.value)) === index);
        return source
            .filter(option => selected.has(String(option?.value)))
            .map(option => ({ value: String(option.value), label: String(option.label ?? option.value) }));
    }

    get displayOptions(): SelectOption[] {
        const base = this.source ? this.sourceItems : (this.options || []);
        const query = String(this.query || '').trim().toLocaleLowerCase();
        const filtered = query
            ? base.filter(option => `${option.label} ${option.value}`.toLocaleLowerCase().includes(query))
            : base.slice();
        if (this._tags && query && !filtered.some(option => String(option.value) === String(this.query).trim())) {
            filtered.push({ label: `Add "${String(this.query).trim()}"`, value: String(this.query).trim() });
        }
        return filtered;
    }

    get activeIndex(): number {
        return clampSelectIndex(this.displayOptions.length, Number(this.selectedIndex));
    }

    setQuery(value: string): void {
        const next = String(value ?? '');
        if (next === this.query) { return; }
        this.query = next;
        this.setSelectedIndex(0);
        this.error = '';
        void this.loadSource(next);
    }

    async loadSource(query: string): Promise<void> {
        const source = this.source;
        if (!source) {
            this.sourceItems = [];
            return;
        }
        this.sourceAbort?.abort();
        const abort = new AbortController();
        (abort as any)[noReact] = true;
        (abort.signal as any)[noReact] = true;
        this.sourceAbort = abort;
        const request = ++this.sourceRequest;
        this.loading = true;
        try {
            const result = await source(query, abort.signal);
            if (request !== this.sourceRequest) { return; }
            this.sourceItems = Array.isArray(result) ? result : [];
        } catch (error) {
            if (request !== this.sourceRequest) { return; }
            this.sourceItems = [];
            this.error = error instanceof Error ? error.message : String(error);
        } finally {
            if (request === this.sourceRequest) {
                this.loading = false;
            }
        }
    }

    optionId(index: number): string {
        return `${this.listId}-option-${index}`;
    }

    get activeDescendant(): string {
        return this.options?.length ? this.optionId(this.activeIndex) : '';
    }

    onListboxKeydown(event: any): void {
        const key = String(event?.key || '');
        if (key === 'Escape') {
            event.preventDefault?.();
            this.close();
            return;
        }
        if (key === 'ArrowDown' || key === 'ArrowUp') {
            event.preventDefault?.();
            const next = this.selection.move(this.displayOptions, this.activeIndex, key === 'ArrowDown' ? 1 : -1);
            if (next >= 0) {
                this.setSelectedIndex(next);
            }
            return;
        }
        if (key === 'Home' || key === 'End') {
            event.preventDefault?.();
            const next = key === 'Home'
                ? this.selection.first(this.displayOptions)
                : this.selection.last(this.displayOptions);
            if (next >= 0) {
                this.setSelectedIndex(next);
            }
            return;
        }
        if (key === 'Enter' || key === ' ' || key === 'Spacebar') {
            event.preventDefault?.();
            this.choose(this.activeIndex);
            return;
        }
        if (!this._searchable && key.length === 1 && !event?.ctrlKey && !event?.metaKey && !event?.altKey) {
            this.typeahead(key);
        }
    }

    protected typeahead(key: string): void {
        const now = Date.now();
        if (now - this.typeaheadAt > 700) { this.typeaheadBuffer = ''; }
        this.typeaheadAt = now;
        this.typeaheadBuffer += key.toLocaleLowerCase();
        const query = this.typeaheadBuffer;
        const options = this.displayOptions;
        for (let offset = 1; offset <= options.length; offset++) {
            const index = ((this.activeIndex + offset) % options.length + options.length) % options.length;
            const option = options[index];
            if (option && !option.disabled
                && String(option.label ?? '').toLocaleLowerCase().startsWith(query)) {
                this.setSelectedIndex(index);
                return;
            }
        }
    }

    removeValue(value: string, event?: Event): void {
        event?.stopPropagation?.();
        const next = (this.values || []).filter(item => String(item) !== String(value));
        if (next.length === this.values.length) { return; }
        this.values = next;
        this.removeAction?.(String(value));
        this.valuesAction?.(next);
    }

    closeKeydown(event: any): void { this.activateKey(event, () => this.close()); }
    removeValueKeydown(value: string, event: any): void { this.activateKey(event, () => this.removeValue(value)); }
    clearValuesKeydown(event: any): void { this.activateKey(event, () => this.clearValues()); }
    protected activateKey(event: any, run: () => void): void {
        if (event?.key === 'Enter' || event?.key === ' ' || event?.key === 'Spacebar') {
            event.preventDefault?.();
            event.stopPropagation?.();
            run();
        }
    }

    clearValues(event?: Event): void {
        event?.stopPropagation?.();
        if (!this.values?.length) { return; }
        this.values = [];
        this.valuesAction?.([]);
    }

    get widthClass(): string {
        return this.fitContent ? `dialog-w-${this.resolveContentWidth()}` : '';
    }

    /** Fit blocking menus to their widest title/option; suggestions stay full width. */
    protected resolveContentWidth(): number {
        const max = Math.max(8, Number(this.maxWidth) || 88);
        const min = Math.max(8, Math.min(max, Number(this.minWidth) || 28));
        const widthOptions = this.widthOptions?.length ? this.widthOptions : (this.options || []);
        const longest = Math.max(
            0,
            getDisplayWidth(String(this.widthTitle || this.title || '')),
            getDisplayWidth(String(this.hint || '')),
            getDisplayWidth(String(this.meta || '')),
            ...widthOptions.map((option, index) =>
                getDisplayWidth(`${index + 1}. ${option?.label ?? ''}`)
                + (option?.description ? 2 + getDisplayWidth(String(option.description)) : 0))
        );
        // Content budget includes the left/right rails and horizontal padding.
        return Math.max(min, Math.min(max, longest + 12));
    }

    /** Windowed rows for renderers that paint real elements (browser). */
    @Computed()
    get visibleOptions(): Array<{ index: number; label: string; value: string; description: string; group: string; showGroup: boolean; selected: boolean; disabled: boolean; className: string }> {
        const options = this.displayOptions;
        const active = clampSelectIndex(options.length, Number(this.selectedIndex));
        const window = resolveSelectWindow(options.length, active, Number(this.visibleCount) || options.length || 1);
        const selectedValues = new Set((this.values || []).map(String));
        let previousGroup = '';
        return options
            .slice(window.start, window.start + window.count)
            .map((option, offset) => {
                const index = window.start + offset;
                const value = String(option?.value ?? '');
                const group = String(option?.group ?? '');
                const showGroup = !!group && group !== previousGroup;
                previousGroup = group;
                const isSelected = this._multiple ? selectedValues.has(value) : index === active;
                return {
                    index,
                    label: String(option?.label ?? ''),
                    value,
                    description: String((option as { description?: string })?.description ?? ''),
                    group,
                    showGroup,
                    selected: isSelected,
                    disabled: option?.disabled === true,
                    className: [
                        'select-option',
                        isSelected ? 'is-selected' : '',
                        option?.disabled ? 'is-disabled' : ''
                    ].filter(Boolean).join(' ')
                };
            });
    }

    protected dispatchPreview(event: SelectPreviewEvent): void {
        const next = transitionSelectPreview(this.preview, event);
        this.preview = next.state;
        next.effects.forEach(effect => {
            if (effect.type === 'preview.revert') {
                const undo = this.previewUndo;
                this.previewUndo = undefined;
                undo?.();
                return;
            }
            const undo = this.highlightAction?.(effect.key);
            this.previewUndo = typeof undo === 'function' ? undo : undefined;
        });
    }

    protected previewAt(index: number): void {
        const options = this.displayOptions;
        const resolved = this.selection.resolve(options, index);
        const option = options[resolved];
        this.dispatchPreview({
            type: 'highlight.changed',
            key: option ? String(option.value) : undefined,
            previewable: !!this.highlightAction
        });
    }

    choose(index: number): void {
        const option = this.displayOptions[index];
        if (!option || option.disabled) {
            return;
        }
        this.dispatchPreview({ type: 'option.selected', key: String(option.value), closing: true });
        if (this._multiple) {
            const value = String(option.value);
            const values = new Set((this.values || []).map(String));
            const existed = values.has(value);
            existed ? values.delete(value) : values.add(value);
            this.values = [...values];
            existed ? this.removeAction?.(value) : this.selectAction?.(value);
            this.valuesAction?.(this.values);
            this.setSelectedIndex(index, false);
            return;
        }
        this.selectAction?.(option.value);
    }

    @Computed()
    get optionsJson(): string {
        return JSON.stringify(this.displayOptions);
    }

    @Computed()
    get detailLinesJson(): string {
        return this.detailLines?.length ? JSON.stringify(this.detailLines) : '';
    }

    get selectedIndexText(): string {
        return String(this.selectedIndex ?? 0);
    }

    get visibleCountText(): string {
        return String(this.visibleCount || 0);
    }

    emitKeydown(event: KeyboardEvent): void {
        this.keydownAction?.(event);
    }

    emitSelection(event: { optionIndex?: number } | undefined): void {
        const index = Number(event?.optionIndex);
        if (!Number.isInteger(index)) {
            return;
        }
        const option = this.options?.[index];
        if (!option) {
            return;
        }
        this.selectAction?.(option.value);
    }

    close(): void {
        this.open = false;
        this.closeAction?.();
    }

    onDestroy(): void {
        this.dispatchPreview({ type: 'disposed' });
    }
}
