import { ElementRef } from '../refs/element';
import { Renderer } from '../renderer/Renderer';
/**
 * v-bind directive.
 * Dynamically binds attributes to expressions.
 *
 * @export
 * @class VBindDirective
 */
export declare class VBindDirective {
    private elementRef;
    private renderer;
    constructor(elementRef: ElementRef, renderer: Renderer);
    set vBind(value: any);
}
/**
 * v-on directive.
 * Dynamically binds event handlers.
 *
 * @export
 * @class VOnDirective
 */
export declare class VOnDirective {
    private elementRef;
    constructor(elementRef: ElementRef);
    set vOn(value: any);
}
