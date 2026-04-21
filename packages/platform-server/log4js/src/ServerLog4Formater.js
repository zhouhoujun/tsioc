"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ServerJoinpointLogFormater = void 0;
const tslib_1 = require("tslib");
const ioc_1 = require("@tsdi/ioc");
const aop_1 = require("@tsdi/aop");
const logger_1 = require("@tsdi/logger");
const chalk = require("chalk");
let ServerJoinpointLogFormater = class ServerJoinpointLogFormater extends logger_1.DefaultJoinPointFormater {
    format(joinPoint, level, logger, ...messages) {
        if (!(logger instanceof logger_1.ConsoleLog)) {
            return super.format(joinPoint, level, logger, ...messages);
        }
        switch (joinPoint.state) {
            case aop_1.JoinpointState.Before:
            case aop_1.JoinpointState.Pointcut:
                messages = [
                    `${joinPoint.state} invoke method ${chalk.cyan(joinPoint.fullName)}.`,
                    chalk.gray('params:'),
                    joinPoint.params,
                    chalk.gray(', with args:'),
                    joinPoint.args,
                    ...messages
                ];
                break;
            case aop_1.JoinpointState.After:
                messages.unshift(`${joinPoint.state}  invoke method ${chalk.cyan(joinPoint.fullName)}.`);
                break;
            case aop_1.JoinpointState.AfterReturning:
                messages = [
                    `Invoke method ${chalk.cyan(joinPoint.fullName)}.`,
                    chalk.gray('returning value:'),
                    joinPoint.returning,
                    ...messages
                ];
                break;
            case aop_1.JoinpointState.AfterThrowing:
                messages = [
                    `Invoke method ${chalk.cyan(joinPoint.fullName)}.`,
                    chalk.red('throw error:'),
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
exports.ServerJoinpointLogFormater = ServerJoinpointLogFormater;
exports.ServerJoinpointLogFormater = ServerJoinpointLogFormater = tslib_1.__decorate([
    (0, aop_1.NonePointcut)(),
    (0, ioc_1.Static)(),
    (0, ioc_1.ProvidedIn)(logger_1.LogAspect, logger_1.JoinPointFormater)
], ServerJoinpointLogFormater);
//# sourceMappingURL=ServerLog4Formater.js.map