import { ElementRef } from '../refs/element';
import { Renderer } from '../renderer/Renderer';
/**
 * Style directive metadata.
 *
 * @export
 * @interface StyleDirectiveMetadata
 */
export interface StyleDirectiveMetadata {
    /**
     * style expression.
     *
     * @type {*}
     * @memberof StyleDirectiveMetadata
     */
    style?: any;
}
/**
 * style directive component.
 *
 * @export
 * @class StyleDirective
 */
export declare class StyleDirective {
    private elementRef;
    private renderer;
    constructor(elementRef: ElementRef, renderer: Renderer);
    set style(value: any);
    private updateStyle;
    private clearStyles;
    private camelToKebab;
}
