"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HttpExceptionHandlers = void 0;
const tslib_1 = require("tslib");
const ioc_1 = require("@tsdi/ioc");
const core_1 = require("@tsdi/core");
const common_1 = require("@tsdi/common");
const repository_1 = require("@tsdi/repository");
const AbstractRequestContext_1 = require("../AbstractRequestContext");
let HttpExceptionHandlers = class HttpExceptionHandlers {
    constructor() { }
    badJsonException(ctx, execption) {
        let exp;
        if ((0, ioc_1.isNil)(ctx.body)) {
            exp = new common_1.InternalServerException(execption.message, 500 /* HttpStatusCode.InternalServerError */);
        }
        else {
            exp = new common_1.BadRequestException(execption.message, 400 /* HttpStatusCode.BadRequest */);
        }
        ctx.throwException(exp);
    }
    notHanldeException(ctx, err) {
        const execption = new common_1.InternalServerException(this.detailError(ctx) ? err.message : undefined);
        ctx.throwException(execption);
    }
    badReqException(ctx, execption) {
        execption.status = 400 /* HttpStatusCode.BadRequest */;
        ctx.throwException(execption);
    }
    unauthorized(ctx, execption) {
        execption.status = 401 /* HttpStatusCode.Unauthorized */;
        ctx.throwException(execption);
    }
    forbiddenException(ctx, execption) {
        execption.status = 403 /* HttpStatusCode.Forbidden */;
        ctx.throwException(execption);
    }
    notFoundException(ctx, execption) {
        execption.status = 404 /* HttpStatusCode.NotFound */;
        ctx.throwException(execption);
    }
    notAllowedException(ctx, execption) {
        execption.status = 405 /* HttpStatusCode.MethodNotAllowed */;
        ctx.throwException(execption);
    }
    notAcceptableException(ctx, execption) {
        execption.status = 406 /* HttpStatusCode.NotAcceptable */;
        ctx.throwException(execption);
    }
    timeoutExecpotion(ctx, execption) {
        execption.status = 408 /* HttpStatusCode.RequestTimeout */;
        ctx.throwException(execption);
    }
    unsupported(ctx, execption) {
        execption.status = 415 /* HttpStatusCode.UnsupportedMediaType */;
        ctx.throwException(execption);
    }
    internalServerError(ctx, execption) {
        execption.status = 500 /* HttpStatusCode.InternalServerError */;
        ctx.throwException(execption);
    }
    notImplementedError(ctx, execption) {
        execption.status = 501 /* HttpStatusCode.NotImplemented */;
        ctx.throwException(execption);
    }
    badGatewayError(ctx, execption) {
        execption.status = 502 /* HttpStatusCode.BadGateway */;
        ctx.throwException(execption);
    }
    ServiceUnavailableError(ctx, execption) {
        execption.status = 503 /* HttpStatusCode.ServiceUnavailable */;
        ctx.throwException(execption);
    }
    gatewayTimeoutError(ctx, execption) {
        execption.status = 504 /* HttpStatusCode.GatewayTimeout */;
        ctx.throwException(execption);
    }
    notSupportedError(ctx, execption) {
        execption.status = 502 /* HttpStatusCode.BadGateway */;
        ctx.throwException(execption);
    }
    anguException(ctx, err) {
        const execption = new common_1.BadRequestException(this.detailError(ctx) ? err.message : undefined, 400 /* HttpStatusCode.BadRequest */);
        ctx.throwException(execption);
    }
    missFieldException(ctx, err) {
        const execption = new common_1.BadRequestException(this.detailError(ctx) ? err.message : undefined, 400 /* HttpStatusCode.BadRequest */);
        ctx.throwException(execption);
    }
    missException(ctx, err) {
        const execption = new common_1.BadRequestException(this.detailError(ctx) ? err.message : undefined, 400 /* HttpStatusCode.BadRequest */);
        ctx.throwException(execption);
    }
    detailError(ctx) {
        return ctx.detailError === true;
    }
};
exports.HttpExceptionHandlers = HttpExceptionHandlers;
tslib_1.__decorate([
    (0, core_1.ExceptionHandler)(core_1.InvalidJsonException),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [AbstractRequestContext_1.AbstractRequestContext, core_1.InvalidJsonException]),
    tslib_1.__metadata("design:returntype", void 0)
], HttpExceptionHandlers.prototype, "badJsonException", null);
tslib_1.__decorate([
    (0, core_1.ExceptionHandler)(core_1.NotHandleException),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [AbstractRequestContext_1.AbstractRequestContext, core_1.NotHandleException]),
    tslib_1.__metadata("design:returntype", void 0)
], HttpExceptionHandlers.prototype, "notHanldeException", null);
tslib_1.__decorate([
    (0, core_1.ExceptionHandler)(common_1.BadRequestException),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [AbstractRequestContext_1.AbstractRequestContext, common_1.BadRequestException]),
    tslib_1.__metadata("design:returntype", void 0)
], HttpExceptionHandlers.prototype, "badReqException", null);
tslib_1.__decorate([
    (0, core_1.ExceptionHandler)(common_1.UnauthorizedException),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [AbstractRequestContext_1.AbstractRequestContext, common_1.UnauthorizedException]),
    tslib_1.__metadata("design:returntype", void 0)
], HttpExceptionHandlers.prototype, "unauthorized", null);
tslib_1.__decorate([
    (0, core_1.ExceptionHandler)(common_1.ForbiddenException),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [AbstractRequestContext_1.AbstractRequestContext, common_1.ForbiddenException]),
    tslib_1.__metadata("design:returntype", void 0)
], HttpExceptionHandlers.prototype, "forbiddenException", null);
tslib_1.__decorate([
    (0, core_1.ExceptionHandler)(common_1.NotFoundException),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [AbstractRequestContext_1.AbstractRequestContext, common_1.NotFoundException]),
    tslib_1.__metadata("design:returntype", void 0)
], HttpExceptionHandlers.prototype, "notFoundException", null);
tslib_1.__decorate([
    (0, core_1.ExceptionHandler)(common_1.MethodNotAllowedException),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [AbstractRequestContext_1.AbstractRequestContext, common_1.MethodNotAllowedException]),
    tslib_1.__metadata("design:returntype", void 0)
], HttpExceptionHandlers.prototype, "notAllowedException", null);
tslib_1.__decorate([
    (0, core_1.ExceptionHandler)(common_1.NotAcceptableException),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [AbstractRequestContext_1.AbstractRequestContext, common_1.NotAcceptableException]),
    tslib_1.__metadata("design:returntype", void 0)
], HttpExceptionHandlers.prototype, "notAcceptableException", null);
tslib_1.__decorate([
    (0, core_1.ExceptionHandler)(common_1.RequestTimeoutException),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [AbstractRequestContext_1.AbstractRequestContext, common_1.NotAcceptableException]),
    tslib_1.__metadata("design:returntype", void 0)
], HttpExceptionHandlers.prototype, "timeoutExecpotion", null);
tslib_1.__decorate([
    (0, core_1.ExceptionHandler)(common_1.UnsupportedMediaTypeException),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [AbstractRequestContext_1.AbstractRequestContext, common_1.UnsupportedMediaTypeException]),
    tslib_1.__metadata("design:returntype", void 0)
], HttpExceptionHandlers.prototype, "unsupported", null);
tslib_1.__decorate([
    (0, core_1.ExceptionHandler)(common_1.InternalServerException),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [AbstractRequestContext_1.AbstractRequestContext, common_1.InternalServerException]),
    tslib_1.__metadata("design:returntype", void 0)
], HttpExceptionHandlers.prototype, "internalServerError", null);
tslib_1.__decorate([
    (0, core_1.ExceptionHandler)(common_1.NotImplementedException),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [AbstractRequestContext_1.AbstractRequestContext, common_1.NotImplementedException]),
    tslib_1.__metadata("design:returntype", void 0)
], HttpExceptionHandlers.prototype, "notImplementedError", null);
tslib_1.__decorate([
    (0, core_1.ExceptionHandler)(common_1.BadGatewayException),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [AbstractRequestContext_1.AbstractRequestContext, common_1.BadGatewayException]),
    tslib_1.__metadata("design:returntype", void 0)
], HttpExceptionHandlers.prototype, "badGatewayError", null);
tslib_1.__decorate([
    (0, core_1.ExceptionHandler)(common_1.ServiceUnavailableException),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [AbstractRequestContext_1.AbstractRequestContext, common_1.ServiceUnavailableException]),
    tslib_1.__metadata("design:returntype", void 0)
], HttpExceptionHandlers.prototype, "ServiceUnavailableError", null);
tslib_1.__decorate([
    (0, core_1.ExceptionHandler)(common_1.GatewayTimeoutException),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [AbstractRequestContext_1.AbstractRequestContext, common_1.GatewayTimeoutException]),
    tslib_1.__metadata("design:returntype", void 0)
], HttpExceptionHandlers.prototype, "gatewayTimeoutError", null);
tslib_1.__decorate([
    (0, core_1.ExceptionHandler)(common_1.NotSupportedException),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [AbstractRequestContext_1.AbstractRequestContext, common_1.NotSupportedException]),
    tslib_1.__metadata("design:returntype", void 0)
], HttpExceptionHandlers.prototype, "notSupportedError", null);
tslib_1.__decorate([
    (0, core_1.ExceptionHandler)(ioc_1.ArgumentException),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [AbstractRequestContext_1.AbstractRequestContext, ioc_1.ArgumentException]),
    tslib_1.__metadata("design:returntype", void 0)
], HttpExceptionHandlers.prototype, "anguException", null);
tslib_1.__decorate([
    (0, core_1.ExceptionHandler)(repository_1.MissingModelFieldException),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [AbstractRequestContext_1.AbstractRequestContext, repository_1.MissingModelFieldException]),
    tslib_1.__metadata("design:returntype", void 0)
], HttpExceptionHandlers.prototype, "missFieldException", null);
tslib_1.__decorate([
    (0, core_1.ExceptionHandler)(ioc_1.MissingParameterException),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [AbstractRequestContext_1.AbstractRequestContext, ioc_1.MissingParameterException]),
    tslib_1.__metadata("design:returntype", void 0)
], HttpExceptionHandlers.prototype, "missException", null);
exports.HttpExceptionHandlers = HttpExceptionHandlers = tslib_1.__decorate([
    (0, ioc_1.Injectable)({ static: true }),
    tslib_1.__metadata("design:paramtypes", [])
], HttpExceptionHandlers);
//# sourceMappingURL=exception.handlers.js.map