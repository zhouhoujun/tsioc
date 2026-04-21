"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VShowDirective = void 0;
const tslib_1 = require("tslib");
const directive_1 = require("../decorators/directive");
const element_1 = require("../refs/element");
const Renderer_1 = require("../renderer/Renderer");
const directive_2 = require("../refs/directive");
const atteribute_1 = require("../decorators/atteribute");
/**
 * v-show directive.
 * Controls element visibility using CSS display property.
 *
 * @export
 * @class VShowDirective
 */
let VShowDirective = class VShowDirective {
    constructor(elementRef, renderer) {
        this.elementRef = elementRef;
        this.renderer = renderer;
        this._hidden = false;
        this._displayValue = '';
    }
    set vShow(value) {
        const visible = !!value;
        this.updateVisibility(visible);
    }
    updateVisibility(visible) {
        const el = this.elementRef.nativeElement;
        if (!visible) {
            if (!this._displayValue) {
                const style = el.getAttribute('style');
                if (style) {
                    const displayMatch = style.match(/display\s*:\s*([^;]+)/);
                    if (displayMatch) {
                        this._displayValue = displayMatch[1].trim();
                    }
                }
            }
            this.renderer.setStyle(el, 'display', 'none');
            this._hidden = true;
        }
        else {
            this.renderer.setStyle(el, 'display', this._displayValue || '');
            this._hidden = false;
        }
    }
    get isHidden() {
        return this._hidden;
    }
};
exports.VShowDirective = VShowDirective;
tslib_1.__decorate([
    (0, atteribute_1.Attribute)(),
    tslib_1.__metadata("design:type", Object),
    tslib_1.__metadata("design:paramtypes", [Object])
], VShowDirective.prototype, "vShow", null);
exports.VShowDirective = VShowDirective = tslib_1.__decorate([
    (0, directive_1.Directive)({
        selector: '[v-show]',
        dirType: directive_2.DirectiveType.Normal,
        priority: 5
    }),
    tslib_1.__metadata("design:paramtypes", [element_1.ElementRef,
        Renderer_1.Renderer])
], VShowDirective);
//# sourceMappingURL=show.dir.js.map