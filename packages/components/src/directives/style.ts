import { Directive } from '../decorators/directive';
import { Host } from '@tsdi/ioc';
import { ElementRef } from '../refs/element';
import { isObject } from '@tsdi/ioc';
import { Renderer } from '../renderer/Renderer';
import { Attribute } from '../decorators/atteribute';

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
@Directive({
    selector: '[v-style],[style]'
})
export class StyleDirective {
    constructor(
        private elementRef: ElementRef, 
        private renderer: Renderer
    ) { }

    @Attribute()
    set style(value: any) {
        if (value !== undefined) {
            this.updateStyle(value);
        }
    }

    private updateStyle(value: any) {
        const el = this.elementRef.nativeElement;        
        // 清除所有现有样式
        this.clearStyles();
        
        // 处理对象形式的style绑定
        if (isObject(value)) {
            Object.keys(value).forEach(key => {
                const styleValue = (value as any)[key];
                if (styleValue !== undefined && styleValue !== null) {
                    this.renderer.setStyle(el, this.camelToKebab(key), String(styleValue));
                }
            });
        }
        // 处理字符串形式的style绑定
        else if (typeof value === 'string') {
            this.renderer.setAttribute(el, 'style', value);
        }
        // 处理空值
        else if (value === null || value === undefined) {
            this.renderer.removeAttribute(el, 'style');
        }
    }

    private clearStyles() {
        const el = this.elementRef.nativeElement;
        this.renderer.removeAttribute(el, 'style');
    }

    private camelToKebab(camelCase: string): string {
        return camelCase.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`);
    }
}
