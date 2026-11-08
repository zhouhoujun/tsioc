import { Attribute, Component } from '@tsdi/components';

export interface ListPanelItem {
    id: string;
    label: string;
    value?: string;
    selected?: string;
    className?: string;
}

/**
 * Renderer-neutral selectable list panel: close affordance, optional header /
 * context lines, listbox rows, empty state and key hint. Hosts own the data and
 * actions; console/html renderers own spacing and chrome.
 */
@Component({
    selector: 'list-panel',
    template: `
    <div class="console-panel list-panel {{panelClass}}" role="dialog" aria-label="{{ariaLabel}}" aria-activedescendant="{{activeOptionId}}">
        <label class="dialog-close" data-cell-width="2" v-show="showClose" @click="close">{{closeLabel}}</label>
        <label class="list-panel-header" v-show="header">{{header}}</label>
        <label class="list-panel-title" v-show="title">{{title}}</label>
        <label class="list-panel-meta" v-show="context">{{context}}</label>
        <label class="list-panel-meta" v-show="meta">{{meta}}</label>
        <label class="list-panel-context" v-for="line in contextLines">{{line}}</label>
        <div role="listbox" aria-label="{{listLabel}}">
            <div id="{{item.id}}" class="list-panel-item {{item.className}}" role="option" aria-selected="{{item.selected}}" v-for="item in items" @click="selectItem(item)">{{item.label}}</div>
        </div>
        <label class="list-panel-detail" v-for="line in detailLines">{{line}}</label>
        <label class="list-panel-empty" v-show="empty">{{empty}}</label>
        <label class="list-panel-hint" v-show="hint">{{hint}}</label>
        <label class="list-panel-hint" v-show="secondaryHint">{{secondaryHint}}</label>
    </div>`
})
export class ListPanelComponent {
    @Attribute() header = '';
    @Attribute() title = '';
    @Attribute() context = '';
    @Attribute() meta = '';
    @Attribute() contextLines: string[] = [];
    @Attribute() hint = '';
    @Attribute() secondaryHint = '';
    @Attribute() empty = '';
    @Attribute() ariaLabel = '';
    @Attribute() listLabel = '';
    @Attribute() activeOptionId = '';
    @Attribute() showClose = false;
    /** Host-specific card skin (e.g. the question overlay). */
    @Attribute() panelClass = '';
    @Attribute() closeLabel = '✕';
    @Attribute() items: ListPanelItem[] = [];
    @Attribute() detailLines: string[] = [];
    @Attribute() selectAction?: (value: string) => void;
    @Attribute() closeAction?: () => void;

    selectItem(item: ListPanelItem): void {
        this.selectAction?.(item.value ?? item.id);
    }

    close(): void {
        this.closeAction?.();
    }
}
