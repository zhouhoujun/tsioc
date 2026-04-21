"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VOnDirective = exports.VBindDirective = void 0;
const tslib_1 = require("tslib");
const directive_1 = require("../decorators/directive");
const element_1 = require("../refs/element");
const Renderer_1 = require("../renderer/Renderer");
const directive_2 = require("../refs/directive");
const atteribute_1 = require("../decorators/atteribute");
/**
 * v-bind directive.
 * Dynamically binds attributes to expressions.
 *
 * @export
 * @class VBindDirective
 */
let VBindDirective = class VBindDirective {
    constructor(elementRef, renderer) {
        this.elementRef = elementRef;
        this.renderer = renderer;
    }
    set vBind(value) {
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
};
exports.VBindDirective = VBindDirective;
tslib_1.__decorate([
    (0, atteribute_1.Attribute)(),
    tslib_1.__metadata("design:type", Object),
    tslib_1.__metadata("design:paramtypes", [Object])
], VBindDirective.prototype, "vBind", null);
exports.VBindDirective = VBindDirective = tslib_1.__decorate([
    (0, directive_1.Directive)({
        selector: '[v-bind]',
        dirType: directive_2.DirectiveType.Normal,
        priority: 3
    }),
    tslib_1.__metadata("design:paramtypes", [element_1.ElementRef,
        Renderer_1.Renderer])
], VBindDirective);
/**
 * v-on directive.
 * Dynamically binds event handlers.
 *
 * @export
 * @class VOnDirective
 */
let VOnDirective = class VOnDirective {
    constructor(elementRef) {
        this.elementRef = elementRef;
    }
    set vOn(value) {
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
};
exports.VOnDirective = VOnDirective;
tslib_1.__decorate([
    (0, atteribute_1.Attribute)(),
    tslib_1.__metadata("design:type", Object),
    tslib_1.__metadata("design:paramtypes", [Object])
], VOnDirective.prototype, "vOn", null);
exports.VOnDirective = VOnDirective = tslib_1.__decorate([
    (0, directive_1.Directive)({
        selector: '[v-on]',
        dirType: directive_2.DirectiveType.Normal,
        priority: 4
    }),
    tslib_1.__metadata("design:paramtypes", [element_1.ElementRef])
], VOnDirective);
//# sourceMappingURL=bind.dir.js.map