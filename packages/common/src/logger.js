"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LoggerInterceptor = exports.LoggerOptions = exports.ResponseStatusFormater = void 0;
const tslib_1 = require("tslib");
const ioc_1 = require("@tsdi/ioc");
const core_1 = require("@tsdi/core");
const logger_1 = require("@tsdi/logger");
const rxjs_1 = require("rxjs");
const StatusAdapter_1 = require("./StatusAdapter");
/**
 * status formater.
 */
let ResponseStatusFormater = class ResponseStatusFormater {
    constructor() {
    }
    formatSize(size, precise = 2) {
        if (!(0, ioc_1.isNumber)(size))
            return '';
        return this.bytes.transform(size, precise);
    }
    cleanZero(num) {
        return num.replace(clrZReg, '');
    }
};
exports.ResponseStatusFormater = ResponseStatusFormater;
tslib_1.__decorate([
    (0, ioc_1.Inject)(),
    tslib_1.__metadata("design:type", core_1.BytesFormatPipe)
], ResponseStatusFormater.prototype, "bytes", void 0);
tslib_1.__decorate([
    (0, ioc_1.Inject)(),
    tslib_1.__metadata("design:type", core_1.HrtimeFormatter)
], ResponseStatusFormater.prototype, "htime", void 0);
exports.ResponseStatusFormater = ResponseStatusFormater = tslib_1.__decorate([
    (0, ioc_1.Abstract)(),
    tslib_1.__metadata("design:paramtypes", [])
], ResponseStatusFormater);
let LoggerOptions = class LoggerOptions {
};
exports.LoggerOptions = LoggerOptions;
exports.LoggerOptions = LoggerOptions = tslib_1.__decorate([
    (0, ioc_1.Abstract)()
], LoggerOptions);
const defopts = {
    level: 'debug'
};
/**
 * Logger interceptor, filter.
 */
let LoggerInterceptor = class LoggerInterceptor {
    constructor(formatter, options) {
        this.formatter = formatter;
        this.options = { ...defopts, ...options };
    }
    doFilter(req, next, context) {
        return this.intercept(req, next, context);
    }
    intercept(req, next, context) {
        const logger = context.getInjector().get(logger_1.Logger, this.logger, ioc_1.InjectFlags.Self);
        const statusAdapter = context.get(StatusAdapter_1.StatusAdapter);
        const level = this.options.level;
        if (!(0, logger_1.matchLevel)(logger.level, level)) {
            return next.handle(req, context);
        }
        //todo console log and other. need to refactor formater.
        const withColor = logger instanceof logger_1.ConsoleLog;
        const start = this.formatter.htime.hrtime();
        const path = req?.url ?? req?.topic ?? req.pattern;
        logger[level](...this.formatter.format(statusAdapter, withColor, path, req.method));
        return next.handle(req, context)
            .pipe((0, rxjs_1.map)(res => {
            logger[level](...this.formatter.format(statusAdapter, withColor, path, req.method, this.formatter.htime.hrtime(start), res.statusCode, res.statusMessage, context.getContentLength(), res.error));
            return res;
        }), (0, rxjs_1.catchError)(err => {
            logger[level](...this.formatter.format(statusAdapter, withColor, path, req.method, this.formatter.htime.hrtime(start), err.statusCode, err.statusMessage, context.getContentLength(), err));
            return (0, rxjs_1.throwError)(() => err);
        }));
    }
};
exports.LoggerInterceptor = LoggerInterceptor;
tslib_1.__decorate([
    (0, logger_1.InjectLog)(),
    tslib_1.__metadata("design:type", logger_1.Logger)
], LoggerInterceptor.prototype, "logger", void 0);
exports.LoggerInterceptor = LoggerInterceptor = tslib_1.__decorate([
    (0, ioc_1.Injectable)(),
    tslib_1.__param(1, (0, ioc_1.Nullable)()),
    tslib_1.__metadata("design:paramtypes", [ResponseStatusFormater, LoggerOptions])
], LoggerInterceptor);
const clrZReg = /\.?0+$/;
//# sourceMappingURL=logger.js.map