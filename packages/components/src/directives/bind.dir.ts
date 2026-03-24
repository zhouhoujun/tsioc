import { Directive } from '../decorators/directive';
import { ElementRef } from '../refs/element';
import { Renderer } from '../renderer/Renderer';
import { DirectiveType } from '../refs/directive';
import { Attribute } from '../decorators/atteribute';

/**
 * v-bind directive.
 * Dynamically binds attributes to expressions.
 *
 * @export
 * @class VBindDirective
 */
@Directive({
    selector: '[v-bind]',
    dirType: DirectiveType.Normal,
    priority: 3
})
export class VBindDirective {
    constructor(
        private elementRef: ElementRef,
        private renderer: Renderer
    ) { }

    @Attribute()
    set vBind(value: any) {
        const el = this.elementRef.nativeElement;
        
        if (value === null || value === undefined) {
            return;
        }

        if (typeof value === 'object') {
            Object.entries(value).forEach(([key, val]) => {
                this.renderer.setAttribute(el, key, String(val));
            });
        }
    }
}

/**
 * v-on directive.
 * Dynamically binds event handlers.
 *
 * @export
 * @class VOnDirective
 */
@Directive({
    selector: '[v-on]',
    dirType: DirectiveType.Normal,
    priority: 4
})
export class VOnDirective {
    constructor(
        private elementRef: ElementRef
    ) { }

    @Attribute()
    set vOn(value: any) {
        const el = this.elementRef.nativeElement;
        
        if (value === null || value === undefined) {
            return;
        }

        if (typeof value === 'object') {
            Object.entries(value).forEach(([eventName, handler]) => {
                if (typeof handler === 'function') {
                    el.addEventListener(eventName, handler);
                }
            });
        }
    }
}
