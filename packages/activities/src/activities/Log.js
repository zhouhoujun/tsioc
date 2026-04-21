"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LogActivity = void 0;
const tslib_1 = require("tslib");
const components_1 = require("@tsdi/components");
const Activity_1 = require("./Activity");
let LogActivity = class LogActivity extends Activity_1.Activity {
    constructor() {
        super(...arguments);
        this.level = 'info';
        this.message = '';
        this.includeTimestamp = true;
        this.includeContext = false;
    }
    async execute(context) {
        try {
            const timestamp = this.includeTimestamp ? `[${new Date().toISOString()}] ` : '';
            const logMessage = this.formatMessage(timestamp);
            const logger = context.logger || console;
            const logFn = logger[this.level] || logger.info;
            if (this.data !== undefined) {
                logFn.call(logger, logMessage, this.data);
            }
            else {
                logFn.call(logger, logMessage);
            }
            if (this.includeContext) {
                logFn.call(logger, 'Context:', context);
            }
            return {
                success: true,
                data: {
                    logged: true,
                    level: this.level,
                    message: logMessage,
                    timestamp: new Date().toISOString()
                }
            };
        }
        catch (error) {
            return {
                success: false,
                error: error
            };
        }
    }
    formatMessage(timestamp) {
        const levelPrefix = `[${this.level.toUpperCase()}]`;
        return `${timestamp}${levelPrefix} ${this.message}`;
    }
};
exports.LogActivity = LogActivity;
tslib_1.__decorate([
    (0, components_1.Attribute)(),
    tslib_1.__metadata("design:type", String)
], LogActivity.prototype, "level", void 0);
tslib_1.__decorate([
    (0, components_1.Attribute)(),
    tslib_1.__metadata("design:type", String)
], LogActivity.prototype, "message", void 0);
tslib_1.__decorate([
    (0, components_1.Attribute)(),
    tslib_1.__metadata("design:type", Object)
], LogActivity.prototype, "data", void 0);
tslib_1.__decorate([
    (0, components_1.Attribute)(),
    tslib_1.__metadata("design:type", Boolean)
], LogActivity.prototype, "includeTimestamp", void 0);
tslib_1.__decorate([
    (0, components_1.Attribute)(),
    tslib_1.__metadata("design:type", Boolean)
], LogActivity.prototype, "includeContext", void 0);
exports.LogActivity = LogActivity = tslib_1.__decorate([
    (0, components_1.Directive)({ selector: 'log' })
], LogActivity);
//# sourceMappingURL=Log.js.map