"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ThrowActivity = void 0;
const tslib_1 = require("tslib");
const Activity_1 = require("./Activity");
const components_1 = require("@tsdi/components");
let ThrowActivity = class ThrowActivity extends Activity_1.Activity {
    constructor() {
        super(...arguments);
        this.options = {};
    }
    async execute(context) {
        if (!context.error) {
            return {
                success: false,
                error: new Error('No error specified to throw')
            };
        }
        // 创建错误对象
        const error = typeof context.error === 'string'
            ? new Error(context.error)
            : context.error;
        // 添加错误代码和详情
        if (context.code || this.options.defaultErrorCode) {
            error.code = context.code ?? this.options.defaultErrorCode;
        }
        if (context.details) {
            error.details = context.details;
        }
        return {
            success: false,
            error,
            data: {
                thrown: true,
                timestamp: Date.now(),
                code: error.code,
                details: error.details
            }
        };
    }
    async compensate(context) {
        // ThrowActivity 不需要补偿操作
    }
};
exports.ThrowActivity = ThrowActivity;
tslib_1.__decorate([
    (0, components_1.Attribute)(),
    tslib_1.__metadata("design:type", Object)
], ThrowActivity.prototype, "options", void 0);
exports.ThrowActivity = ThrowActivity = tslib_1.__decorate([
    (0, components_1.Directive)({ selector: 'throw' })
], ThrowActivity);
//# sourceMappingURL=Throw.js.map