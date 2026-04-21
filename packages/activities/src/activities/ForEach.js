"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ForEachActivity = void 0;
const tslib_1 = require("tslib");
const components_1 = require("@tsdi/components");
const Activity_1 = require("./Activity");
let ForEachActivity = class ForEachActivity extends Activity_1.Activity {
    constructor() {
        super(...arguments);
        this.items = [];
        this.parallel = false;
        this.maxConcurrency = 5;
        this.continueOnError = false;
    }
    async execute(context) {
        if (!this.items || this.items.length === 0) {
            return {
                success: true,
                data: { processed: 0, results: [] }
            };
        }
        if (!this.body) {
            return {
                success: false,
                error: new Error('ForEachActivity requires a body activity')
            };
        }
        const results = [];
        const errors = [];
        if (this.parallel) {
            const batches = this.createBatches(this.items, this.maxConcurrency);
            for (const batch of batches) {
                const batchResults = await Promise.all(batch.map(async (item, index) => {
                    const itemContext = {
                        ...context,
                        currentItem: item,
                        currentIndex: this.items.indexOf(item)
                    };
                    try {
                        return await this.body.execute(itemContext);
                    }
                    catch (error) {
                        return {
                            success: false,
                            error: error,
                            data: { item, index: this.items.indexOf(item) }
                        };
                    }
                }));
                results.push(...batchResults);
                if (!this.continueOnError) {
                    const failedResult = batchResults.find(r => !r.success);
                    if (failedResult) {
                        return {
                            success: false,
                            error: failedResult.error,
                            data: { processed: results.length, results, errors }
                        };
                    }
                }
            }
        }
        else {
            for (let i = 0; i < this.items.length; i++) {
                const itemContext = {
                    ...context,
                    currentItem: this.items[i],
                    currentIndex: i
                };
                try {
                    const result = await this.body.execute(itemContext);
                    results.push(result);
                    if (!result.success && !this.continueOnError) {
                        return {
                            success: false,
                            error: result.error,
                            data: { processed: i + 1, results, failedIndex: i }
                        };
                    }
                }
                catch (error) {
                    const errorResult = {
                        success: false,
                        error: error,
                        data: { item: this.items[i], index: i }
                    };
                    results.push(errorResult);
                    errors.push(error);
                    if (!this.continueOnError) {
                        return {
                            success: false,
                            error: error,
                            data: { processed: i + 1, results, failedIndex: i }
                        };
                    }
                }
            }
        }
        const successCount = results.filter(r => r.success).length;
        const failCount = results.filter(r => !r.success).length;
        return {
            success: failCount === 0,
            data: {
                processed: results.length,
                successCount,
                failCount,
                results
            }
        };
    }
    createBatches(items, batchSize) {
        const batches = [];
        for (let i = 0; i < items.length; i += batchSize) {
            batches.push(items.slice(i, i + batchSize));
        }
        return batches;
    }
};
exports.ForEachActivity = ForEachActivity;
tslib_1.__decorate([
    (0, components_1.Attribute)(),
    tslib_1.__metadata("design:type", Array)
], ForEachActivity.prototype, "items", void 0);
tslib_1.__decorate([
    (0, components_1.Attribute)(),
    tslib_1.__metadata("design:type", Activity_1.Activity)
], ForEachActivity.prototype, "body", void 0);
tslib_1.__decorate([
    (0, components_1.Attribute)(),
    tslib_1.__metadata("design:type", Boolean)
], ForEachActivity.prototype, "parallel", void 0);
tslib_1.__decorate([
    (0, components_1.Attribute)(),
    tslib_1.__metadata("design:type", Number)
], ForEachActivity.prototype, "maxConcurrency", void 0);
tslib_1.__decorate([
    (0, components_1.Attribute)(),
    tslib_1.__metadata("design:type", Boolean)
], ForEachActivity.prototype, "continueOnError", void 0);
exports.ForEachActivity = ForEachActivity = tslib_1.__decorate([
    (0, components_1.Directive)({ selector: 'foreach' })
], ForEachActivity);
//# sourceMappingURL=ForEach.js.map