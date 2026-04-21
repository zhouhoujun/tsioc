"use strict";
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.TemplateRef = void 0;
const tslib_1 = require("tslib");
const ioc_1 = require("@tsdi/ioc");
const effect_1 = require("../effect");
/**
 * Represents an embedded template that can be used to instantiate embedded views.
 * To instantiate embedded views based on a template, use the `ViewContainerRef`
 * method `createEmbeddedView()`.
 *
 * Access a `TemplateRef` instance by placing a directive on an `<template>`
 * element (or directive prefixed with `*`). The `TemplateRef` for the embedded view
 * is injected into the constructor of the directive,
 * using the `TemplateRef` token.
 *
 * You can also use a `Query` to find a `TemplateRef` associated with
 * a component or a directive.
 *
 * @see `ViewContainerRef`
 * @see Navigate the Component Tree with DI
 *
 * @publicApi
 */
let TemplateRef = class TemplateRef {
    constructor() {
        this[_a] = true;
    }
};
exports.TemplateRef = TemplateRef;
_a = effect_1.noReact;
exports.TemplateRef = TemplateRef = tslib_1.__decorate([
    (0, ioc_1.Abstract)()
], TemplateRef);
//# sourceMappingURL=template.js.map