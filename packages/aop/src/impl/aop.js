"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.matchInterceptor = exports.pointcutInterceptor = void 0;
const ioc_1 = require("@tsdi/ioc");
const Proceeding_1 = require("../Proceeding");
/**
 * pointcut interecptor.
 *
 * @export
 */
const pointcutInterceptor = (typeRef, next, context) => {
    const runtime = context.runtime;
    if (!isValAspect(typeRef.type) || !runtime.has(Proceeding_1.Proceeding))
        return next(typeRef, context);
    // aspect class do nothing.
    return runtime.get(Proceeding_1.Proceeding).pointcutCtor(typeRef, next, context);
};
exports.pointcutInterceptor = pointcutInterceptor;
/**
 *  match pointcut interecptor.
 *
 * @export
 */
const matchInterceptor = (typeRef, next, context) => {
    const runtime = context.runtime;
    // aspect class do nothing.
    if (!isValAspect(typeRef.type) || !runtime.has(Proceeding_1.Proceeding))
        return next(typeRef, context);
    return runtime.get(Proceeding_1.Proceeding).pointcutProperty(typeRef, next, context);
};
exports.matchInterceptor = matchInterceptor;
/**
 * is target can aspect or not.
 *
 * @export
 * @param {AbstractType} targetType
 * @returns {boolean}
 */
function isValAspect(targetType) {
    return !targetType[ioc_1.noPointcut];
}
//# sourceMappingURL=aop.js.map