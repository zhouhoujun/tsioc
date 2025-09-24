import { isObject } from '@tsdi/ioc';
import { Directive } from '../decorators/directive';
import { Attribute } from '../decorators/atteribute';
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
@Directive({
    selector: '[v-class],[class]'
})
export class ClassDirective {

    private prvCss?: string;
    constructor(
        private elementRef: ElementRef,
        private renderer: Renderer
    ) { }

    @Attribute()
    set class(value: any) {
        if (value !== undefined) {
            this.updateClass(value);
        }
    }

    private updateClass(value: any) {
        const el = this.elementRef.nativeElement;
        let css: string;
        // 处理对象形式的class绑定
        if (isObject(value)) {
            css = Object.keys(value)
                .filter(key => (value as any)[key])
                .join(' ');

        } else if (typeof value === 'string') { 
            // 处理字符串形式的class绑定
            css = value;
        }  else if (value === null || value === undefined) {
            // 处理空值
            css = '';
        } else {
            // 其他类型转换为字符串
            css = String(value);
        }


        if (this.prvCss !== css) {
            this.prvCss && this.renderer.removeClass(el, this.prvCss);
            css && this.renderer.addClass(el, css);
            this.prvCss = css;
        }
    }
}