"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SubProcessActivity = void 0;
const tslib_1 = require("tslib");
const components_1 = require("@tsdi/components");
const Activity_1 = require("./Activity");
let SubProcessActivity = class SubProcessActivity extends Activity_1.Activity {
    constructor() {
        super(...arguments);
        this.waitForComplete = true;
    }
    async execute(context) {
        if (!this.workflow && !this.workflowId) {
            return {
                success: false,
                error: new Error('No workflow or workflowId provided')
            };
        }
        const workflowToExecute = this.workflow || { id: this.workflowId, nodes: [], connections: [] };
        return {
            success: true,
            data: {
                workflowId: workflowToExecute.id,
                inputs: this.inputs || context,
                executed: true
            }
        };
    }
};
exports.SubProcessActivity = SubProcessActivity;
tslib_1.__decorate([
    (0, components_1.Attribute)(),
    tslib_1.__metadata("design:type", Object)
], SubProcessActivity.prototype, "workflow", void 0);
tslib_1.__decorate([
    (0, components_1.Attribute)(),
    tslib_1.__metadata("design:type", String)
], SubProcessActivity.prototype, "workflowId", void 0);
tslib_1.__decorate([
    (0, components_1.Attribute)(),
    tslib_1.__metadata("design:type", Object)
], SubProcessActivity.prototype, "inputs", void 0);
tslib_1.__decorate([
    (0, components_1.Attribute)(),
    tslib_1.__metadata("design:type", Boolean)
], SubProcessActivity.prototype, "waitForComplete", void 0);
exports.SubProcessActivity = SubProcessActivity = tslib_1.__decorate([
    (0, components_1.Directive)({ selector: 'subprocess' })
], SubProcessActivity);
//# sourceMappingURL=SubProcess.js.map