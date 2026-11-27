import { Attribute, Component } from '@tsdi/components';

export interface KeymapItem {
    key: string;
    action: string;
    label?: string;
}

export interface KeymapGroup {
    label: string;
    items: KeymapItem[];
}

/**
 * Renderer-neutral keymap overlay. Hosts own key binding semantics, grouping
 * and labels; TUI and DOM renderers own the skin. This keeps keyboard-help
 * chrome out of business components.
 */
@Component({
    selector: 'keymap-panel, ui-keymap-panel',
    template: `
    <div class="console-panel keymap-panel" role="region" aria-label="{{ariaLabel || title}}">
        <label class="keymap-title">{{title}}</label>
        <div class="keymap-body" [style]="scrollStyle">
        <div class="keymap-group-block" v-if="grouped" v-for="group in groups">
            <label class="keymap-group">{{group.label}}</label>
            <label class="keymap-row" v-for="binding in group.items">
                <span class="keymap-key">{{binding.key}}</span>
                <span class="keymap-action"> {{binding.label || binding.action}}</span>
            </label>
        </div>
        <label class="keymap-row" v-if="!grouped" v-for="binding in items">
            <span class="keymap-key">{{binding.key}}</span>
            <span class="keymap-action"> {{binding.label || binding.action}}</span>
        </label>
        </div>
        <label class="keymap-hint">{{hint}}</label>
    </div>`
})
export class KeymapPanelComponent {
    @Attribute() title = '';
    @Attribute() ariaLabel = '';
    @Attribute() hint = '';
    @Attribute() grouped = false;
    @Attribute() items: KeymapItem[] = [];
    @Attribute() groups: KeymapGroup[] = [];
    /** Viewport guard for long keymaps; empty disables the scroll box. */
    @Attribute() maxHeight = '60vh';

    get scrollStyle(): Record<string, string> {
        return this.maxHeight
            ? {
                'max-height': String(this.maxHeight),
                'overflow-y': 'auto',
                'overscroll-behavior': 'contain'
            }
            : {};
    }
}
