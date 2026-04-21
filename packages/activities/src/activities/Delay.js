"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DelayActivity = void 0;
const tslib_1 = require("tslib");
const components_1 = require("@tsdi/components");
const Activity_1 = require("./Activity");
let DelayActivity = class DelayActivity extends Activity_1.Activity {
    constructor() {
        super(...arguments);
        this.abortController = null;
    }
    execute(context) {
        return new Promise((resolve, reject) => {
            // 设置中断处理
            if (this.abortController) {
                this.abortController.signal.addEventListener('abort', () => {
                    reject(new DOMException('Delay aborted', 'AbortError'));
                });
            }
            setTimeout(resolve, this.duration);
        })
            .then(() => this.body ? this.body.execute(context) : ({ success: true, data: { completed: true } }))
            .catch(error => {
            return {
                success: false,
                data: { interrupted: true },
                error
            };
        })
            .finally(() => [
            this.abortController = null
        ]);
    }
    async compensate(context) {
        // 中断当前延迟
        if (this.abortController) {
            this.abortController.abort();
        }
    }
};
exports.DelayActivity = DelayActivity;
tslib_1.__decorate([
    (0, components_1.Attribute)(),
    tslib_1.__metadata("design:type", Number)
], DelayActivity.prototype, "duration", void 0);
tslib_1.__decorate([
    (0, components_1.Attribute)(),
    tslib_1.__metadata("design:type", Object)
], DelayActivity.prototype, "body", void 0);
exports.DelayActivity = DelayActivity = tslib_1.__decorate([
    (0, components_1.Directive)({ selector: 'delay' })
], DelayActivity);
//# sourceMappingURL=Delay.js.map