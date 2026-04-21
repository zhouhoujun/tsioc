"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TemplateOutletDirective = void 0;
const tslib_1 = require("tslib");
const directive_1 = require("../decorators/directive");
const container_1 = require("../refs/container");
const atteribute_1 = require("../decorators/atteribute");
/**
 * v-template-outlet directive component.
 * Used to dynamically render a template in a view container.
 *
 * @export
 * @class TemplateOutletDirective
 */
let TemplateOutletDirective = class TemplateOutletDirective {
    constructor(viewContainer) {
        this.viewContainer = viewContainer;
        this._viewRef = null;
        this._templateRef = null;
        this._context = null;
    }
    /**
     * Set the template reference to render.
     * @param templateRef The template reference to render.
     */
    set templateOutlet(templateRef) {
        this._templateRef = templateRef;
        this.updateView();
    }
    /**
     * Set the context object for the template.
     * @param context The context object for the template.
     */
    set templateOutletContext(context) {
        this._context = context;
        this.updateView();
    }
    /**
     * Update the view based on current template reference and context.
     */
    updateView() {
        // Clear existing view if any
        if (this._viewRef) {
            this.viewContainer.clear();
            this._viewRef = null;
        }
        // Create new view if template reference is provided
        if (this._templateRef) {
            this._viewRef = this.viewContainer.createEmbeddedView(this._templateRef, this._context || {});
        }
    }
    onDestroy() {
        // Clean up view when directive is destroyed
        if (this._viewRef) {
            this.viewContainer.clear();
            this._viewRef = null;
        }
    }
};
exports.TemplateOutletDirective = TemplateOutletDirective;
tslib_1.__decorate([
    (0, atteribute_1.Attribute)(),
    tslib_1.__metadata("design:type", Object),
    tslib_1.__metadata("design:paramtypes", [Object])
], TemplateOutletDirective.prototype, "templateOutlet", null);
tslib_1.__decorate([
    (0, atteribute_1.Attribute)(),
    tslib_1.__metadata("design:type", Object),
    tslib_1.__metadata("design:paramtypes", [Object])
], TemplateOutletDirective.prototype, "templateOutletContext", null);
exports.TemplateOutletDirective = TemplateOutletDirective = tslib_1.__decorate([
    (0, directive_1.Directive)({
        selector: '[v-templateOutlet],[*templateOutlet]'
    }),
    tslib_1.__metadata("design:paramtypes", [container_1.ViewContainerRef])
], TemplateOutletDirective);
//# sourceMappingURL=template-outlet.dir.js.map