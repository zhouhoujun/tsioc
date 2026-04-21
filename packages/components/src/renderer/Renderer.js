"use strict";
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.Renderer = exports.RendererStyleFlags2 = void 0;
const tslib_1 = require("tslib");
const ioc_1 = require("@tsdi/ioc");
const effect_1 = require("../effect");
/**
 * Flags for renderer-specific style modifiers.
 * @publicApi
 */
var RendererStyleFlags2;
(function (RendererStyleFlags2) {
    // TODO(misko): This needs to be refactored into a separate file so that it can be imported from
    // `node_manipulation.ts` Currently doing the import cause resolution order to change and fails
    // the tests. The work around is to have hard coded value in `node_manipulation.ts` for now.
    /**
     * Marks a style as important.
     */
    RendererStyleFlags2[RendererStyleFlags2["Important"] = 1] = "Important";
    /**
     * Marks a style as using dash case naming (this-is-dash-case).
     */
    RendererStyleFlags2[RendererStyleFlags2["DashCase"] = 2] = "DashCase";
})(RendererStyleFlags2 || (exports.RendererStyleFlags2 = RendererStyleFlags2 = {}));
let Renderer = class Renderer {
    constructor() {
        this[_a] = true;
    }
};
exports.Renderer = Renderer;
_a = effect_1.noReact;
exports.Renderer = Renderer = tslib_1.__decorate([
    (0, ioc_1.Abstract)()
], Renderer);
//# sourceMappingURL=Renderer.js.map