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
    selector: 'keymap-panel',
    template: `
    <div class="console-panel keymap-panel">
        <label class="keymap-title">{{title}}</label>
        <template v-if="grouped">
            <template v-for="group in groups">
                <label class="keymap-group">{{group.label}}</label>
                <label class="keymap-row" v-for="binding in group.items">
                    <span class="keymap-key">{{binding.key}}</span>
                    <span class="keymap-action"> {{binding.label || binding.action}}</span>
                </label>
            </template>
        </template>
        <template v-else>
            <label class="keymap-row" v-for="binding in items">
                <span class="keymap-key">{{binding.key}}</span>
                <span class="keymap-action"> {{binding.label || binding.action}}</span>
            </label>
        </template>
        <label class="keymap-hint">{{hint}}</label>
    </div>`
})
export class KeymapPanelComponent {
    @Attribute() title = '';
    @Attribute() hint = '';
    @Attribute() grouped = false;
    @Attribute() items: KeymapItem[] = [];
    @Attribute() groups: KeymapGroup[] = [];
}
