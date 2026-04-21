"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SwitchActivity = void 0;
const tslib_1 = require("tslib");
const components_1 = require("@tsdi/components");
const Activity_1 = require("./Activity");
let SwitchActivity = class SwitchActivity extends Activity_1.Activity {
    constructor() {
        super(...arguments);
        /**
         * case 活动列表
         */
        this.cases = [];
    }
    async execute(context) {
        if (!this.cases || this.cases.length === 0) {
            return {
                success: false,
                error: new Error('No cases provided for switch activity')
            };
        }
        const breakOnMatch = this.breakOnMatch;
        const results = [];
        const errors = [];
        let matched = false;
        try {
            // 执行所有 case
            for (const caseActivity of this.cases) {
                const result = await caseActivity.execute(context);
                results.push(result);
                // 检查是否有匹配的 case
                if (result.data?.matched) {
                    matched = true;
                    if (breakOnMatch) {
                        break;
                    }
                }
                // 如果 case 执行失败，收集错误
                if (!result.success) {
                    errors.push(result.error);
                }
            }
            // 如果没有匹配的 case 且有默认活动，执行默认活动
            if (!matched && this.defaultActivity) {
                const defaultResult = await this.defaultActivity.execute(context);
                results.push(defaultResult);
                if (!defaultResult.success) {
                    errors.push(defaultResult.error);
                }
            }
            // 返回执行结果
            return {
                success: errors.length === 0,
                error: errors.length > 0 ? errors[0] : undefined,
                data: {
                    matched,
                    results,
                    errors: errors.length > 0 ? errors : undefined
                }
            };
        }
        catch (error) {
            // 如果有自定义错误处理器，使用它
            return {
                success: false,
                error: error
            };
        }
    }
    async compensate(context) {
        // 按相反顺序执行所有匹配的 case 的补偿操作
        const compensations = [];
        // 找到最后一个匹配的 case
        let lastMatchedCase;
        // 如果有匹配的 case，执行其补偿操作
        if (lastMatchedCase?.compensate) {
            compensations.push(lastMatchedCase.compensate(context));
        }
        // 如果有默认活动且没有匹配的 case，执行其补偿操作
        if (!lastMatchedCase && this.defaultActivity?.compensate) {
            compensations.push(this.defaultActivity.compensate(context));
        }
        await Promise.all(compensations);
    }
};
exports.SwitchActivity = SwitchActivity;
tslib_1.__decorate([
    (0, components_1.Attribute)(),
    tslib_1.__metadata("design:type", Array)
], SwitchActivity.prototype, "cases", void 0);
exports.SwitchActivity = SwitchActivity = tslib_1.__decorate([
    (0, components_1.Directive)({ selector: 'switch' })
], SwitchActivity);
//# sourceMappingURL=Switch.js.map