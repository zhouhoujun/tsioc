"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CaseActivity = void 0;
const tslib_1 = require("tslib");
const components_1 = require("@tsdi/components");
const Activity_1 = require("./Activity");
let CaseActivity = class CaseActivity extends Activity_1.Activity {
    async execute(context) {
        if (!this.body) {
            return {
                success: false,
                error: new Error('No activity provided for case activity')
            };
        }
        try {
            // 执行活动
            return await this.body.execute(context);
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
        // 如果条件匹配，执行补偿操作
        if (this.body.compensate) {
            await this.body.compensate(context);
        }
    }
};
exports.CaseActivity = CaseActivity;
tslib_1.__decorate([
    (0, components_1.Attribute)('case'),
    tslib_1.__metadata("design:type", Object)
], CaseActivity.prototype, "caseFlag", void 0);
tslib_1.__decorate([
    (0, components_1.Attribute)(),
    tslib_1.__metadata("design:type", Activity_1.Activity)
], CaseActivity.prototype, "body", void 0);
tslib_1.__decorate([
    (0, components_1.Attribute)(),
    tslib_1.__metadata("design:type", Function)
], CaseActivity.prototype, "onError", void 0);
exports.CaseActivity = CaseActivity = tslib_1.__decorate([
    (0, components_1.Directive)({ selector: 'case' })
], CaseActivity);
//# sourceMappingURL=Case.js.map