"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WhileActivity = void 0;
const tslib_1 = require("tslib");
const components_1 = require("@tsdi/components");
const Activity_1 = require("./Activity");
let WhileActivity = class WhileActivity extends Activity_1.Activity {
    constructor() {
        super(...arguments);
        this.isRunning = false; // 添加运行状态标志
    }
    async execute(context) {
        if (!this.condition) {
            return {
                success: false,
                error: new Error('No condition provided for while loop')
            };
        }
        if (!this.body) {
            return {
                success: false,
                error: new Error('No body activity provided for while loop')
            };
        }
        this.isRunning = true;
        const maxIterations = this.maxIterations;
        const interval = this.interval ?? 0;
        // const continueOnError = this.continueOnError ?? this.options.defaultContinueOnError;
        // const throwOnConditionFalse = this.throwOnConditionFalse ?? this.options.defaultThrowOnConditionFalse;
        let iteration = 0;
        const results = [];
        const errors = [];
        try {
            while (this.isRunning && iteration < maxIterations) {
                // 检查循环条件
                const shouldContinue = await this.condition(context);
                if (!shouldContinue) {
                    // if (throwOnConditionFalse) {
                    //     throw new Error(`Loop condition returned false at iteration ${iteration}`);
                    // }
                    break;
                }
                try {
                    const result = await this.body.execute(context);
                    results.push(result);
                    // context.onIteration?.(iteration, result);
                    // 优化错误处理逻辑
                    if (!result.success) {
                        errors.push(result.error);
                        // if (!continueOnError) {
                        //     return this.createResult(false, result.error, iteration, results, errors);
                        // }
                    }
                    // 等待间隔
                    if (interval > 0 && this.isRunning) {
                        await new Promise(resolve => setTimeout(resolve, interval));
                    }
                    iteration++;
                }
                catch (error) {
                    // 统一错误处理
                    const err = error;
                    errors.push(err);
                    // if (context.errorHandler) {
                    //     try {
                    //         const handledResult = await context.errorHandler(err, iteration);
                    //         results.push(handledResult);
                    //         if (!handledResult.success && !continueOnError) {
                    //             return this.createResult(false, handledResult.error, iteration, results, errors);
                    //         }
                    //     } catch (handlerError) {
                    //         errors.push(handlerError as Error);
                    //     }
                    // }
                    // if (!continueOnError) {
                    //     return this.createResult(false, err, iteration, results, errors);
                    // }
                }
            }
            // 统一结果返回
            if (iteration >= maxIterations) {
                return this.createResult(false, new Error(`Maximum iterations (${maxIterations}) reached`), iteration, results, errors);
            }
            return this.createResult(errors.length === 0, undefined, iteration, results, errors.length ? errors : undefined);
        }
        finally {
            this.isRunning = false;
        }
    }
    createResult(success, error, iteration, results, errors) {
        return {
            success,
            error,
            data: {
                iteration,
                results,
                errors
            }
        };
    }
    async compensate(context) {
        this.isRunning = false; // 停止循环
        if (this.body?.compensate) {
            await this.body.compensate(context);
        }
    }
};
exports.WhileActivity = WhileActivity;
tslib_1.__decorate([
    (0, components_1.Attribute)(),
    tslib_1.__metadata("design:type", Function)
], WhileActivity.prototype, "condition", void 0);
tslib_1.__decorate([
    (0, components_1.Attribute)(),
    tslib_1.__metadata("design:type", Activity_1.Activity)
], WhileActivity.prototype, "body", void 0);
tslib_1.__decorate([
    (0, components_1.Attribute)(),
    tslib_1.__metadata("design:type", Number)
], WhileActivity.prototype, "maxIterations", void 0);
tslib_1.__decorate([
    (0, components_1.Attribute)(),
    tslib_1.__metadata("design:type", Number)
], WhileActivity.prototype, "interval", void 0);
exports.WhileActivity = WhileActivity = tslib_1.__decorate([
    (0, components_1.Directive)({ selector: 'while' })
], WhileActivity);
//# sourceMappingURL=While.js.map