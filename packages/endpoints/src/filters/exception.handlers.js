"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DefaultExceptionHandlers = void 0;
const tslib_1 = require("tslib");
const ioc_1 = require("@tsdi/ioc");
const core_1 = require("@tsdi/core");
const common_1 = require("@tsdi/common");
const repository_1 = require("@tsdi/repository");
const AbstractRequestContext_1 = require("../AbstractRequestContext");
let DefaultExceptionHandlers = class DefaultExceptionHandlers {
    constructor() { }
    badJsonException(ctx, execption) {
        let exp;
        if ((0, ioc_1.isNil)(ctx.body)) {
            exp = new common_1.InternalServerException(execption.message);
        }
        else {
            exp = new common_1.BadRequestException(execption.message);
        }
        ctx.throwException(exp);
    }
    notHanldeException(ctx, err) {
        const execption = new common_1.InternalServerException(this.detailError(ctx) ? err.message : undefined);
        ctx.throwException(execption);
    }
    anguException(ctx, err) {
        const execption = new common_1.BadRequestException(this.detailError(ctx) ? err.message : undefined);
        ctx.throwException(execption);
    }
    missFieldException(ctx, err) {
        const execption = new common_1.BadRequestException(this.detailError(ctx) ? err.message : undefined);
        ctx.throwException(execption);
    }
    missException(ctx, err) {
        const execption = new common_1.BadRequestException(this.detailError(ctx) ? err.message : undefined);
        ctx.throwException(execption);
    }
    detailError(ctx) {
        return ctx.detailError == true;
    }
};
exports.DefaultExceptionHandlers = DefaultExceptionHandlers;
tslib_1.__decorate([
    (0, core_1.ExceptionHandler)(core_1.InvalidJsonException),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [AbstractRequestContext_1.AbstractRequestContext, core_1.InvalidJsonException]),
    tslib_1.__metadata("design:returntype", void 0)
], DefaultExceptionHandlers.prototype, "badJsonException", null);
tslib_1.__decorate([
    (0, core_1.ExceptionHandler)(core_1.NotHandleException),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [AbstractRequestContext_1.AbstractRequestContext, core_1.NotHandleException]),
    tslib_1.__metadata("design:returntype", void 0)
], DefaultExceptionHandlers.prototype, "notHanldeException", null);
tslib_1.__decorate([
    (0, core_1.ExceptionHandler)(ioc_1.ArgumentException),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [AbstractRequestContext_1.AbstractRequestContext, ioc_1.ArgumentException]),
    tslib_1.__metadata("design:returntype", void 0)
], DefaultExceptionHandlers.prototype, "anguException", null);
tslib_1.__decorate([
    (0, core_1.ExceptionHandler)(repository_1.MissingModelFieldException),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [AbstractRequestContext_1.AbstractRequestContext, repository_1.MissingModelFieldException]),
    tslib_1.__metadata("design:returntype", void 0)
], DefaultExceptionHandlers.prototype, "missFieldException", null);
tslib_1.__decorate([
    (0, core_1.ExceptionHandler)(ioc_1.MissingParameterException),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [AbstractRequestContext_1.AbstractRequestContext, ioc_1.MissingParameterException]),
    tslib_1.__metadata("design:returntype", void 0)
], DefaultExceptionHandlers.prototype, "missException", null);
exports.DefaultExceptionHandlers = DefaultExceptionHandlers = tslib_1.__decorate([
    (0, ioc_1.Injectable)({
        static: true
    }),
    tslib_1.__metadata("design:paramtypes", [])
], DefaultExceptionHandlers);
//# sourceMappingURL=exception.handlers.js.map