"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.JsonResult = void 0;
const core_1 = require("@tsdi/core");
/**
 * controller method return result type of json.
 * context type 'application/json'
 *
 * @export
 * @class JsonResult
 */
class JsonResult extends core_1.ResultValue {
    constructor(data) {
        super('application/json');
        this.data = data;
    }
    async sendValue(ctx) {
        ctx.contentType = this.contentType;
        ctx.body = this.data || {};
    }
}
exports.JsonResult = JsonResult;
//# sourceMappingURL=JsonResult.js.map