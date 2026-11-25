import { AnimationClock, Attribute, Component, ElementRef, OnDestroy } from '@tsdi/components';
import { Inject, Optional } from '@tsdi/ioc';
import { normalizeBoolean, normalizeSize, UiSize } from '../../src/ui';
import { markElementRefRaw } from '../../src/raw-element';
import { installSpinnerStyles } from './spinner.styles';

/**
 * Renderer-neutral loading spinner (Ant Design Spin / MUI CircularProgress).
 *
 * Frames advance from the shared {@link AnimationClock}; the component never
 * owns a timer. Both DOM and terminal surfaces paint the same frame text, and
 * the subscription is released on destroy or while paused.
 */
@Component({
    selector: 'ui-spinner',
    template: `
    <span class="ui-spinner {{spinnerClass}}" role="status"
        aria-label="{{ariaLabel || label || 'Loading'}}" aria-live="polite">
        <span class="ui-spinner-glyph" aria-hidden="true">{{glyph}}</span>
        <span class="ui-spinner-label" v-if="label">{{label}}</span>
    </span>`
})
export class SpinnerComponent implements OnDestroy {
    constructor(
        @Optional() @Inject(AnimationClock) protected clock?: AnimationClock | null,
        @Optional() protected elementRef?: ElementRef
    ) {
        markElementRefRaw(elementRef);
    }

    onInit(): void {
        installSpinnerStyles((this.elementRef?.nativeElement as { ownerDocument?: Document } | undefined)?.ownerDocument);
        this.start();
    }

    @Attribute() label = '';
    @Attribute() ariaLabel = '';
    @Attribute() className = '';
    @Attribute() frames = '⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏';
    @Attribute() interval: number | string = 100;

    private _size: UiSize = 'md';
    private _pause = false;
    private subscribed = false;
    private listener?: () => void;
    private frameIndex = 0;

    @Attribute()
    get size(): UiSize { return this._size; }
    set size(value: string) { this._size = normalizeSize(value); }

    @Attribute()
    get pause(): boolean { return this._pause; }
    set pause(value: boolean | string) {
        const next = normalizeBoolean(value);
        if (next === this._pause) {
            return;
        }
        this._pause = next;
        if (next) {
            this.stop();
        } else {
            this.start();
        }
    }

    get spinnerClass(): string {
        return [
            `is-${this._size}`,
            this._pause ? 'is-paused' : '',
            this.className
        ].filter(Boolean).join(' ');
    }

    get frameList(): string[] {
        return Array.from(String(this.frames || ''));
    }

    get glyph(): string {
        const frames = this.frameList;
        return frames.length ? frames[this.frameIndex % frames.length] : '';
    }

    get spinInterval(): number {
        return Math.max(16, Number(this.interval) || 100);
    }

    /** Advance from a timestamp; exposed for hosts/tests with a fake clock. */
    advance(now: number = Date.now()): void {
        if (this._pause) {
            return;
        }
        const frames = this.frameList;
        if (!frames.length) {
            return;
        }
        const next = Math.floor(now / this.spinInterval) % frames.length;
        if (next !== this.frameIndex) {
            this.frameIndex = next;
        }
    }

    onDestroy(): void {
        this.stop();
    }

    protected start(): void {
        if (this._pause || this.subscribed || !this.clock) {
            return;
        }
        // The closure is created in the component's reactive scope, so frame
        // writes go through the proxy and repaint the glyph.
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
