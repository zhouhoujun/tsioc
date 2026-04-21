"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AssignActivity = void 0;
const tslib_1 = require("tslib");
const components_1 = require("@tsdi/components");
const Activity_1 = require("./Activity");
let AssignActivity = class AssignActivity extends Activity_1.Activity {
    constructor() {
        super(...arguments);
        this.values = {};
        this.merge = false;
        this.overwrite = true;
    }
    async execute(context) {
        try {
            const currentVars = context.variables || {};
            if (this.merge) {
                context.variables = this.overwrite
                    ? { ...currentVars, ...this.values }
                    : { ...this.values, ...currentVars };
            }
            else {
                if (this.overwrite) {
                    context.variables = { ...this.values };
                }
                else {
                    context.variables = { ...this.values, ...currentVars };
                }
            }
            return {
                success: true,
                data: {
                    variables: context.variables,
                    assigned: Object.keys(this.values)
                }
            };
        }
        catch (error) {
            return {
                success: false,
                error: error,
                data: { values: this.values }
            };
        }
    }
};
exports.AssignActivity = AssignActivity;
tslib_1.__decorate([
    (0, components_1.Attribute)(),
    tslib_1.__metadata("design:type", Object)
], AssignActivity.prototype, "values", void 0);
tslib_1.__decorate([
    (0, components_1.Attribute)(),
    tslib_1.__metadata("design:type", Boolean)
], AssignActivity.prototype, "merge", void 0);
tslib_1.__decorate([
    (0, components_1.Attribute)(),
    tslib_1.__metadata("design:type", Boolean)
], AssignActivity.prototype, "overwrite", void 0);
exports.AssignActivity = AssignActivity = tslib_1.__decorate([
    (0, components_1.Directive)({ selector: 'assign' })
], AssignActivity);
//# sourceMappingURL=Assign.js.map