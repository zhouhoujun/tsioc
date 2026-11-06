import { Directive } from '../decorators/directive';
import { ElementRef } from '../refs/element';
import { Renderer } from '../renderer/Renderer';
import { DirectiveType } from '../refs/directive';
import { Attribute } from '../decorators/atteribute';

/**
 * v-show directive.
 * Controls element visibility using CSS display property.
 *
 * @export
 * @class VShowDirective
 */
@Directive({
    selector: '[v-show]',
    dirType: DirectiveType.Normal,
    priority: 5
})
export class VShowDirective {
    private _hidden = false;

    constructor(
        private elementRef: ElementRef,
        private renderer: Renderer
    ) { }

    @Attribute()
    set vShow(value: any) {
        const visible = !!value;
        this.updateVisibility(visible);
    }

    private updateVisibility(visible: boolean) {
        const el = this.elementRef.nativeElement;
        // Toggle a semantic class instead of writing an inline `display` style.
        // Browser and TUI stylesheets both define `.is-hidden`, so hidden
        // elements no longer mix generated `style` attributes with class CSS.
        if (!visible) {
            this.renderer.addClass(el, 'is-hidden');
            this.renderer.setAttribute(el, 'hidden', '');
            this._hidden = true;
        } else {
            this.renderer.removeClass(el, 'is-hidden');
            this.renderer.removeAttribute(el, 'hidden');
            this._hidden = false;
        }
    }

    get isHidden(): boolean {
        return this._hidden;
    }
}
