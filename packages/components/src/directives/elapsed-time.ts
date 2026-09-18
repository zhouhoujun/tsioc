import { Optional } from '@tsdi/ioc';
import { Attribute } from '../decorators/atteribute';
import { Directive } from '../decorators/directive';
import { ElementRef } from '../refs/element';
import { DirectiveType } from '../refs/directive';
import { Renderer } from '../renderer/Renderer';
import { AnimatedTextLifecycleService } from './animated-text';

/** Renders a Date.now()-derived elapsed label during data-driven renders. */
@Directive({
    selector: '[elapsed-time]',
    dirType: DirectiveType.Normal
})
export class ElapsedTimeDirective {
    protected _startedAt = 0;
    protected renderedSecond = -1;

    constructor(
        protected elementRef?: ElementRef,
        protected renderer?: Renderer,
        @Optional() protected lifecycle?: AnimatedTextLifecycleService
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

    onInit(): void {
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
