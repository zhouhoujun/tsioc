import { Attribute, Component, Computed } from '@tsdi/components';
import { clampSelectIndex, resolveSelectWindow } from '../../src/input';
import { nextUiId } from '../../src/ui';
import { SelectionCore } from '../../src/selection-core';
import { getDisplayWidth } from '../../src/display-width';

export interface SelectOption {
    label: string;
    value: string;
    description?: string;
    disabled?: boolean;
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
            <label class="dialog-close" data-cell-width="2" @click="close">{{closeLabel}}</label>
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
            <label class="select-title" v-if="title">{{title}}</label>
            <label class="select-meta" v-if="meta">{{meta}}</label>
            <div class="select-rows" role="listbox" id="{{listId}}" aria-label="{{ariaLabel}}"
                aria-activedescendant="{{activeDescendant}}" tabindex="0" focusable="true"
                [style]="scrollStyle" @keydown="onListboxKeydown($event)">
                <label class="{{option.className}}" role="option" id="{{optionId(option.index)}}"
                    aria-selected="{{option.selected}}" aria-disabled="{{option.disabled}}"
                    v-for="option in visibleOptions" trackBy="index" @click="choose(option.index)">
                    <span class="select-option-label">{{option.label}}</span><span class="select-option-description" v-if="option.description">{{option.description}}</span>
                </label>
                <label class="select-empty" v-if="emptyText && !visibleOptions.length">{{emptyText}}</label>
                <label class="select-detail" v-for="line in detailLines" v-if="detailLines && detailLines.length">{{line}}</label>
            </div>
            <label class="select-hint" v-if="hint">{{hint}}</label>
        </div>
    </div>`
})
export class SelectComponent {
    readonly listId = nextUiId('ui-select-list');
    private readonly selection = new SelectionCore();

    @Attribute() options: SelectOption[] = [];
    @Attribute() selectedIndex = 0;
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
    @Attribute() closeAction?: () => void;
    @Attribute() keydownAction?: (event: KeyboardEvent) => void;

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

    get activeIndex(): number {
        return clampSelectIndex(Array.isArray(this.options) ? this.options.length : 0, Number(this.selectedIndex));
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
            const next = this.selection.move(this.options || [], this.activeIndex, key === 'ArrowDown' ? 1 : -1);
            if (next >= 0) {
                this.selectedIndex = next;
            }
            return;
        }
        if (key === 'Home' || key === 'End') {
            event.preventDefault?.();
            const next = key === 'Home'
                ? this.selection.first(this.options || [])
                : this.selection.last(this.options || []);
            if (next >= 0) {
                this.selectedIndex = next;
            }
            return;
        }
        if (key === 'Enter' || key === ' ' || key === 'Spacebar') {
            event.preventDefault?.();
            this.choose(this.activeIndex);
        }
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
    get visibleOptions(): Array<{ index: number; label: string; value: string; description: string; selected: boolean; disabled: boolean; className: string }> {
        const options = Array.isArray(this.options) ? this.options : [];
        const selected = clampSelectIndex(options.length, Number(this.selectedIndex));
        const window = resolveSelectWindow(options.length, selected, Number(this.visibleCount) || options.length || 1);
        return options
            .slice(window.start, window.start + window.count)
            .map((option, offset) => {
                const index = window.start + offset;
                const isSelected = index === selected;
                return {
                    index,
                    label: String(option?.label ?? ''),
                    value: String(option?.value ?? ''),
                    description: String((option as { description?: string })?.description ?? ''),
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

    choose(index: number): void {
        const option = (this.options || [])[index];
        if (!option || option.disabled) {
            return;
        }
        this.selectAction?.(option.value);
    }

    @Computed()
    get optionsJson(): string {
        return JSON.stringify(this.options || []);
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
        this.closeAction?.();
    }
}
