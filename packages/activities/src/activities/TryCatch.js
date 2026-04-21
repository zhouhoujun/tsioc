"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TryCatchActivity = void 0;
const tslib_1 = require("tslib");
const components_1 = require("@tsdi/components");
const Activity_1 = require("./Activity");
let TryCatchActivity = class TryCatchActivity extends Activity_1.Activity {
    async execute(context) {
        if (!this.tryActivity) {
            return {
                success: false,
                error: new Error('Try activity is required')
            };
        }
        let tryResult = null;
        let catchResult = null;
        let finallyResult = null;
        let finallyErrorResult = null;
        try {
            // 执行 try 块
            tryResult = await this.tryActivity.execute(context);
        }
        catch (error) {
            const caughtError = error;
            // 检查错误类型是否匹配
            const errorTypes = this.errorTypes;
            const shouldCatch = !errorTypes || errorTypes.length === 0 || errorTypes.some(errorType => caughtError instanceof errorType);
            if (shouldCatch && this.catchActivity) {
                // 执行 catch 块
                try {
                    catchResult = await this.catchActivity.execute({
                        ...context,
                        error: caughtError
                    });
                    // // 如果配置了重新抛出，则抛出错误
                    // if (this.rethrow ?? this.options.defaultRethrow) {
                    //     throw caughtError;
                    // }
                }
                catch (catchError) {
                    return {
                        success: false,
                        error: catchError,
                        data: {
                            tryResult,
                            catchError: catchError
                        }
                    };
                }
            }
            else {
                // 错误类型不匹配或没有 catch 块，重新抛出错误
                throw caughtError;
            }
        }
        finally {
            // 执行 finally 块
            if (this.finallyActivity) {
                try {
                    finallyResult = await this.finallyActivity.execute(context);
                }
                catch (finallyError) {
                    finallyErrorResult = {
                        success: false,
                        error: finallyError,
                        data: {
                            tryResult,
                            catchResult,
                            finallyError: finallyError
                        }
                    };
                }
            }
        }
        if (finallyErrorResult) {
            return finallyErrorResult;
        }
        // // 如果有自定义错误处理器，使用它处理任何错误
        // if (context.errorHandler) {
        //     const error = tryResult?.error || catchResult?.error || finallyResult?.error;
        //     if (error) {
        //         try {
        //             return await context.errorHandler(error);
        //         } catch (handlerError) {
        //             return {
        //                 success: false,
        //                 error: handlerError as Error,
        //                 data: {
        //                     tryResult,
        //                     catchResult,
        //                     finallyResult,
        //                     handlerError: handlerError as Error
        //                 }
        //             };
        //         }
        //     }
        // }
        // 返回执行结果
        return {
            success: Boolean(tryResult?.success || catchResult?.success),
            error: tryResult?.error || catchResult?.error || finallyResult?.error,
            data: {
                tryResult,
                catchResult,
                finallyResult
            }
        };
    }
    async compensate(context) {
        // 按相反顺序执行补偿操作
        const compensations = [];
        if (context.finallyActivity?.compensate) {
            compensations.push(context.finallyActivity.compensate(context));
        }
        if (context.catchActivity?.compensate) {
            compensations.push(context.catchActivity.compensate(context));
        }
        if (context.tryActivity?.compensate) {
            compensations.push(context.tryActivity.compensate(context));
        }
        await Promise.all(compensations);
    }
};
exports.TryCatchActivity = TryCatchActivity;
tslib_1.__decorate([
    (0, components_1.Attribute)(),
    tslib_1.__metadata("design:type", Activity_1.Activity)
], TryCatchActivity.prototype, "tryActivity", void 0);
tslib_1.__decorate([
    (0, components_1.Attribute)(),
    tslib_1.__metadata("design:type", Object)
], TryCatchActivity.prototype, "catchActivity", void 0);
tslib_1.__decorate([
    (0, components_1.Attribute)(),
    tslib_1.__metadata("design:type", Object)
], TryCatchActivity.prototype, "finallyActivity", void 0);
tslib_1.__decorate([
    (0, components_1.Attribute)(),
    tslib_1.__metadata("design:type", Array)
], TryCatchActivity.prototype, "errorTypes", void 0);
exports.TryCatchActivity = TryCatchActivity = tslib_1.__decorate([
    (0, components_1.Directive)({ selector: 'try_catch' })
], TryCatchActivity);
//# sourceMappingURL=TryCatch.js.map