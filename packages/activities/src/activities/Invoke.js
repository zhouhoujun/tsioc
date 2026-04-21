"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InvokeActivity = void 0;
const tslib_1 = require("tslib");
const ioc_1 = require("@tsdi/ioc");
const components_1 = require("@tsdi/components");
const Activity_1 = require("./Activity");
let InvokeActivity = class InvokeActivity extends Activity_1.Activity {
    async execute(context) {
        let attempt = 0;
        let lastError = null;
        while (attempt < this.maxAttempts) {
            try {
                // 如果不是第一次尝试，等待指定延迟
                if (attempt > 0) {
                    const delay = this.delay * Math.pow(this.backoff, attempt - 1);
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
                const result = await this.invokeTarget(context);
                return {
                    success: true,
                    data: result
                };
            }
            catch (error) {
                lastError = error;
                attempt++;
                // // 如果有自定义错误处理器，使用它
                // if (context.errorHandler) {
                //     try {
                //         const handledResult = await context.errorHandler(lastError);
                //         if (handledResult) {
                //             return handledResult;
                //         }
                //     } catch (handlerError) {
                //         // 错误处理器也失败了，继续重试
                //         console.error('Error handler failed:', handlerError);
                //     }
                // }
                // 如果是最后一次尝试，返回错误
                if (attempt >= this.maxAttempts) {
                    return {
                        success: false,
                        error: lastError,
                        data: {
                            attempts: attempt,
                            lastError
                        }
                    };
                }
            }
        }
        // 这里正常不会执行到，为了 TypeScript 类型检查
        return {
            success: false,
            error: new Error('Unexpected execution path')
        };
    }
    async invokeTarget(context) {
        let result;
        if (this.target && (0, ioc_1.isString)(this.invoke)) {
            const invocation = this.target;
            // 调用活动
            const activityResult = await invocation.invoke(this.invoke, context);
            if (!activityResult.success) {
                throw activityResult.error || new Error('Activity execution failed');
            }
            result = activityResult.data;
        }
        else if ((0, ioc_1.isFunction)(this.invoke)) {
            // 调用函数
            result = await this.invoke(context);
        }
        // // 如果有结果转换函数，使用它
        // if (context.resultMapper) {
        //     result = context.resultMapper(result);
        // }
        return result;
    }
};
exports.InvokeActivity = InvokeActivity;
tslib_1.__decorate([
    (0, components_1.Attribute)(),
    tslib_1.__metadata("design:type", Object)
], InvokeActivity.prototype, "target", void 0);
tslib_1.__decorate([
    (0, components_1.Attribute)(),
    tslib_1.__metadata("design:type", Object)
], InvokeActivity.prototype, "invoke", void 0);
tslib_1.__decorate([
    (0, components_1.Attribute)(),
    tslib_1.__metadata("design:type", Number)
], InvokeActivity.prototype, "maxAttempts", void 0);
tslib_1.__decorate([
    (0, components_1.Attribute)(),
    tslib_1.__metadata("design:type", Number)
], InvokeActivity.prototype, "delay", void 0);
tslib_1.__decorate([
    (0, components_1.Attribute)(),
    tslib_1.__metadata("design:type", Number)
], InvokeActivity.prototype, "backoff", void 0);
exports.InvokeActivity = InvokeActivity = tslib_1.__decorate([
    (0, components_1.Directive)({ selector: 'invoke' })
], InvokeActivity);
//# sourceMappingURL=Invoke.js.map