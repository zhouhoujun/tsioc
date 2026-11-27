import { Attribute, Component } from '@tsdi/components';
import { normalizeTone, UiTone } from '../../src/ui';

export type StatTrend = 'up' | 'down' | 'flat';

/**
 * Compact metric tile (label + value + hint/trend), used by dashboards and
 * inspector summaries.
 */
@Component({
    selector: 'ui-stat',
    template: `
    <div class="console-panel ui-stat {{statClass}}" data-tone="{{tone}}" role="group" aria-label="{{ariaLabel || label}}">
        <span class="ui-stat-label" v-if="label">{{label}}</span>
        <span class="ui-stat-value">{{value}}</span>
        <span class="ui-stat-hint" v-if="hint">{{hint}}</span>
        <span class="ui-stat-trend is-{{trend}}" v-if="trendLabel" data-trend="{{trend}}">{{trendLabel}}</span>
    </div>`
})
export class StatComponent {
    @Attribute() label = '';
    @Attribute() ariaLabel = '';
    @Attribute() value: string | number = '';
    @Attribute() hint = '';
    @Attribute() trend: StatTrend = 'flat';
    @Attribute() trendLabel = '';
    @Attribute() className = '';

    private _tone: UiTone = 'default';

    @Attribute()
    get tone(): UiTone { return this._tone; }
    set tone(value: string) { this._tone = normalizeTone(value); }

    get statClass(): string {
        return [`is-${this._tone}`, this.className].filter(Boolean).join(' ');
    }
}
