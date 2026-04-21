"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IfActivity = void 0;
const tslib_1 = require("tslib");
const components_1 = require("@tsdi/components");
const Activity_1 = require("./Activity");
const Conditional_1 = require("./Conditional");
let IfActivity = class IfActivity extends Conditional_1.ConditionalActivity {
    async execute(context) {
        if (!this.thenActivity) {
            return {
                success: false,
                error: new Error('No then activity provided for if activity')
            };
        }
        try {
            // 根据条件选择要执行的活动
            const activityToExecute = this.condition ? this.thenActivity : this.elseActivity;
            // 如果没有 else 活动且条件为 false，返回成功结果
            if (!activityToExecute) {
                return {
                    success: true,
                    data: { condition: false }
                };
            }
            // 执行选定的活动
            const result = await activityToExecute.execute(context);
            return {
                success: result.success,
                error: result.error,
                data: {
                    condition: this.condition,
                    result: result.data
                }
            };
        }
        catch (error) {
            // 如果有自定义错误处理器，使用它
            if (this.onError) {
                try {
                    return await this.onError(error);
                }
                catch (handlerError) {
                    return {
                        success: false,
                        error: handlerError,
                        data: {
                            originalError: error,
                            handlerError: handlerError
                        }
                    };
                }
            }
            else {
                return {
                    success: false,
                    error: error
                };
            }
        }
    }
    async compensate(context) {
        // 根据条件执行补偿操作
        const activityToCompensate = this.condition ? this.thenActivity : this.elseActivity;
        if (activityToCompensate?.compensate) {
            await activityToCompensate.compensate(context);
        }
    }
};
exports.IfActivity = IfActivity;
tslib_1.__decorate([
    (0, components_1.Attribute)('then'),
    tslib_1.__metadata("design:type", Activity_1.Activity)
], IfActivity.prototype, "thenActivity", void 0);
tslib_1.__decorate([
    (0, components_1.Attribute)('else'),
    tslib_1.__metadata("design:type", Activity_1.Activity)
], IfActivity.prototype, "elseActivity", void 0);
tslib_1.__decorate([
    (0, components_1.Attribute)(),
    tslib_1.__metadata("design:type", Function)
], IfActivity.prototype, "onError", void 0);
exports.IfActivity = IfActivity = tslib_1.__decorate([
    (0, components_1.Directive)({
        selector: 'if'
    })
], IfActivity);
//# sourceMappingURL=If.js.map