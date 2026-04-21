"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AbstractConfigableHandler = void 0;
exports.isHandlerOptions = isHandlerOptions;
const tslib_1 = require("tslib");
const ioc_1 = require("@tsdi/ioc");
/**
 * Configable handler
 */
let AbstractConfigableHandler = class AbstractConfigableHandler {
};
exports.AbstractConfigableHandler = AbstractConfigableHandler;
exports.AbstractConfigableHandler = AbstractConfigableHandler = tslib_1.__decorate([
    (0, ioc_1.Abstract)()
], AbstractConfigableHandler);
function isHandlerOptions(target) {
    return (0, ioc_1.isPlainObject)(target) && ('guards' in target || 'interceptors' in target || 'pipes' in target || 'filters' in target);
}
//# sourceMappingURL=configable.js.map