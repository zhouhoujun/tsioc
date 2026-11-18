import { Attribute, Component } from '@tsdi/components';

export type DividerOrientation = 'horizontal' | 'vertical';

/**
 * Semantic separator with an optional inline label.
 *
 * Horizontal fill (`fill = true`) renders a text rule so terminal surfaces get
 * a visible line; DOM skins can replace it with a border.
 */
@Component({
    selector: 'ui-divider',
    template: `
    <div class="ui-divider {{dividerClass}}"
        role="separator" aria-orientation="{{orientation}}">
        <span class="ui-divider-rule" v-if="fill && orientation === 'horizontal'">{{rule}}</span>
        <span class="ui-divider-label" v-if="label">{{label}}</span>
    </div>`
})
export class DividerComponent {
    @Attribute() orientation: DividerOrientation = 'horizontal';
    @Attribute() label = '';
    @Attribute() className = '';
    private _fill = false;

    @Attribute()
    get fill(): boolean { return this._fill; }
    set fill(value: boolean | string) { this._fill = value === '' || value === true || value === 'true'; }

    get rule(): string {
        return '─'.repeat(12);
    }

    get dividerClass(): string {
        return [
            `is-${this.orientation}`,
            this._fill ? 'is-filled' : '',
            this.className
        ].filter(Boolean).join(' ');
    }
}
