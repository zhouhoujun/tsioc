"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RunAspect = void 0;
const tslib_1 = require("tslib");
const aop_1 = require("@tsdi/aop");
const Activity_1 = require("../activities/Activity");
/**
 * Task Log
 *
 * @export
 * @class TaskLogAspect
 */
let RunAspect = class RunAspect {
    constructor() {
    }
    afterRun(joinPoint) {
        // const actRef = joinPoint.target as ActivityRef;
        // switch (actRef.state) {
        //     case RunState.pause:
        //         throw new Error('workflow paused!');
        //     case RunState.stop:
        //         throw new Error('workflow stop!');
        // }
    }
};
exports.RunAspect = RunAspect;
tslib_1.__decorate([
    (0, aop_1.AfterReturning)('execution(*.execute(..))'),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [aop_1.JoinPoint]),
    tslib_1.__metadata("design:returntype", void 0)
], RunAspect.prototype, "afterRun", null);
exports.RunAspect = RunAspect = tslib_1.__decorate([
    (0, aop_1.Aspect)({
        within: Activity_1.Activity,
        singleton: true
    }),
    tslib_1.__metadata("design:paramtypes", [])
], RunAspect);
//# sourceMappingURL=RunAspect.js.map