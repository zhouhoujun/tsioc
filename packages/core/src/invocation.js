"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TypedRespond = exports.ExceptionRespond = exports.Respond = exports.InvocationHanlderFactory = exports.InvocationHandler = void 0;
const tslib_1 = require("tslib");
const ioc_1 = require("@tsdi/ioc");
const configable_1 = require("./handlers/configable");
/**
 * Invocation handler
 */
let InvocationHandler = class InvocationHandler extends configable_1.AbstractConfigableHandler {
};
exports.InvocationHandler = InvocationHandler;
exports.InvocationHandler = InvocationHandler = tslib_1.__decorate([
    (0, ioc_1.Abstract)()
], InvocationHandler);
/**
 * Invocation Handler factory.
 */
let InvocationHanlderFactory = class InvocationHanlderFactory extends ioc_1.InvocationFactory {
};
exports.InvocationHanlderFactory = InvocationHanlderFactory;
exports.InvocationHanlderFactory = InvocationHanlderFactory = tslib_1.__decorate([
    (0, ioc_1.Abstract)()
], InvocationHanlderFactory);
/**
 * Respond
 */
let Respond = class Respond {
};
exports.Respond = Respond;
exports.Respond = Respond = tslib_1.__decorate([
    (0, ioc_1.Abstract)()
], Respond);
/**
 * Respond
 */
let ExceptionRespond = class ExceptionRespond {
};
exports.ExceptionRespond = ExceptionRespond;
exports.ExceptionRespond = ExceptionRespond = tslib_1.__decorate([
    (0, ioc_1.Abstract)()
], ExceptionRespond);
/**
 * Respond adapter with response type.
 */
let TypedRespond = class TypedRespond {
};
exports.TypedRespond = TypedRespond;
exports.TypedRespond = TypedRespond = tslib_1.__decorate([
    (0, ioc_1.Abstract)()
], TypedRespond);
//# sourceMappingURL=invocation.js.map