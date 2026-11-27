import { Attribute, Component, ElementRef, OnDestroy, ViewChild } from '@tsdi/components';
import { Optional } from '@tsdi/ioc';
import { bindSelectionPanel } from '../../src/selection-panel';
import { DataTableColumn, DataTableColumnState } from './data-table.types';
import { DataTableColumnChooserComponent } from './data-table.column-chooser';
import { installDataTableColumnsButtonStyles } from './data-table.columns-button.styles';

/**
 * Column chooser trigger for table headers.
 *
 * The controlled table owns the layout; this button only hosts the shared
 * chooser, handles outside/Escape dismissal and forwards the new state.
 */
@Component({
    selector: 'ui-data-table-columns-button',
    imports: [DataTableColumnChooserComponent],
    template: `
    <div class="ui-data-table-columns-button {{className}}">
        <button class="ui-data-table-columns-trigger" type="button"
            aria-haspopup="true" aria-expanded="{{open ? 'true' : 'false'}}"
            aria-label="{{label}}" @click="toggle()">{{label}}</button>
        <div class="ui-data-table-columns-panel" v-if="open">
            <ui-data-table-columns :columns="columns" :hiddenColumns="hiddenColumns"
                :columnOrder="columnOrder" :columnWidths="columnWidths"
                :title="title" :resetLabel="resetLabel" :moveUpLabel="moveUpLabel"
                :moveDownLabel="moveDownLabel" :changeAction="change"></ui-data-table-columns>
        </div>
    </div>`
})
export class DataTableColumnsButtonComponent implements OnDestroy {
    constructor(@Optional() protected elementRef?: ElementRef) { }

    @ViewChild(DataTableColumnChooserComponent) chooser?: DataTableColumnChooserComponent;

    @Attribute() columns: DataTableColumn[] = [];
    @Attribute() hiddenColumns: string[] = [];
    @Attribute() columnOrder: string[] = [];
    @Attribute() columnWidths: Record<string, number> = {};
    @Attribute() label = 'Columns';
    @Attribute() title = 'Columns';
    @Attribute() resetLabel = 'Reset';
    @Attribute() moveUpLabel = 'Move up';
    @Attribute() moveDownLabel = 'Move down';
    @Attribute() className = '';
    @Attribute() changeAction?: (state: DataTableColumnState) => void;

    open = false;
    protected releasePanel?: () => void;

    onInit(): void {
        installDataTableColumnsButtonStyles((this.elementRef?.nativeElement as { ownerDocument?: Document } | undefined)?.ownerDocument);
    }

    onDestroy(): void {
        this.releasePanel?.();
    }

    toggle(): void {
        this.open ? this.close() : this.bind();
    }

    close(): void {
        this.releasePanel?.();
        this.releasePanel = undefined;
        this.open = false;
    }

    readonly change = (state: DataTableColumnState): void => {
        this.changeAction?.(state);
    };

    protected bind(): void {
        this.open = true;
        void Promise.resolve().then(() => {
            if (!this.open) {
                return;
            }
            const host = this.elementRef?.nativeElement as any;
            this.releasePanel = bindSelectionPanel(host?.ownerDocument, {
                anchor: host,
                close: () => this.close()
            });
        });
    }
}
