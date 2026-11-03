import { Attribute, Component } from '@tsdi/components';

export interface ListPanelStyles {
    shell?: Record<string, string> | string;
    header?: Record<string, string> | string;
    title?: Record<string, string> | string;
    meta?: Record<string, string> | string;
    detail?: Record<string, string> | string;
    close?: Record<string, string> | string;
}

export interface CommonListItem {
    id: string;
    label: string;
    value?: string;
    selected?: string;
    style?: Record<string, string> | string;
}

/**
 * Renderer-neutral selectable list panel: close affordance, optional header /
 * context lines, listbox rows, empty state and key hint. Hosts own the data and
 * actions; console/html renderers own spacing and chrome.
 */
@Component({
    selector: 'common-list-panel',
    template: `
    <div class="console-panel common-list-panel" v-style="styles.shell" role="dialog" aria-label="{{ariaLabel}}" aria-activedescendant="{{activeOptionId}}">
        <label class="dialog-close" data-cell-width="2" v-style="styles.close" v-show="showClose" @click="close">{{closeLabel}}</label>
        <label class="common-list-header" v-style="styles.header" v-show="header">{{header}}</label>
        <label class="common-list-title" v-style="styles.title" v-show="title">{{title}}</label>
        <label class="common-list-meta" v-style="styles.meta" v-show="context">{{context}}</label>
        <label class="common-list-meta" v-style="styles.meta" v-show="meta">{{meta}}</label>
        <div role="listbox" aria-label="{{listLabel}}">
            <div id="{{item.id}}" v-style="item.style" role="option" aria-selected="{{item.selected}}" v-for="item in items" @click="selectItem(item)">{{item.label}}</div>
        </div>
        <label class="common-list-detail" v-style="styles.detail" v-for="line in detailLines">{{line}}</label>
        <label class="common-list-empty" v-style="styles.meta" v-show="empty">{{empty}}</label>
        <label class="common-list-hint" v-style="styles.meta" v-show="hint">{{hint}}</label>
        <label class="common-list-hint" v-style="styles.meta" v-show="secondaryHint">{{secondaryHint}}</label>
    </div>`
})
export class ListPanelComponent {
    @Attribute() header = '';
    @Attribute() title = '';
    @Attribute() context = '';
    @Attribute() meta = '';
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
    @Attribute() styles: ListPanelStyles = {};
    @Attribute() selectAction?: (value: string) => void;
    @Attribute() closeAction?: () => void;

    selectItem(item: CommonListItem): void {
        this.selectAction?.(item.value ?? item.id);
    }

    close(): void {
        this.closeAction?.();
    }
}
