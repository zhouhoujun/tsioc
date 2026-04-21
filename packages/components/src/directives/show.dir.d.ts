import { ElementRef } from '../refs/element';
import { Renderer } from '../renderer/Renderer';
/**
 * v-show directive.
 * Controls element visibility using CSS display property.
 *
 * @export
 * @class VShowDirective
 */
export declare class VShowDirective {
    private elementRef;
    private renderer;
    private _hidden;
    private _displayValue;
    constructor(elementRef: ElementRef, renderer: Renderer);
    set vShow(value: any);
    private updateVisibility;
    get isHidden(): boolean;
}
