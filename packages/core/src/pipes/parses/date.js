"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DatePipe = void 0;
const tslib_1 = require("tslib");
const ioc_1 = require("@tsdi/ioc");
const metadata_1 = require("../../metadata");
const pipe_1 = require("../pipe");
/**
 * date parse pipe.
 */
let DatePipe = class DatePipe {
    transform(value, ...args) {
        let date = null;
        if ((0, ioc_1.isString)(value) || (0, ioc_1.isNumber)(value)) {
            try {
                date = new Date(value);
            }
            catch {
                throw (0, pipe_1.invalidPipeArgument)(this, value);
            }
        }
        else if ((0, ioc_1.isDate)(value)) {
            date = value;
        }
        if ((0, ioc_1.isDate)(date)) {
            return date;
        }
        else {
            throw (0, pipe_1.invalidPipeArgument)(this, value);
        }
    }
};
exports.DatePipe = DatePipe;
exports.DatePipe = DatePipe = tslib_1.__decorate([
    (0, metadata_1.Pipe)('date')
], DatePipe);
//# sourceMappingURL=date.js.map