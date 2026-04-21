"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StartActivity = void 0;
const tslib_1 = require("tslib");
const components_1 = require("@tsdi/components");
const Activity_1 = require("./Activity");
let StartActivity = class StartActivity extends Activity_1.Activity {
    async execute(context) {
        return {
            success: true,
            data: { startTime: Date.now() }
        };
    }
};
exports.StartActivity = StartActivity;
exports.StartActivity = StartActivity = tslib_1.__decorate([
    (0, components_1.Directive)({ selector: 'start' })
], StartActivity);
//# sourceMappingURL=Start.js.map