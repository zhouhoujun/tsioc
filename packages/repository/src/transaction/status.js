"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TransactionStatus = void 0;
const tslib_1 = require("tslib");
const ioc_1 = require("@tsdi/ioc");
/**
 * Representation of the status of a transaction.
 *
 * <p>Transactional code can use this to retrieve status information,
 * and to programmatically request a rollback (instead of throwing
 * an exception that causes an implicit rollback).
 */
let TransactionStatus = class TransactionStatus {
};
exports.TransactionStatus = TransactionStatus;
exports.TransactionStatus = TransactionStatus = tslib_1.__decorate([
    (0, ioc_1.Abstract)()
], TransactionStatus);
//# sourceMappingURL=status.js.map