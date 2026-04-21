"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProcessActivity = void 0;
const tslib_1 = require("tslib");
const components_1 = require("@tsdi/components");
const Activity_1 = require("./Activity");
let ProcessActivity = class ProcessActivity extends Activity_1.Activity {
    async execute(context) {
        try {
            // 验证数据
            if (this.validator) {
                const isValid = await this.validator(context);
                if (!isValid) {
                    return {
                        success: false,
                        error: new Error('Data validation failed'),
                        data: { validationFailed: true }
                    };
                }
            }
            this.onProgress?.(0, 0, 1);
            // 处理数据
            const result = await this.body.execute(context);
            return {
                success: true,
                data: result
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
            return {
                success: false,
                error: error,
                data: {
                    processed: false,
                    error: error
                }
            };
        }
    }
};
exports.ProcessActivity = ProcessActivity;
tslib_1.__decorate([
    (0, components_1.Attribute)(),
    tslib_1.__metadata("design:type", Function)
], ProcessActivity.prototype, "onProgress", void 0);
tslib_1.__decorate([
    (0, components_1.Attribute)(),
    tslib_1.__metadata("design:type", Function)
], ProcessActivity.prototype, "onError", void 0);
tslib_1.__decorate([
    (0, components_1.Attribute)(),
    tslib_1.__metadata("design:type", Function)
], ProcessActivity.prototype, "validator", void 0);
tslib_1.__decorate([
    (0, components_1.Attribute)(),
    tslib_1.__metadata("design:type", Activity_1.Activity)
], ProcessActivity.prototype, "body", void 0);
exports.ProcessActivity = ProcessActivity = tslib_1.__decorate([
    (0, components_1.Directive)({ selector: 'process' })
], ProcessActivity);
//# sourceMappingURL=Process.js.map