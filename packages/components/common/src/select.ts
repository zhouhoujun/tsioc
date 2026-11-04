import { Attribute, Component } from '@tsdi/components';

export interface CommonSelectOption {
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
    selector: 'common-select',
    template: `
    <div class="console-panel common-select" role="dialog" aria-label="{{accessibilityLabel}}">
        <div class="select-shell">
            <label class="dialog-close" data-cell-width="2" @click="close">{{closeLabel}}</label>
            <select class="select-core"
                aria-label="{{accessibilityLabel}}"
                title="{{title}}" hint="{{hint}}" meta="{{meta}}"
                options="{{optionsJson}}"
                selectedIndex="{{selectedIndexText}}"
                visibleCount="{{visibleCountText}}"
                detailLines="{{detailLinesJson}}"
                optionClass="common-select-option"
                optionActiveClass="common-select-option is-selected"
                @keydown="emitKeydown($event)"
                @select-option="emitSelection($event)"></select>
        </div>
    </div>`
})
export class SelectComponent {
    @Attribute() options: CommonSelectOption[] = [];
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
