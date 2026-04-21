"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.JsonFormatPipe = void 0;
const tslib_1 = require("tslib");
const metadata_1 = require("../../metadata");
/**
 * json stringify.
 */
let JsonFormatPipe = class JsonFormatPipe {
    /**
     * @param value A value of any type to convert into a JSON-format string.
     */
    transform(value) {
        return JSON.stringify(value, null, 2);
    }
};
exports.JsonFormatPipe = JsonFormatPipe;
exports.JsonFormatPipe = JsonFormatPipe = tslib_1.__decorate([
    (0, metadata_1.Pipe)('json-format')
], JsonFormatPipe);
//# sourceMappingURL=json.js.map