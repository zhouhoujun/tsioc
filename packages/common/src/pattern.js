"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.defaultFormatter = exports.PatternFormatter = void 0;
exports.patternToPath = patternToPath;
const tslib_1 = require("tslib");
const ioc_1 = require("@tsdi/ioc");
const utils_1 = require("./utils");
/**
 * pattern formatter.
 */
let PatternFormatter = class PatternFormatter {
};
exports.PatternFormatter = PatternFormatter;
exports.PatternFormatter = PatternFormatter = tslib_1.__decorate([
    (0, ioc_1.Abstract)()
], PatternFormatter);
exports.defaultFormatter = {
    format: (pattern) => (0, utils_1.normalize)(patternToPath(pattern))
};
/**
 * Transforms the Pattern to Route.
 * 1. If Pattern is a `string`, it will be returned as it is.
 * 2. If Pattern is a `number`, it will be converted to `string`.
 * 3. If Pattern is a `JSON` object, it will be transformed to Route. For that end,
 * the function will sort properties of `JSON` Object and creates `route` string
 * according to the following template:
 * <key1>:<value1>/<key2>:<value2>/.../<keyN>:<valueN>
 *
 * @param  {Pattern} pattern - client pattern
 * @returns string
 */
function patternToPath(pattern, joinby = '/', keyValueJoin = ':') {
    if (pattern == undefined)
        return '';
    if ((0, ioc_1.isString)(pattern)) {
        return pattern;
    }
    if ((0, ioc_1.isNumber)(pattern)) {
        return `${pattern}`;
    }
    if ((0, ioc_1.isRegExp)(pattern)) {
        return pattern.source;
    }
    if (!(0, ioc_1.isPlainObject)(pattern)) {
        return pattern;
    }
    const sortedKeys = Object.keys(pattern).sort((a, b) => a.localeCompare(b));
    // Creates the array of Pattern params from sorted keys and their corresponding values
    return sortedKeys.map(key => {
        let value = pattern[key];
        value = (0, ioc_1.isString)(value)
            ? `${patternToPath(value)}`
            : patternToPath(value);
        return `${key}${keyValueJoin}${value}`;
    }).join(joinby);
}
//# sourceMappingURL=pattern.js.map