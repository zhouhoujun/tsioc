"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EndActivity = void 0;
const tslib_1 = require("tslib");
const components_1 = require("@tsdi/components");
const Activity_1 = require("./Activity");
let EndActivity = class EndActivity extends Activity_1.Activity {
    async execute(context) {
        return {
            success: true,
            data: { endTime: Date.now() }
        };
    }
};
exports.EndActivity = EndActivity;
exports.EndActivity = EndActivity = tslib_1.__decorate([
    (0, components_1.Directive)({ selector: 'end' })
], EndActivity);
//# sourceMappingURL=End.js.map