"use strict";
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ViewContainerRef = void 0;
const tslib_1 = require("tslib");
const ioc_1 = require("@tsdi/ioc");
const effect_1 = require("../effect");
/**
 * Represents a container where one or more views can be attached to a component.
 *
 * Can contain *host views* (created by instantiating a
 * component with the `createComponent()` method), and *embedded views*
 * (created by instantiating a `TemplateRef` with the `createEmbeddedView()` method).
 *
 * A view container instance can contain other view containers,
 * creating a [view hierarchy]
 *
 * @see `ComponentRef`
 * @see `EmbeddedViewRef`
 *
 * @publicApi
 */
let ViewContainerRef = class ViewContainerRef {
    constructor() {
        this[_a] = true;
    }
};
exports.ViewContainerRef = ViewContainerRef;
_a = effect_1.noReact;
exports.ViewContainerRef = ViewContainerRef = tslib_1.__decorate([
    (0, ioc_1.Abstract)()
], ViewContainerRef);
//# sourceMappingURL=container.js.map