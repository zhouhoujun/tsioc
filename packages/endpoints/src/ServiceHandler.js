"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ServiceHandler = void 0;
const tslib_1 = require("tslib");
const ioc_1 = require("@tsdi/ioc");
const common_1 = require("@tsdi/common");
/**
 * service configable request handler
 */
let ServiceHandler = class ServiceHandler extends common_1.ConfigableRequestHandler {
};
exports.ServiceHandler = ServiceHandler;
exports.ServiceHandler = ServiceHandler = tslib_1.__decorate([
    (0, ioc_1.Abstract)()
], ServiceHandler);
//# sourceMappingURL=ServiceHandler.js.map