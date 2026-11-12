import { Attribute, Component } from '@tsdi/components';

export type StatusListTone = 'ok' | 'warn' | 'error' | 'unknown';

export interface StatusListItem {
    id?: string;
    label: string;
    status: StatusListTone;
    /** Localized state word supplied by the host. */
    statusLabel?: string;
    detail?: string;
}

/**
 * Renderer-neutral status list: title, semantic state rows and a hint. Hosts
 * own item semantics/localization; TUI and DOM renderers own the skin.
 */
@Component({
    selector: 'status-list',
    template: `
    <div class="console-panel status-list">
        <label class="status-list-title">{{title}}</label>
        <label class="status-list-row" data-status="{{item.status}}" v-for="item in items">
            <span class="status-list-status">{{item.statusLabel || item.status}}</span>
            <span class="status-list-label"> {{item.label}}</span>
            <span class="status-list-detail"> {{item.detail}}</span>
        </label>
        <label class="status-list-hint">{{hint}}</label>
    </div>`
})
export class StatusListComponent {
    @Attribute() title = '';
    @Attribute() hint = '';
    @Attribute() items: StatusListItem[] = [];
}
