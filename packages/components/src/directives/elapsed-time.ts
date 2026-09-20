import { Optional } from '@tsdi/ioc';
import { Attribute } from '../decorators/atteribute';
import { Directive } from '../decorators/directive';
import { ElementRef } from '../refs/element';
import { DirectiveType } from '../refs/directive';
import { Renderer } from '../renderer/Renderer';
import { AnimationClock } from '../animation-clock';

/** Renders a Date.now()-derived elapsed label from the shared animation clock. */
@Directive({
    selector: '[elapsed-time]',
    dirType: DirectiveType.Normal
})
export class ElapsedTimeDirective {
    protected _startedAt = 0;
    protected renderedSecond = -1;
    protected enabled = true;
    protected tickActive = false;

    constructor(
        protected elementRef?: ElementRef,
        protected renderer?: Renderer,
        @Optional() protected lifecycle?: AnimationClock
    ) {
    }

    @Attribute()
    set startedAt(value: number | undefined) {
        const next = Number(value) || 0;
        if (next === this._startedAt) return;
        this._startedAt = next;
        this.renderedSecond = -1;
        this.render();
    }

    get startedAt(): number {
        return this._startedAt;
    }

    @Attribute()
    set active(value: boolean) {
        this.enabled = value !== false;
        if (this.enabled) this.startTick();
        else this.stopTick();
    }

    get active(): boolean {
        return this.enabled;
    }

    onInit(): void {
        this.render();
        this.startTick();
    }

    onDestroy(): void {
        this.stopTick();
    }

    protected listener = () => this.tick();

    protected startTick(): void {
        if (!this.enabled || this.tickActive || !this.lifecycle) return;
        this.tickActive = true;
        this.lifecycle.subscribe(this.listener);
    }

    protected stopTick(): void {
        if (!this.tickActive) return;
        this.tickActive = false;
        this.lifecycle?.unsubscribe(this.listener);
    }

    protected tick(): void {
        const element = this.elementRef?.nativeElement;
        if (!element || element.parentNode == null) {
            this.onDestroy();
            return;
        }
        this.render();
    }

    protected render(): void {
        const element = this.elementRef?.nativeElement;
        const renderer = this.renderer;
        if (!element || !renderer) return;
        const elapsedSecond = this._startedAt
            ? Math.max(0, Math.floor((Date.now() - this._startedAt) / 1000))
            : 0;
        if (elapsedSecond === this.renderedSecond) return;
        this.renderedSecond = elapsedSecond;
        const label = elapsedSecond < 60
            ? `${elapsedSecond}s`
            : `${Math.floor(elapsedSecond / 60)}m ${elapsedSecond % 60}s`;
        Array.from((element.childNodes || []) as any[]).forEach(child => renderer.removeChild(element, child));
        renderer.appendChild(element, renderer.createText(label));
    }
}
