import { Attribute, Component } from '@tsdi/components';

export interface CommonListItem {
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
    selector: 'common-list-panel',
    template: `
    <div class="console-panel common-list-panel" role="dialog" aria-label="{{ariaLabel}}" aria-activedescendant="{{activeOptionId}}">
        <label class="dialog-close" data-cell-width="2" v-show="showClose" @click="close">{{closeLabel}}</label>
        <label class="common-list-header" v-show="header">{{header}}</label>
        <label class="common-list-title" v-show="title">{{title}}</label>
        <label class="common-list-meta" v-show="context">{{context}}</label>
        <label class="common-list-meta" v-show="meta">{{meta}}</label>
        <label class="common-list-context" v-for="line in contextLines">{{line}}</label>
        <div role="listbox" aria-label="{{listLabel}}">
            <div id="{{item.id}}" class="common-list-item {{item.className}}" role="option" aria-selected="{{item.selected}}" v-for="item in items" @click="selectItem(item)">{{item.label}}</div>
        </div>
        <label class="common-list-detail" v-for="line in detailLines">{{line}}</label>
        <label class="common-list-empty" v-show="empty">{{empty}}</label>
        <label class="common-list-hint" v-show="hint">{{hint}}</label>
        <label class="common-list-hint" v-show="secondaryHint">{{secondaryHint}}</label>
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
    @Attribute() closeLabel = '✕';
    @Attribute() items: CommonListItem[] = [];
    @Attribute() detailLines: string[] = [];
    @Attribute() selectAction?: (value: string) => void;
    @Attribute() closeAction?: () => void;

    selectItem(item: CommonListItem): void {
        this.selectAction?.(item.value ?? item.id);
    }

    close(): void {
        this.closeAction?.();
    }
}
