"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReduceActivity = exports.FilterActivity = exports.MapActivity = exports.TransformActivity = void 0;
const tslib_1 = require("tslib");
const components_1 = require("@tsdi/components");
const Activity_1 = require("./Activity");
let TransformActivity = class TransformActivity extends Activity_1.Activity {
    constructor() {
        super(...arguments);
        this.chain = [];
    }
    async execute(context) {
        try {
            let data = this.input ?? context.input;
            if (typeof this.transform === 'function') {
                data = await this.transform(data, context);
            }
            for (const fn of this.chain) {
                data = await fn(data, context);
            }
            if (this.outputKey) {
                context[this.outputKey] = data;
            }
            return {
                success: true,
                data: {
                    input: this.input ?? context.input,
                    output: data,
                    transformed: true
                }
            };
        }
        catch (error) {
            return {
                success: false,
                error: error,
                data: { input: this.input }
            };
        }
    }
};
exports.TransformActivity = TransformActivity;
tslib_1.__decorate([
    (0, components_1.Attribute)(),
    tslib_1.__metadata("design:type", Object)
], TransformActivity.prototype, "transform", void 0);
tslib_1.__decorate([
    (0, components_1.Attribute)(),
    tslib_1.__metadata("design:type", Object)
], TransformActivity.prototype, "input", void 0);
tslib_1.__decorate([
    (0, components_1.Attribute)(),
    tslib_1.__metadata("design:type", String)
], TransformActivity.prototype, "outputKey", void 0);
tslib_1.__decorate([
    (0, components_1.Attribute)(),
    tslib_1.__metadata("design:type", Array)
], TransformActivity.prototype, "chain", void 0);
exports.TransformActivity = TransformActivity = tslib_1.__decorate([
    (0, components_1.Directive)({ selector: 'transform' })
], TransformActivity);
let MapActivity = class MapActivity extends Activity_1.Activity {
    constructor() {
        super(...arguments);
        this.items = [];
    }
    async execute(context) {
        try {
            const results = await Promise.all(this.items.map(async (item, index) => {
                return await this.mapper(item, index);
            }));
            return {
                success: true,
                data: { results, count: results.length }
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
exports.MapActivity = MapActivity;
tslib_1.__decorate([
    (0, components_1.Attribute)(),
    tslib_1.__metadata("design:type", Array)
], MapActivity.prototype, "items", void 0);
tslib_1.__decorate([
    (0, components_1.Attribute)(),
    tslib_1.__metadata("design:type", Function)
], MapActivity.prototype, "mapper", void 0);
exports.MapActivity = MapActivity = tslib_1.__decorate([
    (0, components_1.Directive)({ selector: 'map' })
], MapActivity);
let FilterActivity = class FilterActivity extends Activity_1.Activity {
    constructor() {
        super(...arguments);
        this.items = [];
    }
    async execute(context) {
        try {
            const results = this.items.filter(this.predicate);
            return {
                success: true,
                data: {
                    results,
                    originalCount: this.items.length,
                    filteredCount: results.length
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
exports.FilterActivity = FilterActivity;
tslib_1.__decorate([
    (0, components_1.Attribute)(),
    tslib_1.__metadata("design:type", Array)
], FilterActivity.prototype, "items", void 0);
tslib_1.__decorate([
    (0, components_1.Attribute)(),
    tslib_1.__metadata("design:type", Function)
], FilterActivity.prototype, "predicate", void 0);
exports.FilterActivity = FilterActivity = tslib_1.__decorate([
    (0, components_1.Directive)({ selector: 'filter' })
], FilterActivity);
let ReduceActivity = class ReduceActivity extends Activity_1.Activity {
    constructor() {
        super(...arguments);
        this.items = [];
    }
    async execute(context) {
        try {
            const result = this.items.reduce(this.reducer, this.initialValue);
            return {
                success: true,
                data: { result, itemCount: this.items.length }
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
exports.ReduceActivity = ReduceActivity;
tslib_1.__decorate([
    (0, components_1.Attribute)(),
    tslib_1.__metadata("design:type", Array)
], ReduceActivity.prototype, "items", void 0);
tslib_1.__decorate([
    (0, components_1.Attribute)(),
    tslib_1.__metadata("design:type", Function)
], ReduceActivity.prototype, "reducer", void 0);
tslib_1.__decorate([
    (0, components_1.Attribute)(),
    tslib_1.__metadata("design:type", Object)
], ReduceActivity.prototype, "initialValue", void 0);
exports.ReduceActivity = ReduceActivity = tslib_1.__decorate([
    (0, components_1.Directive)({ selector: 'reduce' })
], ReduceActivity);
//# sourceMappingURL=Transform.js.map