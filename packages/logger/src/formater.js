"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DefaultJoinPointFormater = exports.JoinPointFormater = void 0;
const tslib_1 = require("tslib");
const ioc_1 = require("@tsdi/ioc");
const aop_1 = require("@tsdi/aop");
/**
 * JoinPoint log formater logs
 */
let JoinPointFormater = class JoinPointFormater {
};
exports.JoinPointFormater = JoinPointFormater;
exports.JoinPointFormater = JoinPointFormater = tslib_1.__decorate([
    (0, ioc_1.Abstract)()
], JoinPointFormater);
let DefaultJoinPointFormater = class DefaultJoinPointFormater extends JoinPointFormater {
    timestamp(time) {
        return `[${time.toISOString()}]`;
    }
    format(joinPoint, level, logger, ...messages) {
        switch (joinPoint.state) {
            case aop_1.JoinpointState.Before:
            case aop_1.JoinpointState.Pointcut:
                messages = [
                    `${joinPoint.state} invoke method "${joinPoint.fullName}".`,
                    'params:',
                    joinPoint.params,
                    ', with args: ',
                    joinPoint.args,
                    ...messages
                ];
                break;
            case aop_1.JoinpointState.After:
                messages.unshift(`${joinPoint.state}  invoke method "${joinPoint.fullName}".`);
                break;
            case aop_1.JoinpointState.AfterReturning:
                messages = [
                    `Invoke method "${joinPoint.fullName}".`,
                    'returning value:',
                    joinPoint.returning,
                    ...messages
                ];
                break;
            case aop_1.JoinpointState.AfterThrowing:
                messages = [
                    `Invoke method "${joinPoint.fullName}".`,
                    'throw error:',
                    joinPoint.throwing,
                    ...messages
                ];
                break;
            default:
                break;
        }
        return messages;
    }
};
exports.DefaultJoinPointFormater = DefaultJoinPointFormater;
exports.DefaultJoinPointFormater = DefaultJoinPointFormater = tslib_1.__decorate([
    (0, aop_1.NonePointcut)(),
    (0, ioc_1.Static)()
], DefaultJoinPointFormater);
//# sourceMappingURL=formater.js.map