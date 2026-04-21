"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TimerActivity = void 0;
const tslib_1 = require("tslib");
const components_1 = require("@tsdi/components");
const Activity_1 = require("./Activity");
let TimerActivity = class TimerActivity extends Activity_1.Activity {
    constructor() {
        super(...arguments);
        this.timerId = null;
        this.intervalId = null;
        this.isRunning = false;
    }
    async execute(context) {
        if (!this.type) {
            return {
                success: false,
                error: new Error('Timer type is required')
            };
        }
        this.isRunning = true;
        const executionCount = 0;
        try {
            switch (this.type) {
                case 'timeout':
                    return await this.executeTimeout(context);
                case 'interval':
                    return await this.executeInterval(context, executionCount);
                case 'date':
                    return await this.executeDate(context);
                default:
                    return {
                        success: false,
                        error: new Error(`Unsupported timer type: ${this.type}`)
                    };
            }
        }
        catch (error) {
            return {
                success: false,
                error: error,
                data: {
                    type: this.type,
                    executionCount
                }
            };
        }
    }
    async executeTimeout(context) {
        const delay = this.delay;
        return new Promise((resolve) => {
            this.timerId = setTimeout(async () => {
                try {
                    // if (context.callback) {
                    //     await context.callback(context);
                    // }
                    // context.onComplete?.();
                    resolve({
                        success: true,
                        data: {
                            type: 'timeout',
                            delay,
                            executed: true
                        }
                    });
                }
                catch (error) {
                    resolve({
                        success: false,
                        error: error,
                        data: {
                            type: 'timeout',
                            delay,
                            executed: false
                        }
                    });
                }
            }, delay);
        });
    }
    async executeInterval(context, executionCount) {
        const interval = this.interval;
        const immediate = this.immediate;
        const maxRepeats = this.maxRepeats;
        return new Promise((resolve) => {
            const executeInterval = async () => {
                if (!this.isRunning) {
                    this.cleanup();
                    resolve({
                        success: true,
                        data: {
                            type: 'interval',
                            interval,
                            executionCount,
                            interrupted: true
                        }
                    });
                    return;
                }
                try {
                    await this.body.execute(context);
                    executionCount++;
                    if (maxRepeats && executionCount >= maxRepeats) {
                        this.cleanup();
                        // context.onComplete?.();
                        resolve({
                            success: true,
                            data: {
                                type: 'interval',
                                interval,
                                executionCount,
                                completed: true
                            }
                        });
                        return;
                    }
                    this.intervalId = setTimeout(executeInterval, interval);
                }
                catch (error) {
                    this.cleanup();
                    resolve({
                        success: false,
                        error: error,
                        data: {
                            type: 'interval',
                            interval,
                            executionCount
                        }
                    });
                }
            };
            if (immediate) {
                executeInterval();
            }
            else {
                this.intervalId = setTimeout(executeInterval, interval);
            }
        });
    }
    async executeDate(context) {
        if (!this.targetDate) {
            return {
                success: false,
                error: new Error('Target date is required for date timer type')
            };
        }
        const now = Date.now();
        const targetTime = this.targetDate.getTime();
        const delay = Math.max(0, targetTime - now);
        if (delay === 0) {
            try {
                // if (context.callback) {
                //     await context.callback(context);
                // }
                // context.onComplete?.();
                return {
                    success: true,
                    data: {
                        type: 'date',
                        targetDate: this.targetDate,
                        executed: true
                    }
                };
            }
            catch (error) {
                return {
                    success: false,
                    error: error,
                    data: {
                        type: 'date',
                        targetDate: this.targetDate,
                        executed: false
                    }
                };
            }
        }
        return new Promise((resolve) => {
            this.timerId = setTimeout(async () => {
                try {
                    // if (context.callback) {
                    //     await context.callback(context);
                    // }
                    // context.onComplete?.();
                    resolve({
                        success: true,
                        data: {
                            type: 'date',
                            targetDate: this.targetDate,
                            executed: true
                        }
                    });
                }
                catch (error) {
                    resolve({
                        success: false,
                        error: error,
                        data: {
                            type: 'date',
                            targetDate: this.targetDate,
                            executed: false
                        }
                    });
                }
            }, delay);
        });
    }
    async compensate(context) {
        this.cleanup();
    }
    cleanup() {
        this.isRunning = false;
        if (this.timerId) {
            clearTimeout(this.timerId);
            this.timerId = null;
        }
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
    }
};
exports.TimerActivity = TimerActivity;
tslib_1.__decorate([
    (0, components_1.Attribute)(),
    tslib_1.__metadata("design:type", String)
], TimerActivity.prototype, "type", void 0);
tslib_1.__decorate([
    (0, components_1.Attribute)(),
    tslib_1.__metadata("design:type", Number)
], TimerActivity.prototype, "delay", void 0);
tslib_1.__decorate([
    (0, components_1.Attribute)(),
    tslib_1.__metadata("design:type", Date)
], TimerActivity.prototype, "targetDate", void 0);
tslib_1.__decorate([
    (0, components_1.Attribute)(),
    tslib_1.__metadata("design:type", Number)
], TimerActivity.prototype, "interval", void 0);
tslib_1.__decorate([
    (0, components_1.Attribute)(),
    tslib_1.__metadata("design:type", Number)
], TimerActivity.prototype, "maxRepeats", void 0);
tslib_1.__decorate([
    (0, components_1.Attribute)(),
    tslib_1.__metadata("design:type", Boolean)
], TimerActivity.prototype, "immediate", void 0);
tslib_1.__decorate([
    (0, components_1.Attribute)(),
    tslib_1.__metadata("design:type", Activity_1.Activity)
], TimerActivity.prototype, "body", void 0);
exports.TimerActivity = TimerActivity = tslib_1.__decorate([
    (0, components_1.Directive)({ selector: 'timer' })
], TimerActivity);
//# sourceMappingURL=Timer.js.map