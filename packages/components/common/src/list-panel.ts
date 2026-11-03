import { Attribute, Component } from '@tsdi/components';

export interface CommonListItem {
    id: string;
    label: string;
    value: string;
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
    <div class="console-panel common-list-panel" v-style="shellStyle" role="dialog" aria-label="{{ariaLabel}}" aria-activedescendant="{{activeOptionId}}">
        <label class="dialog-close" data-cell-width="2" v-style="closeStyle" v-show="showClose" @click="close">{{closeLabel}}</label>
        <label class="common-list-header" v-style="accentStyle" v-show="header">{{header}}</label>
        <label class="common-list-title" v-style="titleStyle" v-show="title">{{title}}</label>
        <label class="common-list-meta" v-style="metaStyle" v-show="context">{{context}}</label>
        <label class="common-list-meta" v-style="metaStyle" v-show="meta">{{meta}}</label>
        <div role="listbox" aria-label="{{listLabel}}">
            <div id="{{item.id}}" v-style="item.style" role="option" aria-selected="{{item.selected}}" v-for="item in items" @click="selectItem(item)">{{item.label}}</div>
        </div>
        <label class="common-list-detail" v-style="detailStyle" v-for="line in detailLines">{{line}}</label>
        <label class="common-list-empty" v-style="metaStyle" v-show="empty">{{empty}}</label>
        <label class="common-list-hint" v-style="metaStyle" v-show="hint">{{hint}}</label>
        <label class="common-list-hint" v-style="metaStyle" v-show="secondaryHint">{{secondaryHint}}</label>
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
    @Attribute() shellStyle: Record<string, string> | string = {};
    @Attribute() accentStyle: Record<string, string> | string = {};
    @Attribute() titleStyle: Record<string, string> | string = {};
    @Attribute() metaStyle: Record<string, string> | string = {};
    @Attribute() detailStyle: Record<string, string> | string = {};
    @Attribute() closeStyle: Record<string, string> | string = {};
    @Attribute() selectAction?: (value: string) => void;
    @Attribute() closeAction?: () => void;

    selectItem(item: CommonListItem): void {
        this.selectAction?.(item.value);
    }

    close(): void {
        this.closeAction?.();
    }
}
