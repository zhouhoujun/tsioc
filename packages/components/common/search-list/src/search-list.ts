import { Attribute, Component, ElementRef, noReact } from '@tsdi/components';
import { Optional } from '@tsdi/ioc';
import { markElementRefRaw } from '../../src/raw-element';
import { normalizeBoolean } from '../../src/ui';
import { SelectionCore } from '../../src/selection-core';
import { installSearchListStyles } from './search-list.styles';

/** One selectable row in a {@link SearchListComponent}. */
export interface SearchListItem {
    id: string;
    label: string;
    description?: string;
    icon?: string;
    shortcut?: string;
    /** Optional section label; rows keep their group order. */
    group?: string;
    /** Extra searchable text when the label is not enough. */
    keywords?: string;
    disabled?: boolean;
}

export interface SearchListResult {
    items: SearchListItem[];
    total?: number;
    error?: string;
}

/** Async search source; stale requests are aborted and ignored. */
export type SearchListSource = (query: string, signal: AbortSignal) => Promise<SearchListResult>;

interface SearchListRow {
    kind: 'group' | 'option';
    key: string;
    label: string;
    item?: SearchListItem;
    active: boolean;
    className: string;
}

/**
 * Renderer-neutral searchable list used by command palettes and pickers.
 *
 * The host supplies plain items (or an async `source`); the component owns the
 * query, local filtering, keyboard roving and loading/error/retry states. It
 * paints in DOM and TUI hosts alike, without owning overlay placement.
 */
@Component({
    selector: 'ui-search-list',
    template: `
    <div class="ui-search-list {{className}}">
        <input class="ui-search-list-input" type="text" role="combobox" v-if="showInput"
            aria-label="{{ariaLabel}}" aria-autocomplete="list"
            aria-expanded="{{rows.length ? 'true' : 'false'}}"
            aria-controls="{{listId}}" aria-activedescendant="{{activeDescendant}}"
            [value]="query" [placeholder]="placeholder" [disabled]="disabled"
            @input="onInput($event)" @keydown="onKeydown($event)" />
        <div class="ui-search-list-status" v-if="loadingState || error">
            <span class="ui-search-list-loading" v-if="loadingState">{{loadingLabel}}</span>
            <span class="ui-search-list-error" role="alert" v-if="error">{{error}}</span>
            <button class="ui-search-list-retry ui-plain-button" type="button"
                v-if="error && canRetry" @click="retry">{{retryLabel}}</button>
        </div>
        <div class="ui-search-list-body" role="listbox" id="{{listId}}" aria-label="{{ariaLabel}}">
            <div class="ui-search-list-row" v-for="row in rows" trackBy="key">
                <div class="ui-search-list-group-title" role="presentation"
                    v-if="row.kind === 'group'">{{row.label}}</div>
                <div class="ui-search-list-option {{row.className}}" role="option" v-else
                    id="{{listId}}-{{row.item.id}}"
                    data-item-id="{{row.item.id}}"
                    aria-selected="{{row.active}}"
                    aria-disabled="{{row.item.disabled ? 'true' : 'false'}}"
                    @click="choose(row.item)"
                    @mousemove="hover(row.item)">
                    <span class="ui-search-list-icon" v-if="row.item.icon">{{row.item.icon}}</span>
                    <span class="ui-search-list-label">{{row.label}}</span>
                    <span class="ui-search-list-description" v-if="row.item.description">{{row.item.description}}</span>
                    <span class="ui-search-list-shortcut" v-if="row.item.shortcut">{{row.item.shortcut}}</span>
                </div>
            </div>
            <div class="ui-search-list-empty" role="presentation"
                v-if="!loadingState && !error && !optionCount">{{emptyLabel}}</div>
        </div>
    </div>`
})
export class SearchListComponent {
    constructor(@Optional() protected elementRef?: ElementRef) {
        markElementRefRaw(elementRef);
        this.listId = `ui-search-list-${SearchListComponent.sequence++}`;
    }

    private static sequence = 0;

