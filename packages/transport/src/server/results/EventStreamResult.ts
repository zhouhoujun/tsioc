import { ResultValue } from '@tsdi/core';
import { hdr } from '../../consts';
import { IStream } from '../../stream';
import { AssetContext } from '../../context';

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
    async sendValue(ctx: AssetContext) {
        ctx.contentType = this.contentType;
        ctx.setHeader(hdr.CACHE_CONTROL, "no-cache");
        ctx.setHeader(hdr.CONNECTION, "keep-alive");
        ctx.setHeader(hdr.X_ACCEL_BUFFERING, "no");
        ctx.body = this.message;
    }
}
