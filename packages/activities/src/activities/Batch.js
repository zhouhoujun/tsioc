"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SplitActivity = exports.MergeActivity = exports.BatchActivity = void 0;
const tslib_1 = require("tslib");
const components_1 = require("@tsdi/components");
const Activity_1 = require("./Activity");
let BatchActivity = class BatchActivity extends Activity_1.Activity {
    constructor() {
        super(...arguments);
        this.items = [];
        this.batchSize = 10;
        this.continueOnError = false;
        this.delayBetweenBatches = 0;
    }
    async execute(context) {
        if (!this.items || this.items.length === 0) {
            return {
                success: true,
                data: { processed: 0, batches: 0 }
            };
        }
        if (!this.body) {
            return {
                success: false,
                error: new Error('BatchActivity requires a body activity')
            };
        }
        const batches = this.createBatches();
        const results = [];
        const errors = [];
        let processedCount = 0;
        context.batchResults = [];
        for (let i = 0; i < batches.length; i++) {
            const batch = batches[i];
            try {
                const batchContext = {
                    ...context,
                    batchResults: results
                };
                for (const item of batch) {
                    const result = await this.body.execute({
                        ...batchContext,
                        currentItem: item,
                        currentIndex: this.items.indexOf(item)
                    });
                    results.push(result);
                    processedCount++;
                    if (!result.success && !this.continueOnError) {
                        return {
                            success: false,
                            error: result.error,
                            data: {
                                processed: processedCount,
                                batches: i + 1,
                                results,
                                failedBatch: i,
                                failedItem: item
                            }
                        };
                    }
                }
                if (this.delayBetweenBatches > 0 && i < batches.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, this.delayBetweenBatches));
                }
            }
            catch (error) {
                errors.push(error);
                if (!this.continueOnError) {
                    return {
                        success: false,
                        error: error,
                        data: {
                            processed: processedCount,
                            batches: i + 1,
                            results,
                            errors
                        }
                    };
                }
            }
        }
        context.batchResults = results;
        return {
            success: errors.length === 0,
            data: {
                processed: processedCount,
                batches: batches.length,
                results,
                errors: errors.length > 0 ? errors : undefined
            }
        };
    }
    createBatches() {
        const batches = [];
        for (let i = 0; i < this.items.length; i += this.batchSize) {
            batches.push(this.items.slice(i, i + this.batchSize));
        }
        return batches;
    }
};
exports.BatchActivity = BatchActivity;
tslib_1.__decorate([
    (0, components_1.Attribute)(),
    tslib_1.__metadata("design:type", Array)
], BatchActivity.prototype, "items", void 0);
tslib_1.__decorate([
    (0, components_1.Attribute)(),
    tslib_1.__metadata("design:type", Activity_1.Activity)
], BatchActivity.prototype, "body", void 0);
tslib_1.__decorate([
    (0, components_1.Attribute)(),
    tslib_1.__metadata("design:type", Number)
], BatchActivity.prototype, "batchSize", void 0);
tslib_1.__decorate([
    (0, components_1.Attribute)(),
    tslib_1.__metadata("design:type", Boolean)
], BatchActivity.prototype, "continueOnError", void 0);
tslib_1.__decorate([
    (0, components_1.Attribute)(),
    tslib_1.__metadata("design:type", Number)
], BatchActivity.prototype, "delayBetweenBatches", void 0);
exports.BatchActivity = BatchActivity = tslib_1.__decorate([
    (0, components_1.Directive)({ selector: 'batch' })
], BatchActivity);
let MergeActivity = class MergeActivity extends Activity_1.Activity {
    constructor() {
        super(...arguments);
        this.sources = [];
        this.strategy = 'object';
        this.deep = false;
    }
    async execute(context) {
        try {
            let result;
            switch (this.strategy) {
                case 'object':
                    result = this.mergeObjects();
                    break;
                case 'array':
                    result = this.mergeArrays();
                    break;
                case 'concat':
                    result = this.concatAll();
                    break;
                default:
                    result = this.mergeObjects();
            }
            return {
                success: true,
                data: {
                    merged: result,
                    sourceCount: this.sources.length
                }
            };
        }
        catch (error) {
            return {
                success: false,
                error: error
            };
        }
    }
    mergeObjects() {
        if (this.deep) {
            return this.sources.reduce((acc, src) => this.deepMerge(acc, src), {});
        }
        return Object.assign({}, ...this.sources);
    }
    deepMerge(target, source) {
        const output = { ...target };
        for (const key in source) {
            if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
                output[key] = this.deepMerge(target[key] || {}, source[key]);
            }
            else {
                output[key] = source[key];
            }
        }
        return output;
    }
    mergeArrays() {
        return this.sources.flat();
    }
    concatAll() {
        if (this.sources.every(s => typeof s === 'string')) {
            return this.sources.join('');
        }
        if (this.sources.every(s => Array.isArray(s))) {
            return this.sources.flat();
        }
        return this.sources;
    }
};
exports.MergeActivity = MergeActivity;
tslib_1.__decorate([
    (0, components_1.Attribute)(),
    tslib_1.__metadata("design:type", Array)
], MergeActivity.prototype, "sources", void 0);
tslib_1.__decorate([
    (0, components_1.Attribute)(),
    tslib_1.__metadata("design:type", String)
], MergeActivity.prototype, "strategy", void 0);
tslib_1.__decorate([
    (0, components_1.Attribute)(),
    tslib_1.__metadata("design:type", Boolean)
], MergeActivity.prototype, "deep", void 0);
exports.MergeActivity = MergeActivity = tslib_1.__decorate([
    (0, components_1.Directive)({ selector: 'merge' })
], MergeActivity);
let SplitActivity = class SplitActivity extends Activity_1.Activity {
    constructor() {
        super(...arguments);
        this.delimiter = ',';
    }
    async execute(context) {
        try {
            let result;
            if (typeof this.input === 'string') {
                result = this.input.split(this.delimiter);
            }
            else if (Array.isArray(this.input)) {
                if (this.chunkSize) {
                    result = [];
                    for (let i = 0; i < this.input.length; i += this.chunkSize) {
                        result.push(this.input.slice(i, i + this.chunkSize));
                    }
                }
                else {
                    result = this.input;
                }
            }
            else {
                throw new Error('Input must be a string or array');
            }
            return {
                success: true,
                data: {
                    parts: result,
                    count: result.length
                }
            };
        }
        catch (error) {
            return {
                success: false,
                error: error
            };
        }
    }
};
exports.SplitActivity = SplitActivity;
tslib_1.__decorate([
    (0, components_1.Attribute)(),
    tslib_1.__metadata("design:type", Object)
], SplitActivity.prototype, "input", void 0);
tslib_1.__decorate([
    (0, components_1.Attribute)(),
    tslib_1.__metadata("design:type", String)
], SplitActivity.prototype, "delimiter", void 0);
tslib_1.__decorate([
    (0, components_1.Attribute)(),
    tslib_1.__metadata("design:type", Number)
], SplitActivity.prototype, "chunkSize", void 0);
exports.SplitActivity = SplitActivity = tslib_1.__decorate([
    (0, components_1.Directive)({ selector: 'split' })
], SplitActivity);
//# sourceMappingURL=Batch.js.map