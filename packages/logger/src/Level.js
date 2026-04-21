"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Levels = exports.levels = void 0;
exports.isLevel = isLevel;
exports.matchLevel = matchLevel;
const ioc_1 = require("@tsdi/ioc");
/**
 * levels.
 */
exports.levels = ['log', 'trace', 'debug', 'info', 'warn', 'error', 'fatal'];
/**
 * is level.
 * @param target
 */
function isLevel(target) {
    return (0, ioc_1.isString)(target) && exports.levels.indexOf(target) >= 0;
}
/**
 * match level.
 * @param level
 * @param target
 * @returns
 */
function matchLevel(level, target) {
    const lvstr = (0, ioc_1.isString)(level) ? level : level.levelStr?.toLowerCase();
    return Levels[lvstr] <= ((0, ioc_1.isString)(target) ? Levels[target] : target);
}
/**
 * log levels
 *
 * @export
 * @enum {number}
 */
var Levels;
(function (Levels) {
    Levels[Levels["trace"] = 0] = "trace";
    Levels[Levels["debug"] = 1] = "debug";
    Levels[Levels["info"] = 2] = "info";
    Levels[Levels["warn"] = 3] = "warn";
    Levels[Levels["error"] = 4] = "error";
    Levels[Levels["fatal"] = 5] = "fatal";
})(Levels || (exports.Levels = Levels = {}));
//# sourceMappingURL=Level.js.map