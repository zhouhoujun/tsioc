"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SequenceActivity = void 0;
const tslib_1 = require("tslib");
const components_1 = require("@tsdi/components");
const Activity_1 = require("./Activity");
let SequenceActivity = class SequenceActivity extends Activity_1.Activity {
    constructor() {
        super(...arguments);
        /**
         * 要按顺序执行的活动列表
         */
        this.activities = [];
    }
    async execute(context) {
        if (!this.activities || this.activities.length === 0) {
            return {
                success: true,
                data: { completed: true }
            };
        }
        const continueOnError = this.continueOnError;
        const results = new Map();
        const errors = [];
        let currentIndex = 0;
        try {
            for (const activity of this.activities) {
                try {
                    const result = await activity.execute(context);
                    results.set(activity, result);
                    // 如果活动执行失败且不继续执行，返回错误
                    if (!result.success && !continueOnError) {
                        return {
                            success: false,
                            error: result.error,
                            data: {
                                completed: false,
                                results,
                                errors: [result.error],
                                lastActivity: activity
                            }
                        };
                    }
                    // 如果活动执行失败且继续执行，收集错误
                    if (!result.success) {
                        errors.push(result.error);
                    }
                    currentIndex++;
                }
                catch (error) {
                    // 如果有自定义错误处理器，使用它
                    if (this.onError) {
                        try {
                            const handledResult = await this.onError(error);
                            results.set(activity, handledResult);
                            if (!handledResult.success && !continueOnError) {
                                return {
                                    success: false,
                                    error: handledResult.error,
                                    data: {
                                        completed: false,
                                        results,
                                        errors: [handledResult.error],
                                        lastActivity: activity
                                    }
                                };
                            }
                        }
                        catch (handlerError) {
                            errors.push(handlerError);
                        }
                    }
                    else {
                        errors.push(error);
                    }
                    // 如果不继续执行，返回错误
                    if (!continueOnError) {
                        return {
                            success: false,
                            error: error,
                            data: {
                                completed: false,
                                results,
                                errors,
                                lastActivity: activity
                            }
                        };
                    }
                }
            }
            // 检查是否所有活动都完成
            const allCompleted = currentIndex === this.activities.length;
            const hasErrors = errors.length > 0;
            return {
                success: !hasErrors,
                data: {
                    completed: allCompleted,
                    results,
                    errors: hasErrors ? errors : undefined,
                    lastActivity: this.activities[currentIndex - 1]
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
                    errors: [error],
                    lastActivity: this.activities[currentIndex]
                }
            };
        }
    }
    async compensate(context) {
        // 按相反顺序执行所有活动的补偿操作
        const compensations = this.activities
            .reverse()
            .filter(activity => activity.compensate)
            .map(activity => activity.compensate(context));
        await Promise.all(compensations);
    }
};
exports.SequenceActivity = SequenceActivity;
tslib_1.__decorate([
    (0, components_1.Attribute)(),
    tslib_1.__metadata("design:type", Array)
], SequenceActivity.prototype, "activities", void 0);
tslib_1.__decorate([
    (0, components_1.Attribute)(),
    tslib_1.__metadata("design:type", Boolean)
], SequenceActivity.prototype, "continueOnError", void 0);
tslib_1.__decorate([
    (0, components_1.Attribute)(),
    tslib_1.__metadata("design:type", Function)
], SequenceActivity.prototype, "onError", void 0);
exports.SequenceActivity = SequenceActivity = tslib_1.__decorate([
    (0, components_1.Directive)({ selector: 'sequence' })
], SequenceActivity);
//# sourceMappingURL=Sequence.js.map