import { Attribute, Component } from '@tsdi/components';
import { normalizeBoolean, normalizeTone, UiTone } from '../../src/ui';

/**
 * Renderer-neutral progress indicator.
 *
 * The bar uses block characters so terminal hosts get a useful rendering; DOM
 * hosts can style `.ui-progress-bar` over the same text or hide it in favour of
 * the semantic `role="progressbar"` attributes.
 */
@Component({
    selector: 'ui-progress',
    template: `
    <div class="ui-progress {{progressClass}}"
        data-tone="{{tone}}"
        data-percent="{{percent}}"
        data-indeterminate="{{indeterminate}}"
        role="progressbar"
        aria-valuemin="0"
        aria-valuemax="{{max}}"
        aria-valuenow="{{indeterminate ? '' : value}}"
        aria-label="{{ariaLabel || label}}">
        <span class="ui-progress-label" v-if="label">{{label}}</span>
        <span class="ui-progress-bar" aria-hidden="true">{{bar}}</span>
        <span class="ui-progress-value" v-if="showValue">{{indeterminate ? '…' : percentText}}</span>
        <v-content></v-content>
    </div>`
})
export class ProgressComponent {
    @Attribute() label = '';
    @Attribute() ariaLabel = '';
    @Attribute() className = '';
    @Attribute() value = 0;
    @Attribute() max = 100;
    @Attribute() width = 20;

    private _tone: UiTone = 'accent';
    private _indeterminate = false;
    private _showValue = true;

    @Attribute()
    get tone(): UiTone { return this._tone; }
    set tone(value: string) { this._tone = normalizeTone(value, 'accent'); }

    @Attribute()
    get indeterminate(): boolean { return this._indeterminate; }
    set indeterminate(value: boolean | string) { this._indeterminate = normalizeBoolean(value); }

    @Attribute()
    get showValue(): boolean { return this._showValue; }
    set showValue(value: boolean | string) { this._showValue = normalizeBoolean(value, true); }

    get total(): number {
        const total = Number(this.max);
        return Number.isFinite(total) && total > 0 ? total : 100;
    }

    get percent(): number {
        if (this.indeterminate) {
            return 0;
        }
        const value = Number(this.value);
        if (!Number.isFinite(value)) {
            return 0;
        }
        return Math.max(0, Math.min(100, Math.round((value / this.total) * 100)));
    }

    get percentText(): string {
        return `${this.percent}%`;
    }

    get progressClass(): string {
        return [`is-${this._tone}`, this.className].filter(Boolean).join(' ');
    }

    get bar(): string {
        const width = Math.max(4, Math.floor(Number(this.width) || 20));
        if (this.indeterminate) {
            return `${'░'.repeat(width)}`;
        }
        const filled = Math.max(0, Math.min(width, Math.round((this.percent / 100) * width)));
        return `${'█'.repeat(filled)}${'░'.repeat(width - filled)}`;
    }
}
