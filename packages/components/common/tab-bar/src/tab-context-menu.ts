import { Attribute, Component } from '@tsdi/components';

export interface TabContextAction {
    id: string;
    label: string;
    disabled?: boolean;
    danger?: boolean;
}

/**
 * Built-in tab context menu. Hosts render it from `TabBar.contextAction` and
 * pass the tab id; terminal and browser share the same action list.
 */
@Component({
    selector: 'ui-tab-context-menu',
    template: `
    <span class="tab-context-menu {{className}}" role="menu" aria-label="{{ariaLabel}}"
        v-if="visible" [style]="menuStyle" @keydown="onKeydown($event)">
        <button class="tab-context-item {{item.danger ? 'is-danger' : ''}}" type="button" role="menuitem"
            v-for="item in actions" trackBy="id" [disabled]="item.disabled || false"
            @click="run(item, $event)">{{item.label}}</button>
    </span>`
})
export class TabContextMenuComponent {
    @Attribute() visible = false;
    @Attribute() ariaLabel = 'Tab actions';
    @Attribute() className = '';
    @Attribute() x = 0;
    @Attribute() y = 0;
    @Attribute() tabId = '';
    @Attribute() actions: TabContextAction[] = [
        { id: 'close', label: 'Close' },
        { id: 'closeOthers', label: 'Close others' },
        { id: 'closeRight', label: 'Close right' }
    ];
    @Attribute() actionAction?: (action: string, tabId: string) => void;
    @Attribute() closeAction?: () => void;

    get menuStyle(): Record<string, string> {
        return {
            position: 'fixed',
            left: `${Math.max(8, Math.floor(Number(this.x) || 0))}px`,
            top: `${Math.max(8, Math.floor(Number(this.y) || 0))}px`,
            'z-index': '50'
        };
    }

    run(item: TabContextAction, event?: Event): void {
        event?.stopPropagation?.();
        if (!item || item.disabled) { return; }
        this.actionAction?.(item.id, this.tabId);
        this.closeAction?.();
    }

    onKeydown(event: any): void {
        const key = String(event?.key || '');
        if (key === 'Escape') {
            event.preventDefault?.();
            this.closeAction?.();
            return;
        }
        if (key !== 'ArrowDown' && key !== 'ArrowUp' && key !== 'Home' && key !== 'End') {
            return;
        }
        const root = (event?.currentTarget || event?.target) as HTMLElement | undefined;
        const buttons = Array.from(root?.querySelectorAll?.('.tab-context-item:not(:disabled)') || []) as HTMLElement[];
        if (!buttons.length) { return; }
        event.preventDefault?.();
        const active = root?.ownerDocument?.activeElement as HTMLElement | undefined;
        const index = buttons.indexOf(active as HTMLElement);
        const target = key === 'Home' ? 0
            : key === 'End' ? buttons.length - 1
                : ((index < 0 ? 0 : index) + (key === 'ArrowDown' ? 1 : -1) + buttons.length) % buttons.length;
        buttons[target]?.focus?.();
    }
}
