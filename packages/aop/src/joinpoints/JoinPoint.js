"use strict";
var JoinPoint_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProceedingJoinPoint = exports.JoinPoint = exports.AOP_METHOD_ANNOTATIONS = void 0;
const tslib_1 = require("tslib");
const ioc_1 = require("@tsdi/ioc");
const state_1 = require("./state");
exports.AOP_METHOD_ANNOTATIONS = (0, ioc_1.token)('AOP_METHOD_ANNOTATIONS');
/**
 * JoinPoint of aop.
 */
let JoinPoint = JoinPoint_1 = class JoinPoint extends ioc_1.ContextInjector {
    constructor(injector, options) {
        super(injector, options);
        this.target = options.target;
        this.propertyKey = options.propertyKey;
        this.args = options.args ?? [];
        this.receiver = options.receiver;
        this.targetRef = options.targetRef;
        this.targetType = options.targetType ?? options.targetRef.type;
        this.fullName = options.fullName ?? (0, ioc_1.getTypeName)(this.targetType) + '.' + this.propertyKey?.toString();
        this.advisor = options.advisor;
        this.originProxy = options.originProxy;
        this.originMethod = options.originMethod;
        this.params = options.params;
        this.valueChange = options.valueChange;
        this.accessor = options.accessor;
        this.annotations = options.annotations;
        this.state = options.state ?? state_1.JoinpointState.Before;
    }
    /**
     * parse option to instance of {@link JoinPoint}
     * @param injector
     * @param options
     * @returns
     */
    static create(injector, options) {
        return new JoinPoint_1(injector, options);
    }
};
exports.JoinPoint = JoinPoint;
exports.JoinPoint = JoinPoint = JoinPoint_1 = tslib_1.__decorate([
    (0, ioc_1.Abstract)(),
    tslib_1.__metadata("design:paramtypes", [ioc_1.Injector, Object])
], JoinPoint);
let ProceedingJoinPoint = class ProceedingJoinPoint extends JoinPoint {
    constructor(joinPoint, next, context) {
        super(joinPoint, {
            args: joinPoint.args,
            target: joinPoint.target,
            receiver: joinPoint.receiver,
            targetRef: joinPoint.targetRef,
            targetType: joinPoint.targetType,
            fullName: joinPoint.fullName,
            propertyKey: joinPoint.propertyKey,
            originProxy: joinPoint.originProxy,
            originMethod: joinPoint.originMethod,
            params: joinPoint.params,
            valueChange: joinPoint.valueChange,
            annotations: joinPoint.annotations,
            state: joinPoint.state,
            advisor: joinPoint.advisor
        });
        this.joinPoint = joinPoint;
        this.next = next;
        this.context = context;
    }
    proceed(...args) {
        if (args.length) {
            this.joinPoint.args = args;
        }
        return this.next(this.joinPoint, this.context);
    }
};
exports.ProceedingJoinPoint = ProceedingJoinPoint;
exports.ProceedingJoinPoint = ProceedingJoinPoint = tslib_1.__decorate([
    (0, ioc_1.Abstract)(),
    tslib_1.__metadata("design:paramtypes", [JoinPoint, Function, ioc_1.Context])
], ProceedingJoinPoint);
//# sourceMappingURL=JoinPoint.js.map