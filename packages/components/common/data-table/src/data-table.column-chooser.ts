import { Attribute, Component } from '@tsdi/components';
import { DataTableColumn, DataTableColumnState } from './data-table.types';
import { dataTableColumnState } from './data-table.columns';

interface ChooserItem {
    key: string;
    label: string;
    hidden: boolean;
    className: string;
}

/**
 * Column chooser for DataTable: visibility, order and reset.
 *
 * Render it in a Popover/Drawer or directly above a table. The controlled
 * table receives `columnOrder`/`hiddenColumns`/`columnWidths`, and this chooser
 * emits the same `DataTableColumnState` through `changeAction`.
 */
@Component({
    selector: 'ui-data-table-columns',
    template: `
    <div class="ui-data-table-columns {{className}}" role="group" aria-label="{{title}}">
        <div class="ui-data-table-columns-title">{{title}}</div>
        <div class="{{item.className}}" v-for="item in items" trackBy="key">
            <span class="ui-data-table-columns-check" role="checkbox" tabindex="0" focusable="true"
                aria-checked="{{!item.hidden}}" aria-label="{{item.label}}"
                @click="toggle(item.key)" @keydown="checkKeydown($event, item.key)">{{item.hidden ? ' ' : '✓'}}</span>
            <span class="ui-data-table-columns-label">{{item.label}}</span>
            <button class="ui-data-table-columns-move" type="button" aria-label="{{moveUpLabel}}"
                @click="move(item.key, -1)">↑</button>
            <button class="ui-data-table-columns-move" type="button" aria-label="{{moveDownLabel}}"
                @click="move(item.key, 1)">↓</button>
        </div>
        <button class="ui-data-table-columns-reset" type="button" @click="reset">{{resetLabel}}</button>
    </div>`
})
export class DataTableColumnChooserComponent {
    @Attribute() columns: DataTableColumn[] = [];
    @Attribute() hiddenColumns: string[] = [];
    @Attribute() columnOrder: string[] = [];
    @Attribute() columnWidths: Record<string, number> = {};
    @Attribute() title = 'Columns';
    @Attribute() resetLabel = 'Reset';
    @Attribute() moveUpLabel = 'Move up';
    @Attribute() moveDownLabel = 'Move down';
    @Attribute() className = '';
    @Attribute() changeAction?: (state: DataTableColumnState) => void;

    get items(): ChooserItem[] {
        const hidden = new Set((this.hiddenColumns || []).map(String));
        const keys = this.effectiveOrder();
        const byKey = new Map((this.columns || []).map(column => [String(column.key), column]));
        return keys.map(key => {
            const column = byKey.get(key);
            return {
                key,
                label: String(column?.label ?? key),
                hidden: hidden.has(key),
                className: ['ui-data-table-columns-row', hidden.has(key) ? 'is-hidden' : ''].filter(Boolean).join(' ')
            };
        }).filter(item => !!item.key);
    }

    protected effectiveOrder(): string[] {
        const all = (this.columns || []).map(column => String(column.key));
        const order = (this.columnOrder || []).map(String).filter(key => all.includes(key));
        return [...order, ...all.filter(key => !order.includes(key))];
    }

    toggle(key: string, event?: Event): void {
        event?.stopPropagation?.();
        const hidden = new Set((this.hiddenColumns || []).map(String));
        hidden.has(key) ? hidden.delete(key) : hidden.add(key);
        this.hiddenColumns = [...hidden];
        this.emit();
    }

    checkKeydown(event: any, key: string): void {
        if (event?.key === 'Enter' || event?.key === ' ' || event?.key === 'Spacebar') {
            event.preventDefault?.();
            this.toggle(key, event);
        }
    }

    move(key: string, delta: number): void {
        const order = this.effectiveOrder();
        const index = order.indexOf(key);
        const target = index + delta;
        if (index < 0 || target < 0 || target >= order.length) {
            return;
        }
        [order[index], order[target]] = [order[target], order[index]];
        this.columnOrder = order;
        this.emit();
    }

    reset(): void {
        this.columnOrder = [];
        this.hiddenColumns = [];
        this.columnWidths = {};
        this.emit();
    }

    get state(): DataTableColumnState {
        return dataTableColumnState(this.columns, this.columnOrder, this.hiddenColumns, this.columnWidths);
    }

    protected emit(): void {
        this.changeAction?.(this.state);
    }
}
