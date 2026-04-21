"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DebugLogAspect = void 0;
const tslib_1 = require("tslib");
const aop_1 = require("@tsdi/aop");
const logger_1 = require("../logger");
const aspect_1 = require("../aspect");
const metadata_1 = require("../metadata");
/**
 * debug log aspect.
 *
 * @export
 * @class DebugLogAspect
 * @extends {LogAspect}
 */
let DebugLogAspect = class DebugLogAspect extends aspect_1.LogAspect {
    logging(joinPoint) {
        let level = 'info';
        switch (joinPoint.state) {
            case aop_1.JoinpointState.AfterThrowing:
                level = 'error';
                break;
            case aop_1.JoinpointState.AfterReturning:
                level = 'debug';
                break;
            case aop_1.JoinpointState.After:
            case aop_1.JoinpointState.Before:
                level = 'trace';
                break;
        }
        this.processLog(joinPoint, level);
    }
};
exports.DebugLogAspect = DebugLogAspect;
tslib_1.__decorate([
    (0, metadata_1.InjectLog)({ level: 'trace' }),
    tslib_1.__metadata("design:type", logger_1.Logger)
], DebugLogAspect.prototype, "logger", void 0);
tslib_1.__decorate([
    (0, aop_1.Around)('execution(*.*)'),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [aop_1.JoinPoint]),
    tslib_1.__metadata("design:returntype", void 0)
], DebugLogAspect.prototype, "logging", null);
exports.DebugLogAspect = DebugLogAspect = tslib_1.__decorate([
    (0, aop_1.Aspect)({ static: true })
], DebugLogAspect);
//# sourceMappingURL=aspect.js.map