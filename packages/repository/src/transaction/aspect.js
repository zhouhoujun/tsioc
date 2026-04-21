"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TransactionalAspect = void 0;
const tslib_1 = require("tslib");
const ioc_1 = require("@tsdi/ioc");
const aop_1 = require("@tsdi/aop");
const manager_1 = require("./manager");
const execption_1 = require("./execption");
const status_1 = require("./status");
/**
 * Transactional aspect. log for class or method with @Transactional decorator.
 *
 * @export
 * @class TransactionalAspect
 */
let TransactionalAspect = class TransactionalAspect {
    async begin(manager, annotation, joinPoint) {
        if (!manager)
            throw new ioc_1.ArgumentException('TransactionManager can not be null.');
        const status = await manager.getTransaction(ioc_1.lang.first(annotation));
        joinPoint.setValue(status_1.TransactionStatus, status);
        await status.flush(joinPoint);
    }
    async commit(manager, returning, joinPoint) {
        if (!manager)
            throw new ioc_1.ArgumentException('TransactionManager can not be null.');
        await manager.commit(joinPoint.get(status_1.TransactionStatus));
    }
    async rollback(manager, error, joinPoint) {
        if (!manager)
            throw new ioc_1.ArgumentException('TransactionManager can not be null.');
        try {
            await manager.rollback(joinPoint.get(status_1.TransactionStatus));
        }
        catch (err) {
            throw new execption_1.TransactionException(err);
        }
    }
};
exports.TransactionalAspect = TransactionalAspect;
tslib_1.__decorate([
    (0, aop_1.Before)('@annotation(Transactional)', { sync: true, annotationName: 'Transactional', annotationArgName: 'annotation' }),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [manager_1.TransactionManager, Array, aop_1.JoinPoint]),
    tslib_1.__metadata("design:returntype", Promise)
], TransactionalAspect.prototype, "begin", null);
tslib_1.__decorate([
    (0, aop_1.AfterReturning)('@annotation(Transactional)', 'returning', { sync: true }),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [manager_1.TransactionManager, Object, aop_1.JoinPoint]),
    tslib_1.__metadata("design:returntype", Promise)
], TransactionalAspect.prototype, "commit", null);
tslib_1.__decorate([
    (0, aop_1.AfterThrowing)('@annotation(Transactional)', 'error', { sync: true }),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [manager_1.TransactionManager, Error, aop_1.JoinPoint]),
    tslib_1.__metadata("design:returntype", Promise)
], TransactionalAspect.prototype, "rollback", null);
exports.TransactionalAspect = TransactionalAspect = tslib_1.__decorate([
    (0, aop_1.Aspect)({ static: true })
], TransactionalAspect);
//# sourceMappingURL=aspect.js.map