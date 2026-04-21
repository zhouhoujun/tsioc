"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ViewResult = exports.ViewRenderer = void 0;
const tslib_1 = require("tslib");
const ioc_1 = require("@tsdi/ioc");
const core_1 = require("@tsdi/core");
let ViewRenderer = class ViewRenderer {
};
exports.ViewRenderer = ViewRenderer;
exports.ViewRenderer = ViewRenderer = tslib_1.__decorate([
    (0, ioc_1.Abstract)()
], ViewRenderer);
/**
 * controller method return result type of view.
 * context type 'text/html'
 *
 * @export
 * @class ViewResult
 */
class ViewResult extends core_1.ResultValue {
    constructor(name, model) {
        super('text/html');
        this.name = name;
        this.model = model;
    }
    async sendValue(ctx) {
        const renderer = ctx.get(ViewRenderer);
        if (!renderer) {
            return Promise.reject('view engin middleware no configed!');
        }
        else {
            ctx.contentType = this.contentType;
            return await renderer.render(ctx, this.name, this.model);
        }
    }
}
exports.ViewResult = ViewResult;
//# sourceMappingURL=ViewResult.js.map