    onInit(): void {
        installSearchListStyles((this.elementRef?.nativeElement as { ownerDocument?: Document } | undefined)?.ownerDocument);
        if (this.source && this.minQueryLength === 0) {
            void this.load(this.query);
        }
    }

    @Attribute() items: SearchListItem[] = [];
    @Attribute() source?: SearchListSource;
    @Attribute() query = '';
    @Attribute() placeholder = 'Search…';
    @Attribute() emptyLabel = 'No matches';
    @Attribute() loadingLabel = 'Searching…';
    @Attribute() retryLabel = 'Retry';
    @Attribute() ariaLabel = 'Search';
    @Attribute() className = '';
    @Attribute() minChars = 0;
    @Attribute() maxVisible = 12;
    /** Controlled mode: hide the input and let the host own the query/focus. */
    @Attribute()
    get showInput(): boolean { return this._showInput; }
    set showInput(value: boolean | string) { this._showInput = normalizeBoolean(value, true); }
    /** Controlled active row; ignored when it no longer exists. */
    @Attribute() selectedId = '';
    @Attribute() recentIds: string[] = [];
    @Attribute() recentLabel = 'Recent';
    @Attribute() changeAction?: (query: string) => void;
    @Attribute() selectAction?: (item: SearchListItem) => void;
    @Attribute() activeChangeAction?: (item: SearchListItem | null) => void;
    @Attribute() closeAction?: () => void;

    readonly listId: string;
    private readonly selection = new SelectionCore();
    private _disabled = false;
    private _showInput = true;
    private _loading = false;
    private _error = '';
    private _asyncItems: SearchListItem[] = [];
    private _activeId = '';
    private requestId = 0;
    private aborter?: AbortController;

    @Attribute()
    get disabled(): boolean { return this._disabled; }
    set disabled(value: boolean | string) { this._disabled = normalizeBoolean(value); }

    get minQueryLength(): number {
        const value = Math.floor(Number(this.minChars));
        return Number.isFinite(value) && value >= 0 ? value : 0;
    }

    get visibleCount(): number {
        const value = Math.floor(Number(this.maxVisible));
        return Number.isFinite(value) && value > 0 ? value : 12;
    }

    get loadingState(): boolean {
        return this._loading;
    }

    get error(): string {
        return this._error;
    }

    get sourceItems(): SearchListItem[] {
        const items = this.source ? this._asyncItems : this.items;
        return (Array.isArray(items) ? items : []).filter(item => item && item.id != null);
    }

    get filteredItems(): SearchListItem[] {
        const text = String(this.query ?? '').trim().toLowerCase();
        if (!text) {
            return this.sourceItems.slice(0, this.visibleCount);
        }
        return this.sourceItems
            .filter(item => this.matches(item, text))
            .slice(0, this.visibleCount);
    }

    get canRetry(): boolean {
        return !!this.source;
    }

    protected get baseRows(): SearchListRow[] {
        const items = this.filteredItems;
        const rows: SearchListRow[] = [];
        const seenGroups = new Set<string>();
        const recent = new Set((Array.isArray(this.recentIds) ? this.recentIds : []).map(String));
        const showRecent = !String(this.query ?? '').trim() && recent.size > 0;
        const pushGroup = (label: string) => {
            if (!label || seenGroups.has(label)) {
                return;
            }
            seenGroups.add(label);
            rows.push({ kind: 'group', key: `group-${label}`, label, active: false, className: '' });
        };
        const pushOption = (item: SearchListItem) => rows.push({
            kind: 'option',
            key: `option-${item.id}`,
            label: item.label,
            item,
            active: false,
            className: 'ui-search-list-option-row'
        });
        const recentItems = showRecent ? items.filter(item => recent.has(String(item.id))) : [];
        if (recentItems.length) {
            pushGroup(this.recentLabel);
            recentItems.forEach(pushOption);
        }
        const rest = recentItems.length
            ? items.filter(item => !recent.has(String(item.id)))
            : items;
        rest.forEach(item => {
            pushGroup(item.group ? String(item.group) : '');
            pushOption(item);
        });
        return rows;
    }

