"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IntervalActivity = void 0;
const tslib_1 = require("tslib");
const components_1 = require("@tsdi/components");
const Activity_1 = require("./Activity");
let IntervalActivity = class IntervalActivity extends Activity_1.Activity {
    constructor() {
        super(...arguments);
        this.isRunning = false;
        this.timeoutId = null;
        /**
         * 是否立即执行第一次
         */
        this.immediate = false;
    }
    async execute(context) {
        if (!this.body) {
            return {
                success: false,
                error: new Error('No action activity provided')
            };
        }
        if (this.interval < 0) {
            return {
                success: false,
                error: new Error('Invalid interval value')
            };
        }
        this.isRunning = true;
        let executionCount = 0;
        let lastResult = null;
        try {
            return await new Promise((resolve, reject) => {
                const executeAction = async () => {
                    if (!this.isRunning) {
                        this.cleanup();
                        resolve({
                            success: true,
                            data: {
                                executions: executionCount,
                                interrupted: true,
                                lastResult
                            }
                        });
                        return;
                    }
                    try {
                        lastResult = await this.body.execute(context);
                        executionCount++;
                        // 检查是否达到最大执行次数
                        if (this.maxExecutions && executionCount >= this.maxExecutions) {
                            this.cleanup();
                            resolve({
                                success: true,
                                data: {
                                    executions: executionCount,
                                    completed: true,
                                    lastResult
                                }
                            });
                            return;
                        }
                        // 设置下一次执行
                        this.timeoutId = setTimeout(executeAction, this.interval);
                    }
                    catch (error) {
                        this.cleanup();
                        reject(error);
                    }
                };
                // 是否立即执行第一次
                if (this.immediate) {
                    executeAction();
                }
                else {
                    this.timeoutId = setTimeout(executeAction, this.interval);
                }
            });
        }
        catch (error) {
            return {
                success: false,
                error: error,
                data: {
                    executions: executionCount,
                    lastResult
                }
            };
        }
    }
    async compensate(context) {
        this.cleanup();
    }
    cleanup() {
        this.isRunning = false;
        if (this.timeoutId) {
            clearTimeout(this.timeoutId);
            this.timeoutId = null;
        }
    }
};
exports.IntervalActivity = IntervalActivity;
tslib_1.__decorate([
    (0, components_1.Attribute)(),
    tslib_1.__metadata("design:type", Number)
], IntervalActivity.prototype, "interval", void 0);
tslib_1.__decorate([
    (0, components_1.Attribute)(),
    tslib_1.__metadata("design:type", Activity_1.Activity)
], IntervalActivity.prototype, "body", void 0);
tslib_1.__decorate([
    (0, components_1.Attribute)(),
    tslib_1.__metadata("design:type", Object)
], IntervalActivity.prototype, "maxExecutions", void 0);
tslib_1.__decorate([
    (0, components_1.Attribute)(),
    tslib_1.__metadata("design:type", Object)
], IntervalActivity.prototype, "immediate", void 0);
exports.IntervalActivity = IntervalActivity = tslib_1.__decorate([
    (0, components_1.Directive)({ selector: 'interval' })
], IntervalActivity);
//# sourceMappingURL=Interval.js.map