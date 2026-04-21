"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ActivityLogAspect = void 0;
const tslib_1 = require("tslib");
const aop_1 = require("@tsdi/aop");
const Activity_1 = require("../activities/Activity");
const ActivityInterceptorService_1 = require("./ActivityInterceptorService");
let ActivityLogAspect = class ActivityLogAspect {
    constructor(interceptorService) {
        this.interceptorService = interceptorService;
        this.options = {
            level: 'info',
            logBefore: true,
            logAfter: true,
            logError: true,
            includeContext: false,
            includeResult: false
        };
        this.activityTimers = new Map();
    }
    setOptions(options) {
        this.options = { ...this.options, ...options };
    }
    getOptions() {
        return { ...this.options };
    }
    getActivityName(target) {
        return target.name || target.constructor?.name || 'Anonymous';
    }
    matchesFilter(activityName) {
        const filter = this.options.activityFilter;
        if (!filter)
            return true;
        if (typeof filter === 'string') {
            return activityName === filter || activityName.includes(filter);
        }
        if (filter instanceof RegExp) {
            return filter.test(activityName);
        }
        return filter(activityName);
    }
    shouldLog(activityName) {
        return this.matchesFilter(activityName);
    }
    beforeExecute(joinPoint) {
        const target = joinPoint.target;
        const activityName = this.getActivityName(target);
        if (!this.shouldLog(activityName))
            return;
        this.activityTimers.set(target, process.hrtime());
        if (this.options.logBefore) {
            const context = joinPoint.args[0];
            this.interceptorService.log(this.options.level, activityName, `Starting activity: ${activityName}`, { context: this.options.includeContext ? context : undefined });
        }
    }
    afterExecute(joinPoint) {
        const target = joinPoint.target;
        const activityName = this.getActivityName(target);
        if (!this.shouldLog(activityName))
            return;
        if (!this.options.logAfter)
            return;
        const startTime = this.activityTimers.get(target);
        this.activityTimers.delete(target);
        const result = joinPoint.returning;
        const context = joinPoint.args[0];
        const duration = startTime ? process.hrtime(startTime) : [0, 0];
        const durationMs = duration[0] * 1000 + duration[1] / 1000000;
        this.interceptorService.log(result.success ? this.options.level : 'error', activityName, `Activity ${activityName} ${result.success ? 'completed' : 'failed'} in ${durationMs.toFixed(2)}ms`, {
            context: this.options.includeContext ? context : undefined,
            result: this.options.includeResult ? result : undefined
        });
    }
    afterThrowing(joinPoint) {
        const target = joinPoint.target;
        const activityName = this.getActivityName(target);
        if (!this.shouldLog(activityName))
            return;
        if (!this.options.logError)
            return;
        this.activityTimers.delete(target);
        const throwing = joinPoint.throwing;
        const context = joinPoint.args[0];
        this.interceptorService.log('error', activityName, `Activity ${activityName} error: ${throwing.message}`, {
            context: this.options.includeContext ? context : undefined,
            error: throwing
        });
    }
};
exports.ActivityLogAspect = ActivityLogAspect;
tslib_1.__decorate([
    (0, aop_1.Before)('execution(Activity.execute)'),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [aop_1.JoinPoint]),
    tslib_1.__metadata("design:returntype", void 0)
], ActivityLogAspect.prototype, "beforeExecute", null);
tslib_1.__decorate([
    (0, aop_1.AfterReturning)('execution(Activity.execute)'),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [aop_1.JoinPoint]),
    tslib_1.__metadata("design:returntype", void 0)
], ActivityLogAspect.prototype, "afterExecute", null);
tslib_1.__decorate([
    (0, aop_1.AfterThrowing)('execution(Activity.execute)'),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [aop_1.JoinPoint]),
    tslib_1.__metadata("design:returntype", void 0)
], ActivityLogAspect.prototype, "afterThrowing", null);
exports.ActivityLogAspect = ActivityLogAspect = tslib_1.__decorate([
    (0, aop_1.Aspect)({
        within: Activity_1.Activity,
        singleton: true
    }),
    tslib_1.__metadata("design:paramtypes", [ActivityInterceptorService_1.ActivityInterceptorService])
], ActivityLogAspect);
//# sourceMappingURL=ActivityLogAspect.js.map