    get rows(): SearchListRow[] {
        const active = this.activeId;
        return this.baseRows.map(row => row.kind === 'option'
            ? {
                ...row,
                active: row.item?.id === active,
                className: [
                    'ui-search-list-option-row',
                    row.item?.id === active ? 'is-active' : '',
                    row.item?.disabled ? 'is-disabled' : ''
                ].filter(Boolean).join(' ')
            }
            : row);
    }

    get optionRows(): SearchListItem[] {
        return this.baseRows.filter(row => row.kind === 'option').map(row => row.item as SearchListItem);
    }

    get optionCount(): number {
        return this.optionRows.length;
    }

    get activeId(): string {
        const options = this.optionRows;
        const preferred = String(this.selectedId ?? '') || this._activeId;
        const index = preferred ? options.findIndex(item => String(item.id) === preferred) : -1;
        const resolved = this.selection.resolve(options, index);
        return resolved >= 0 ? String(options[resolved].id) : '';
    }

    get activeItem(): SearchListItem | null {
        return this.optionRows.find(item => item.id === this.activeId) ?? null;
    }

    get activeDescendant(): string {
        return this.activeId ? `${this.listId}-${this.activeId}` : '';
    }

    onInput(event: any): void {
        const value = String(event?.target?.value ?? '');
        this.setQuery(value);
    }

    setQuery(value: string): void {
        const next = String(value ?? '');
        if (next === this.query) {
            this.changeAction?.(next);
            return;
        }
        this.query = next;
        this._activeId = '';
        this.changeAction?.(next);
        if (this.source) {
            if (next.trim().length < this.minQueryLength) {
                this._asyncItems = [];
                this._error = '';
                this._loading = false;
                return;
            }
            void this.load(next);
        }
    }

    onKeydown(event: any): void {
        const key = String(event?.key || '');
        if (key === 'ArrowDown') {
            event.preventDefault?.();
            this.move(1);
        } else if (key === 'ArrowUp') {
            event.preventDefault?.();
            this.move(-1);
        } else if (key === 'Home') {
            event.preventDefault?.();
            this.activateAt(this.selection.first(this.optionRows));
        } else if (key === 'End') {
            event.preventDefault?.();
            this.activateAt(this.selection.last(this.optionRows));
        } else if (key === 'Enter') {
            const item = this.activeItem;
            if (item) {
                event.preventDefault?.();
                this.choose(item);
            }
        } else if (key === 'Escape') {
            event.preventDefault?.();
            this.closeAction?.();
        }
    }

    move(delta: number): void {
        const options = this.optionRows;
        const current = options.findIndex(item => String(item.id) === this.activeId);
        this.activateAt(this.selection.move(options, current, delta));
    }

    activateAt(index: number): void {
        const row = this.optionRows[index];
        if (!row || row.disabled) {
            return;
        }
        this._activeId = row.id;
        this.activeChangeAction?.(row);
    }

    hover(item: SearchListItem): void {
        if (!item || item.disabled || item.id === this.activeId) {
            return;
        }
        this._activeId = item.id;
        this.activeChangeAction?.(item);
    }

    choose(item: SearchListItem): void {
        if (!item || item.disabled) {
            return;
        }
        this._activeId = item.id;
        this.selectAction?.(item);
    }

    retry(): void {
        if (this.source) {
            void this.load(this.query);
        }
    }

    async load(query: string): Promise<void> {
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
        const request = ++this.requestId;
        this._loading = true;
        this._error = '';
        try {
            const result = await source(String(query ?? ''), aborter.signal);
            if (request !== this.requestId) {
                return;
            }
            this._asyncItems = Array.isArray(result?.items) ? result.items : [];
            this._error = String(result?.error ?? '');
        } catch (error) {
            if (request !== this.requestId) {
                return;
            }
            this._asyncItems = [];
            this._error = error instanceof Error ? error.message : String(error);
        } finally {
            if (request === this.requestId) {
                this._loading = false;
            }
        }
    }

    protected matches(item: SearchListItem, query: string): boolean {
        const haystack = [
            item.label,
            item.description,
            item.group,
            item.keywords,
            item.id
        ].filter(value => value != null).join(' ').toLowerCase();
        return haystack.includes(query);
    }
}
