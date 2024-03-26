import { ResultValue } from '@tsdi/core';
import { IStream } from '@tsdi/common/transport';
import { RestfulRequestContext } from '../RestfulRequestContext';

/**
 * EventStream Result
 *
 * @export
 * @class EventStreamResult
 * @extends {ResultValue}
 */
export class EventStreamResult extends ResultValue {
    constructor(private message: string | Buffer | IStream) {
        super('text/event-stream')
    }
    async sendValue(ctx: RestfulRequestContext) {
        ctx.contentType = this.contentType;
        ctx.setHeader('cache-control', "no-cache");
        ctx.setHeader('connection', "keep-alive");
        ctx.setHeader('x-accel-buffering', "no");
        ctx.body = this.message;
    }
}
