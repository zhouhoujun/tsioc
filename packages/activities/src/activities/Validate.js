"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PatternActivity = exports.RangeActivity = exports.RequiredActivity = exports.ValidateActivity = void 0;
const tslib_1 = require("tslib");
const components_1 = require("@tsdi/components");
const Activity_1 = require("./Activity");
let ValidateActivity = class ValidateActivity extends Activity_1.Activity {
    constructor() {
        super(...arguments);
        this.rules = [];
        this.stopOnFirstError = true;
        this.throwOnError = false;
    }
    async execute(context) {
        try {
            const validationErrors = {};
            let isValid = true;
            for (const rule of this.rules) {
                const value = this.data?.[rule.field];
                const result = await rule.validator(value, context);
                if (result !== true) {
                    isValid = false;
                    const errorMessage = typeof result === 'string' ? result : rule.message || `Validation failed for field: ${rule.field}`;
                    if (!validationErrors[rule.field]) {
                        validationErrors[rule.field] = [];
                    }
                    validationErrors[rule.field].push(errorMessage);
                    if (this.stopOnFirstError) {
                        break;
                    }
                }
            }
            if (!isValid && this.throwOnError) {
                throw new Error(`Validation failed: ${JSON.stringify(validationErrors)}`);
            }
            context.validationErrors = validationErrors;
            return {
                success: isValid,
                data: {
                    isValid,
                    errors: validationErrors,
                    validatedFields: this.rules.map(r => r.field)
                }
            };
        }
        catch (error) {
            return {
                success: false,
                error: error,
                data: { data: this.data }
            };
        }
    }
};
exports.ValidateActivity = ValidateActivity;
tslib_1.__decorate([
    (0, components_1.Attribute)(),
    tslib_1.__metadata("design:type", Object)
], ValidateActivity.prototype, "data", void 0);
tslib_1.__decorate([
    (0, components_1.Attribute)(),
    tslib_1.__metadata("design:type", Array)
], ValidateActivity.prototype, "rules", void 0);
tslib_1.__decorate([
    (0, components_1.Attribute)(),
    tslib_1.__metadata("design:type", Boolean)
], ValidateActivity.prototype, "stopOnFirstError", void 0);
tslib_1.__decorate([
    (0, components_1.Attribute)(),
    tslib_1.__metadata("design:type", Boolean)
], ValidateActivity.prototype, "throwOnError", void 0);
exports.ValidateActivity = ValidateActivity = tslib_1.__decorate([
    (0, components_1.Directive)({ selector: 'validate' })
], ValidateActivity);
let RequiredActivity = class RequiredActivity extends Activity_1.Activity {
    constructor() {
        super(...arguments);
        this.message = 'Field is required';
    }
    async execute(context) {
        const value = context.data?.[this.field];
        const isValid = value !== undefined && value !== null && value !== '';
        return {
            success: isValid,
            data: {
                field: this.field,
                isValid,
                error: isValid ? undefined : this.message
            }
        };
    }
};
exports.RequiredActivity = RequiredActivity;
tslib_1.__decorate([
    (0, components_1.Attribute)(),
    tslib_1.__metadata("design:type", String)
], RequiredActivity.prototype, "field", void 0);
tslib_1.__decorate([
    (0, components_1.Attribute)(),
    tslib_1.__metadata("design:type", String)
], RequiredActivity.prototype, "message", void 0);
exports.RequiredActivity = RequiredActivity = tslib_1.__decorate([
    (0, components_1.Directive)({ selector: 'required' })
], RequiredActivity);
let RangeActivity = class RangeActivity extends Activity_1.Activity {
    async execute(context) {
        const value = context.data?.[this.field];
        if (typeof value !== 'number') {
            return {
                success: false,
                error: new Error(`Field ${this.field} is not a number`),
                data: { field: this.field, value }
            };
        }
        let isValid = true;
        const errors = [];
        if (this.min !== undefined && value < this.min) {
            isValid = false;
            errors.push(`Value must be at least ${this.min}`);
        }
        if (this.max !== undefined && value > this.max) {
            isValid = false;
            errors.push(`Value must be at most ${this.max}`);
        }
        return {
            success: isValid,
            data: {
                field: this.field,
                value,
                isValid,
                errors: errors.length > 0 ? errors : undefined
            }
        };
    }
};
exports.RangeActivity = RangeActivity;
tslib_1.__decorate([
    (0, components_1.Attribute)(),
    tslib_1.__metadata("design:type", String)
], RangeActivity.prototype, "field", void 0);
tslib_1.__decorate([
    (0, components_1.Attribute)(),
    tslib_1.__metadata("design:type", Number)
], RangeActivity.prototype, "min", void 0);
tslib_1.__decorate([
    (0, components_1.Attribute)(),
    tslib_1.__metadata("design:type", Number)
], RangeActivity.prototype, "max", void 0);
tslib_1.__decorate([
    (0, components_1.Attribute)(),
    tslib_1.__metadata("design:type", String)
], RangeActivity.prototype, "message", void 0);
exports.RangeActivity = RangeActivity = tslib_1.__decorate([
    (0, components_1.Directive)({ selector: 'range' })
], RangeActivity);
let PatternActivity = class PatternActivity extends Activity_1.Activity {
    async execute(context) {
        const value = context.data?.[this.field];
        if (typeof value !== 'string') {
            return {
                success: false,
                error: new Error(`Field ${this.field} is not a string`),
                data: { field: this.field, value }
            };
        }
        const regex = typeof this.pattern === 'string' ? new RegExp(this.pattern) : this.pattern;
        const isValid = regex.test(value);
        return {
            success: isValid,
            data: {
                field: this.field,
                value,
                isValid,
                error: isValid ? undefined : (this.message || `Value does not match pattern: ${this.pattern}`)
            }
        };
    }
};
exports.PatternActivity = PatternActivity;
tslib_1.__decorate([
    (0, components_1.Attribute)(),
    tslib_1.__metadata("design:type", String)
], PatternActivity.prototype, "field", void 0);
tslib_1.__decorate([
    (0, components_1.Attribute)(),
    tslib_1.__metadata("design:type", Object)
], PatternActivity.prototype, "pattern", void 0);
tslib_1.__decorate([
    (0, components_1.Attribute)(),
    tslib_1.__metadata("design:type", String)
], PatternActivity.prototype, "message", void 0);
exports.PatternActivity = PatternActivity = tslib_1.__decorate([
    (0, components_1.Directive)({ selector: 'pattern' })
], PatternActivity);
//# sourceMappingURL=Validate.js.map