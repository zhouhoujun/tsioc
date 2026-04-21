"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClassDirective = void 0;
const tslib_1 = require("tslib");
const ioc_1 = require("@tsdi/ioc");
const directive_1 = require("../decorators/directive");
const atteribute_1 = require("../decorators/atteribute");
const element_1 = require("../refs/element");
const Renderer_1 = require("../renderer/Renderer");
/**
 * class directive component.
 *
 * @export
 * @class ClassDirective
 */
let ClassDirective = class ClassDirective {
    constructor(elementRef, renderer) {
        this.elementRef = elementRef;
        this.renderer = renderer;
    }
    set class(value) {
        if (value !== undefined) {
            this.updateClass(value);
        }
    }
    updateClass(value) {
        const el = this.elementRef.nativeElement;
        let css;
        // 处理对象形式的class绑定
        if ((0, ioc_1.isObject)(value)) {
            css = Object.keys(value)
                .filter(key => value[key])
                .join(' ');
        }
        else if (typeof value === 'string') {
            // 处理字符串形式的class绑定
            css = value;
        }
        else if (value === null || value === undefined) {
            // 处理空值
            css = '';
        }
        else {
            // 其他类型转换为字符串
            css = String(value);
        }
        if (this.prvCss !== css) {
            this.prvCss && this.renderer.removeClass(el, this.prvCss);
            css && this.renderer.addClass(el, css);
            this.prvCss = css;
        }
    }
};
exports.ClassDirective = ClassDirective;
tslib_1.__decorate([
    (0, atteribute_1.Attribute)(),
    tslib_1.__metadata("design:type", Object),
    tslib_1.__metadata("design:paramtypes", [Object])
], ClassDirective.prototype, "class", null);
exports.ClassDirective = ClassDirective = tslib_1.__decorate([
    (0, directive_1.Directive)({
        selector: '[v-class],[class]'
    }),
    tslib_1.__metadata("design:paramtypes", [element_1.ElementRef,
        Renderer_1.Renderer])
], ClassDirective);
//# sourceMappingURL=class.js.map