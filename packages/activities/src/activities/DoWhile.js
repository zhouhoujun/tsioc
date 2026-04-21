"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DoWhileActivity = void 0;
const tslib_1 = require("tslib");
const components_1 = require("@tsdi/components");
let DoWhileActivity = class DoWhileActivity {
    constructor(options = {}) {
        this.options = options;
        this.name = 'do_while';
        this.isRunning = false;
        this.options = {
            defaultMaxIterations: 100,
            defaultInterval: 0,
            ...options
        };
    }
    async execute(context) {
        if (!context.bodyActivity || !context.condition) {
            return {
                success: false,
                error: new Error('Missing required body activity or condition')
            };
        }
        const maxIterations = context.maxIterations ?? this.options.defaultMaxIterations;
        const interval = context.interval ?? this.options.defaultInterval;
        let iteration = 0;
        let lastResult = null;
        this.isRunning = true;
        try {
            do {
                // 检查最大迭代次数
                if (iteration >= maxIterations) {
                    return {
                        success: false,
                        error: new Error(`Maximum iterations (${maxIterations}) reached`),
                        data: {
                            iterations: iteration,
                            lastResult
                        }
                    };
                }
                // 执行循环体活动
                lastResult = await context.bodyActivity.execute(context);
                // 调用迭代回调
                if (context.onIteration) {
                    context.onIteration(iteration, lastResult);
                }
                // 如果循环体执行失败，中断循环
                if (!lastResult.success) {
                    return {
                        success: false,
                        error: lastResult.error,
                        data: {
                            iterations: iteration,
                            lastResult
                        }
                    };
                }
                // 等待指定间隔
                if (interval > 0) {
                    await new Promise(resolve => setTimeout(resolve, interval));
                }
                iteration++;
            } while (this.isRunning && await context.condition());
            return {
                success: true,
                data: {
                    iterations: iteration,
                    completed: true,
                    lastResult
                }
            };
        }
        catch (error) {
            return {
                success: false,
                error: error,
                data: {
                    iterations: iteration,
                    lastResult
                }
            };
        }
        finally {
            this.isRunning = false;
        }
    }
    async compensate(context) {
        // 停止循环
        this.isRunning = false;
        // 如果循环体活动有补偿操作，执行它
        if (context.bodyActivity.compensate) {
            await context.bodyActivity.compensate(context);
        }
    }
};
exports.DoWhileActivity = DoWhileActivity;
exports.DoWhileActivity = DoWhileActivity = tslib_1.__decorate([
    (0, components_1.Directive)({
        selector: 'dowhile'
    }),
    tslib_1.__metadata("design:paramtypes", [Object])
], DoWhileActivity);
//# sourceMappingURL=DoWhile.js.map