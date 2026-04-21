"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.invalidPipeArgument = invalidPipeArgument;
const ioc_1 = require("@tsdi/ioc");
/**
 * invalid pipe argument error.
 * @param type
 * @param value
 * @param message
 * @returns
 */
function invalidPipeArgument(type, value, message) {
    return new ioc_1.ArgumentException(`InvalidPipeArgument: '${value}' for pipe '${(0, ioc_1.getDef)((0, ioc_1.getType)(type)).selector}'${message || ''}`);
}
//# sourceMappingURL=pipe.js.map