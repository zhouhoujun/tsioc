"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConditionalActivity = void 0;
const tslib_1 = require("tslib");
const components_1 = require("@tsdi/components");
const Activity_1 = require("./Activity");
let ConditionalActivity = class ConditionalActivity extends Activity_1.Activity {
    async execute(context) {
        return {
            success: Boolean(this.condition),
            data: this.condition
        };
    }
};
exports.ConditionalActivity = ConditionalActivity;
tslib_1.__decorate([
    (0, components_1.Attribute)(),
    tslib_1.__metadata("design:type", Boolean)
], ConditionalActivity.prototype, "condition", void 0);
exports.ConditionalActivity = ConditionalActivity = tslib_1.__decorate([
    (0, components_1.Directive)({
        selector: 'conditional'
    })
], ConditionalActivity);
//# sourceMappingURL=Conditional.js.map