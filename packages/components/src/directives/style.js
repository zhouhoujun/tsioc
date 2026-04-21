"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StyleDirective = void 0;
const tslib_1 = require("tslib");
const directive_1 = require("../decorators/directive");
const element_1 = require("../refs/element");
const ioc_1 = require("@tsdi/ioc");
const Renderer_1 = require("../renderer/Renderer");
/**
 * style directive component.
 *
 * @export
 * @class StyleDirective
 */
let StyleDirective = class StyleDirective {
    constructor(elementRef, renderer) {
        this.elementRef = elementRef;
        this.renderer = renderer;
    }
    set style(value) {
        if (value !== undefined) {
            this.updateStyle(value);
        }
    }
    updateStyle(value) {
        const el = this.elementRef.nativeElement;
        // 清除所有现有样式
        this.clearStyles();
        // 处理对象形式的style绑定
        if ((0, ioc_1.isObject)(value)) {
            Object.keys(value).forEach(key => {
                const styleValue = value[key];
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
    clearStyles() {
        const el = this.elementRef.nativeElement;
        this.renderer.removeAttribute(el, 'style');
    }
    camelToKebab(camelCase) {
        return camelCase.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`);
    }
};
exports.StyleDirective = StyleDirective;
exports.StyleDirective = StyleDirective = tslib_1.__decorate([
    (0, directive_1.Directive)({
        selector: '[v-style],[style]'
    }),
    tslib_1.__metadata("design:paramtypes", [element_1.ElementRef,
        Renderer_1.Renderer])
], StyleDirective);
//# sourceMappingURL=style.js.map