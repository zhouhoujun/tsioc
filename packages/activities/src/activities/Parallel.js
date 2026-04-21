"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ParallelActivity = void 0;
const tslib_1 = require("tslib");
const components_1 = require("@tsdi/components");
const Activity_1 = require("./Activity");
let ParallelActivity = class ParallelActivity extends Activity_1.Activity {
    constructor() {
        super(...arguments);
        /**
         * 要并行执行的活动列表
         */
        this.activities = [];
        /**
         * 是否等待所有活动完成
         */
        this.waitAll = true;
        /**
         * 错误处理策略
         */
        this.errorStrategy = 'continue';
    }
    async execute(context) {
        if (!context.activities || context.activities.length === 0) {
            return {
                success: true,
                data: { completed: true }
            };
        }
        const maxConcurrent = this.maxConcurrent ?? 5;
        const errorStrategy = this.errorStrategy;
        const waitAll = this.waitAll;
        const results = new Map();
        const errors = [];
        let completedCount = 0;
        try {
            // 创建活动执行队列
            const queue = [...this.activities];
            const running = new Set();
            while (queue.length > 0 || running.size > 0) {
                // 填充运行中的活动直到达到最大并发数
                while (queue.length > 0 && running.size < maxConcurrent) {
                    const activity = queue.shift();
                    const promise = this.executeActivity(activity, context, results);
                    running.add(promise);
                    promise.then(() => {
                        running.delete(promise);
                        completedCount++;
                    }).catch(error => {
                        running.delete(promise);
                        completedCount++;
                        errors.push(error);
                    });
                }
                // 等待至少一个活动完成
                if (running.size > 0) {
                    await Promise.race(running);
                }
                // 根据错误策略决定是否继续
                if (errors.length > 0) {
                    switch (errorStrategy) {
                        case 'stop':
                            return {
                                success: false,
                                error: errors[0],
                                data: {
                                    completed: false,
                                    results,
                                    errors
                                }
                            };
                        case 'throw':
                            throw errors[0];
                    }
                }
            }
            // 检查是否所有活动都完成
            const allCompleted = completedCount === context.activities.length;
            const hasErrors = errors.length > 0;
            return {
                success: !hasErrors,
                data: {
                    completed: allCompleted,
                    results,
                    errors: hasErrors ? errors : undefined
                }
            };
        }
        catch (error) {
            return {
                success: false,
                error: error,
                data: {
                    completed: false,
                    results,
                    errors: [error]
                }
            };
        }
    }
    async executeActivity(activity, context, results) {
        try {
            const result = await activity.execute(context);
            results.set(activity, result);
            context.onActivityComplete?.(activity, result);
        }
        catch (error) {
            const errorResult = {
                success: false,
                error: error
            };
            results.set(activity, errorResult);
            context.onActivityComplete?.(activity, errorResult);
            throw error;
        }
    }
    async compensate(context) {
        // 并行执行所有活动的补偿操作
        const compensations = context.activities
            .filter(activity => activity.compensate)
            .map(activity => activity.compensate(context));
        await Promise.all(compensations);
    }
};
exports.ParallelActivity = ParallelActivity;
tslib_1.__decorate([
    (0, components_1.Attribute)(),
    tslib_1.__metadata("design:type", Array)
], ParallelActivity.prototype, "activities", void 0);
tslib_1.__decorate([
    (0, components_1.Attribute)(),
    tslib_1.__metadata("design:type", Number)
], ParallelActivity.prototype, "maxConcurrent", void 0);
tslib_1.__decorate([
    (0, components_1.Attribute)(),
    tslib_1.__metadata("design:type", Object)
], ParallelActivity.prototype, "waitAll", void 0);
tslib_1.__decorate([
    (0, components_1.Attribute)(),
    tslib_1.__metadata("design:type", String)
], ParallelActivity.prototype, "errorStrategy", void 0);
exports.ParallelActivity = ParallelActivity = tslib_1.__decorate([
    (0, components_1.Directive)({ selector: 'parallel' })
], ParallelActivity);
//# sourceMappingURL=Parallel.js.map