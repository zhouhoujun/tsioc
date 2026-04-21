"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CodeActivity = void 0;
const tslib_1 = require("tslib");
const components_1 = require("@tsdi/components");
const Activity_1 = require("./Activity");
let CodeActivity = class CodeActivity extends Activity_1.Activity {
    constructor() {
        super(...arguments);
        this.timeout = 30000;
    }
    async execute(context) {
        if (!this.handler && !this.code) {
            return {
                success: false,
                error: new Error('No handler or code provided')
            };
        }
        const startTime = Date.now();
        try {
            if (this.handler) {
                const result = await Promise.race([
                    this.handler(context),
                    new Promise((_, reject) => setTimeout(() => reject(new Error('Execution timeout')), this.timeout))
                ]);
                return result;
            }
            return {
                success: true,
                data: { code: this.code, executed: true }
            };
        }
        catch (error) {
            return {
                success: false,
                error: error,
                data: { duration: Date.now() - startTime }
            };
        }
    }
};
exports.CodeActivity = CodeActivity;
tslib_1.__decorate([
    (0, components_1.Attribute)(),
    tslib_1.__metadata("design:type", Function)
], CodeActivity.prototype, "handler", void 0);
tslib_1.__decorate([
    (0, components_1.Attribute)(),
    tslib_1.__metadata("design:type", String)
], CodeActivity.prototype, "code", void 0);
tslib_1.__decorate([
    (0, components_1.Attribute)(),
    tslib_1.__metadata("design:type", Number)
], CodeActivity.prototype, "timeout", void 0);
exports.CodeActivity = CodeActivity = tslib_1.__decorate([
    (0, components_1.Directive)({ selector: 'code' })
], CodeActivity);
//# sourceMappingURL=Code.js.map