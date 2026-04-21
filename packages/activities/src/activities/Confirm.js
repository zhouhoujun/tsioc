"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConfirmActivity = exports.DirConfirmContext = void 0;
const tslib_1 = require("tslib");
const Activity_1 = require("./Activity");
const components_1 = require("@tsdi/components");
/**
 * confirm context
 */
class DirConfirmContext {
    constructor() {
        this.$implicit = null;
        this.dirConfirm = null;
    }
}
exports.DirConfirmContext = DirConfirmContext;
let ConfirmActivity = class ConfirmActivity extends Activity_1.Activity {
    async execute(context) {
        try {
            // 如果提供了自定义确认回调，使用它
            if (context.confirmCallback) {
                const confirmed = await context.confirmCallback();
                return {
                    success: confirmed,
                    data: {
                        confirmed,
                        timestamp: Date.now()
                    }
                };
            }
            // 使用默认的确认机制
            const message = context.message || this.options?.message || 'Please confirm this action';
            const title = context.title || this.options?.title || 'Confirmation';
            // 这里可以实现具体的确认UI逻辑
            // 为演示目的，我们返回一个 Promise
            return new Promise((resolve) => {
                const confirmed = window.confirm(`${title}\n${message}`);
                resolve({
                    success: confirmed,
                    data: {
                        confirmed,
                        timestamp: Date.now()
                    }
                });
            });
        }
        catch (error) {
            return {
                success: false,
                error: error
            };
        }
    }
    async compensate(context) {
        if (context.cancelCallback) {
            await context.cancelCallback();
        }
    }
};
exports.ConfirmActivity = ConfirmActivity;
tslib_1.__decorate([
    (0, components_1.Attribute)(),
    tslib_1.__metadata("design:type", Object)
], ConfirmActivity.prototype, "options", void 0);
exports.ConfirmActivity = ConfirmActivity = tslib_1.__decorate([
    (0, components_1.Directive)({ selector: 'confirm' })
], ConfirmActivity);
//# sourceMappingURL=Confirm.js.map