"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnnotationLogAspect = exports.LogAspect = void 0;
const tslib_1 = require("tslib");
const ioc_1 = require("@tsdi/ioc");
const aop_1 = require("@tsdi/aop");
const Level_1 = require("./Level");
const LogProcess_1 = require("./LogProcess");
const formater_1 = require("./formater");
/**
 * base log aspect. for extends your log aspect.
 *
 * @export
 * @class LogAspect
 */
let LogAspect = class LogAspect extends LogProcess_1.LogProcess {
    processLog(joinPoint, annotation, level, ...messages) {
        if ((0, ioc_1.isArray)(annotation)) {
            if (!(0, Level_1.isLevel)(level)) {
                !(0, ioc_1.isNil)(level) && messages.unshift(level);
            }
            annotation.forEach((logmeta) => {
                const canlog = logmeta.express ? logmeta.express(joinPoint) : true;
                if (canlog && logmeta.message) {
                    this.writeLog(this.getLogger(logmeta.logname), joinPoint, logmeta.level || level, false, logmeta.message);
                }
            });
            this.writeLog(this.logger, joinPoint, level, true, ...messages);
        }
        else {
            !(0, ioc_1.isNil)(level) && messages.unshift(level);
            if ((0, Level_1.isLevel)(annotation)) {
                level = annotation;
            }
            else {
                level = '';
                !(0, ioc_1.isNil)(annotation) && messages.unshift(annotation);
            }
            this.writeLog(this.logger, joinPoint, level, true, ...messages);
        }
    }
    writeLog(logger, joinPoint, level, format, ...messages) {
        (async () => {
            const formatMsgs = format ? this.formatMessage(joinPoint, logger, level, ...messages) : messages;
            if (level) {
                logger[level](...formatMsgs);
            }
            else {
                switch (joinPoint.state) {
                    case aop_1.JoinpointState.Before:
                    case aop_1.JoinpointState.After:
                    case aop_1.JoinpointState.AfterReturning:
                        logger.debug(...formatMsgs);
                        break;
                    case aop_1.JoinpointState.Pointcut:
                        logger.info(...formatMsgs);
                        break;
                    case aop_1.JoinpointState.AfterThrowing:
                        logger.error(...formatMsgs);
                        break;
                }
            }
        })();
    }
    formatTimestamp() {
        const now = new Date();
        return `[${now.toISOString()}]`;
    }
    getFormater() {
        if (!this._formater) {
            const config = this.mangers.getConfigure() || {};
            let formater;
            const format = config.format || formater_1.JoinPointFormater;
            if ((0, ioc_1.isToken)(format)) {
                formater = this.injector.get(format, null) ?? this.injector.get(formater_1.DefaultJoinPointFormater);
            }
            else if ((0, ioc_1.isFunction)(format)) {
                formater = { format };
            }
            else if ((0, ioc_1.isObject)(format) && (0, ioc_1.isFunction)(format.format)) {
                formater = format;
            }
            this._formater = formater;
        }
        return this._formater;
    }
    formatMessage(joinPoint, logger, level, ...messages) {
        const formater = this.getFormater();
        if (formater) {
            messages = formater.format(joinPoint, level, logger, ...messages);
        }
        else {
            messages.unshift((logger.category ?? 'default') + ' -');
            if (level) {
                messages.unshift(`[${level.toUpperCase()}]`);
            }
            const timestamp = this.formatTimestamp();
            if (timestamp)
                messages.unshift(timestamp);
        }
        return messages;
    }
};
exports.LogAspect = LogAspect;
exports.LogAspect = LogAspect = tslib_1.__decorate([
    (0, ioc_1.Abstract)()
], LogAspect);
/**
 * Annotation log aspect. log for class or method with @Log decorator.
 *
 * @export
 * @class AnnotationLogAspect
 * @extends {LogAspect}
 */
let AnnotationLogAspect = class AnnotationLogAspect extends LogAspect {
    logging(joinPoint, annotation) {
        this.processLog(joinPoint, annotation);
    }
};
exports.AnnotationLogAspect = AnnotationLogAspect;
tslib_1.__decorate([
    (0, aop_1.Pointcut)('@annotation(Log)', 'annotation'),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [aop_1.JoinPoint, Array]),
    tslib_1.__metadata("design:returntype", void 0)
], AnnotationLogAspect.prototype, "logging", null);
exports.AnnotationLogAspect = AnnotationLogAspect = tslib_1.__decorate([
    (0, aop_1.Aspect)({ static: true })
], AnnotationLogAspect);
//# sourceMappingURL=aspect.js.map