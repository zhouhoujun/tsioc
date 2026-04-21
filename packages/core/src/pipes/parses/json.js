"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.JsonPipe = void 0;
const tslib_1 = require("tslib");
const ioc_1 = require("@tsdi/ioc");
const metadata_1 = require("../../metadata");
const pipe_1 = require("../pipe");
/**
 * parse json.
 */
let JsonPipe = class JsonPipe {
    /**
     * @param value A value of any type to convert into a JSON-format string.
     */
    transform(value, length) {
        if ((0, ioc_1.isNil)(value))
            throw (0, pipe_1.invalidPipeArgument)(this, value);
        if ((0, ioc_1.isString)(value)) {
            if (length && value.length > length) {
                throw (0, pipe_1.invalidPipeArgument)(this, value, 'more than max lenght:' + length);
            }
            try {
                return JSON.parse(value);
            }
            catch (err) {
                throw (0, pipe_1.invalidPipeArgument)(this, value, err.toString());
            }
        }
        return value;
    }
};
exports.JsonPipe = JsonPipe;
exports.JsonPipe = JsonPipe = tslib_1.__decorate([
    (0, metadata_1.Pipe)('json')
], JsonPipe);
//# sourceMappingURL=json.js.map