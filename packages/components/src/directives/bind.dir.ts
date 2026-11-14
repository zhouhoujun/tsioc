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
    /**
     * Values written by this binding. Diffing avoids rewriting every attribute
     * (and therefore every DOM mutation) when a host rerenders with an equal
     * attribute object.
     */
    private applied = new Map<string, string>();

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
            const next = new Map<string, string>();
            Object.entries(value).forEach(([key, val]) => {
                next.set(key, String(val));
            });
            this.applied.forEach((_, key) => {
                if (!next.has(key)) {
                    this.renderer.removeAttribute(el, key);
                }
            });
            next.forEach((val, key) => {
                if (this.applied.get(key) !== val) {
                    this.renderer.setAttribute(el, key, val);
                }
            });
            this.applied = next;
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
