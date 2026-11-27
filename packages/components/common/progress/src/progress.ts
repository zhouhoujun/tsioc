import { AnimationClock, Attribute, Component, OnDestroy } from '@tsdi/components';
import { Inject, Optional } from '@tsdi/ioc';
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
        v-bind="progressAttrs">
        <span class="ui-progress-label" v-if="label">{{label}}</span>
        <span class="ui-progress-bar" aria-hidden="true">{{bar}}</span>
        <span class="ui-progress-value" v-if="showValue">{{indeterminate ? '…' : percentText}}</span>
        <v-content></v-content>
    </div>`
})
export class ProgressComponent implements OnDestroy {
    constructor(@Optional() @Inject(AnimationClock) protected clock?: AnimationClock | null) {
    }

    onInit(): void {
        this.ready = true;
        this.start();
    }

    onDestroy(): void {
        this.stop();
    }

    @Attribute() label = '';
    @Attribute() ariaLabel = '';
    @Attribute() className = '';
    @Attribute() value = 0;
    @Attribute() max = 100;
    @Attribute() width = 20;
    /** Spoken label while indeterminate (host can localize). */
    @Attribute() indeterminateLabel = 'Loading';

    private _tone: UiTone = 'accent';
    private _indeterminate = false;
    private _showValue = true;
    private _reduceMotion = false;
    private _interval = 100;
    private ready = false;
    private phase = 0;
    private subscribed = false;
    private listener?: () => void;

    @Attribute()
    get tone(): UiTone { return this._tone; }
    set tone(value: string) { this._tone = normalizeTone(value, 'accent'); }

    @Attribute()
    get indeterminate(): boolean { return this._indeterminate; }
    set indeterminate(value: boolean | string) {
        const next = normalizeBoolean(value);
        if (next === this._indeterminate) {
            return;
        }
        this._indeterminate = next;
        if (this.ready) {
            next ? this.start() : this.stop();
        }
    }

    @Attribute()
    get interval(): number { return this._interval; }
    set interval(value: number | string) {
        this._interval = Math.max(16, Number(value) || 100);
    }

    @Attribute()
    get showValue(): boolean { return this._showValue; }
    set showValue(value: boolean | string) { this._showValue = normalizeBoolean(value, true); }

    /** Freeze the indeterminate sweep for `prefers-reduced-motion` hosts. */
    @Attribute()
    get reduceMotion(): boolean { return this._reduceMotion; }
    set reduceMotion(value: boolean | string) {
        const next = normalizeBoolean(value);
        if (next === this._reduceMotion) {
            return;
        }
        this._reduceMotion = next;
        if (!this.ready) {
            return;
        }
        if (next) {
            this.stop();
            this.phase = 0;
        } else if (this._indeterminate) {
            this.start();
        }
    }

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

    get progressAttrs(): Record<string, string> {
        const attrs: Record<string, string> = {
            'aria-valuemin': '0',
            'aria-valuemax': String(this.max),
            'aria-valuetext': this.indeterminate ? this.indeterminateLabel : this.percentText,
            'aria-busy': String(this.indeterminate),
            'aria-label': this.ariaLabel || this.label
        };
        if (!this.indeterminate) {
            attrs['aria-valuenow'] = String(this.value);
        }
        return attrs;
    }

    get progressClass(): string {
        return [`is-${this._tone}`, this.className].filter(Boolean).join(' ');
    }

    get bar(): string {
        const width = Math.max(4, Math.floor(Number(this.width) || 20));
        if (this.indeterminate) {
            const segment = Math.max(1, Math.min(width, Math.round(width / 3)));
            const travel = width + segment;
            const start = this.phase - segment;
            return Array.from({ length: width }, (_value, index) =>
                index >= start && index < start + segment ? '█' : '░').join('');
        }
        const filled = Math.max(0, Math.min(width, Math.round((this.percent / 100) * width)));
        return `${'█'.repeat(filled)}${'░'.repeat(width - filled)}`;
    }

    /** Advance the indeterminate sweep from a timestamp (shared clock/tests). */
    advance(now: number = Date.now()): void {
        if (!this._indeterminate || this._reduceMotion) {
            return;
        }
        const width = Math.max(4, Math.floor(Number(this.width) || 20));
        const segment = Math.max(1, Math.min(width, Math.round(width / 3)));
        const travel = width + segment;
        const next = Math.floor(now / this._interval) % travel;
        if (next !== this.phase) {
            this.phase = next;
        }
    }

    protected start(): void {
        if (!this._indeterminate || this._reduceMotion || this.subscribed || !this.clock) {
            return;
        }
        this.listener ??= () => this.advance();
        this.clock.subscribe(this.listener);
        this.subscribed = true;
        this.advance();
    }

    protected stop(): void {
        if (!this.subscribed || !this.clock || !this.listener) {
            return;
        }
        this.clock.unsubscribe(this.listener);
        this.subscribed = false;
    }
}
