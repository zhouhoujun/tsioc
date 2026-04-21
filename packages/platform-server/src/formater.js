"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LogHeaderFormater = void 0;
const tslib_1 = require("tslib");
const ioc_1 = require("@tsdi/ioc");
const logger_1 = require("@tsdi/logger");
const chalk = require("chalk");
/**
 * log header formater.
 */
let LogHeaderFormater = class LogHeaderFormater extends logger_1.HeaderFormater {
    format(name, level) {
        return [this.timestamp(new Date()), chalk.green(`[${level}]`), chalk.green(name), chalk.green('-')];
    }
    timestamp(time) {
        return chalk.green(`[${time.toISOString()}]`);
    }
};
exports.LogHeaderFormater = LogHeaderFormater;
exports.LogHeaderFormater = LogHeaderFormater = tslib_1.__decorate([
    (0, ioc_1.Static)()
], LogHeaderFormater);
//# sourceMappingURL=formater.js.map