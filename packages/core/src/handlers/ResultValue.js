"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ResultValue = void 0;
const tslib_1 = require("tslib");
const ioc_1 = require("@tsdi/ioc");
/**
 * route mapping return result.
 *
 * @export
 * @abstract
 * @class ResultValue
 */
let ResultValue = class ResultValue {
    constructor(contentType) {
        this.contentType = contentType;
    }
};
exports.ResultValue = ResultValue;
exports.ResultValue = ResultValue = tslib_1.__decorate([
    (0, ioc_1.Abstract)(),
    tslib_1.__metadata("design:paramtypes", [String])
], ResultValue);
//# sourceMappingURL=ResultValue.js.map