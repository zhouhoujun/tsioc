"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TransactionException = void 0;
const ioc_1 = require("@tsdi/ioc");
/**
 * transaction execption.
 */
class TransactionException extends ioc_1.Exception {
    constructor(message) {
        super((0, ioc_1.isString)(message) ? message : message.stack || message.message);
    }
}
exports.TransactionException = TransactionException;
//# sourceMappingURL=execption.js.map