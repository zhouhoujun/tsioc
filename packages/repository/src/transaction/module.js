"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TransactionModule = void 0;
const tslib_1 = require("tslib");
const ioc_1 = require("@tsdi/ioc");
const aspect_1 = require("./aspect");
let TransactionModule = class TransactionModule {
};
exports.TransactionModule = TransactionModule;
exports.TransactionModule = TransactionModule = tslib_1.__decorate([
    (0, ioc_1.Module)({
        providers: [
            aspect_1.TransactionalAspect
        ]
    })
], TransactionModule);
//# sourceMappingURL=module.js.map