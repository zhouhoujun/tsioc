"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventStreamResult = void 0;
const core_1 = require("@tsdi/core");
/**
 * EventStream Result
 *
 * @export
 * @class EventStreamResult
 * @extends {ResultValue}
 */
class EventStreamResult extends core_1.ResultValue {
    constructor(message) {
        super('text/event-stream');
        this.message = message;
    }
    async sendValue(ctx) {
        ctx.contentType = this.contentType;
        ctx.setHeader('cache-control', "no-cache");
        ctx.setHeader('connection', "keep-alive");
        ctx.setHeader('x-accel-buffering', "no");
        ctx.body = this.message;
    }
}
exports.EventStreamResult = EventStreamResult;
//# sourceMappingURL=EventStreamResult.js.map