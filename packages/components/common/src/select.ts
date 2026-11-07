import { Attribute, Component } from '@tsdi/components';
import { clampSelectIndex, resolveSelectWindow } from './input';

export interface SelectOption {
    label: string;
    value: string;
    description?: string;
}

/**
 * Renderer-neutral select/list shell shared by the TUI and web console.
 * Hosts provide the options, window and styles; the console/html renderer own
 * how `<select>` is painted and how pointer rows are hit-tested.
 */
@Component({
    selector: 'select-list',
    template: `
    <div class="console-panel select-list" role="dialog" aria-label="{{accessibilityLabel}}">
        <div class="select-shell">
            <label class="dialog-close" data-cell-width="2" @click="close">{{closeLabel}}</label>
            <select class="select-core"
                aria-label="{{accessibilityLabel}}"
                title="{{title}}" hint="{{hint}}" meta="{{meta}}"
                options="{{optionsJson}}"
                selectedIndex="{{selectedIndexText}}"
                visibleCount="{{visibleCountText}}"
                detailLines="{{detailLinesJson}}"
                optionClass="select-option"
                optionActiveClass="select-option is-selected"
                @keydown="emitKeydown($event)"
                @select-option="emitSelection($event)"></select>
            <div class="select-rows" role="listbox" aria-label="{{accessibilityLabel}}">
                <label class="select-title" v-if="title">{{title}}</label>
                <label class="select-meta" v-if="meta">{{meta}}</label>
                <label class="{{option.className}}" role="option" aria-selected="{{option.selected}}" v-for="option in visibleOptions" @click="choose(option.index)">
                    <span class="select-option-label">{{option.label}}</span><span class="select-option-description" v-if="option.description">{{option.description}}</span>
                </label>
                <label class="select-detail" v-for="line in detailLines" v-if="detailLines && detailLines.length">{{line}}</label>
                <label class="select-hint" v-if="hint">{{hint}}</label>
            </div>
        </div>
    </div>`
})
export class SelectComponent {
    @Attribute() options: SelectOption[] = [];
    @Attribute() selectedIndex = 0;
    @Attribute() visibleCount = 0;
    @Attribute() title = '';
    @Attribute() hint = '';
    @Attribute() meta = '';
    @Attribute() detailLines: string[] = [];
    @Attribute() accessibilityLabel = 'Selection menu';
    @Attribute() closeLabel = '✕';
    @Attribute() selectAction?: (value: string) => void;
    @Attribute() closeAction?: () => void;
    @Attribute() keydownAction?: (event: KeyboardEvent) => void;

    /** Windowed rows for renderers that paint real elements (browser). */
    get visibleOptions(): Array<{ index: number; label: string; value: string; description: string; selected: boolean; className: string }> {
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
                    className: isSelected ? 'select-option is-selected' : 'select-option'
                };
            });
    }

    choose(index: number): void {
        const option = (this.options || [])[index];
        if (!option) {
            return;
        }
        this.selectAction?.(option.value);
    }

    get optionsJson(): string {
        return JSON.stringify(this.options || []);
    }

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
