import { ElementRef } from '../refs/element';
import { Renderer } from '../renderer/Renderer';
/**
 * Css class directive metadata.
 *
 * @export
 * @interface ClassDirectiveMetadata
 */
export interface ClassDirectiveMetadata {
    /**
     * class expression.
     *
     * @type {*}
     * @memberof ClassDirectiveMetadata
     */
    class?: any;
}
/**
 * class directive component.
 *
 * @export
 * @class ClassDirective
 */
export declare class ClassDirective {
    private elementRef;
    private renderer;
    private prvCss?;
    constructor(elementRef: ElementRef, renderer: Renderer);
    set class(value: any);
    private updateClass;
}
