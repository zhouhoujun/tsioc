import { ResultValue } from '@tsdi/core';
import { AssetServerContext } from '../asset.ctx';
import { Stream } from 'stream';
import { hdr } from '../../consts';

/**
 * EventStream Result
 *
 * @export
 * @class EventStreamResult
 * @extends {ResultValue}
 */
export class EventStreamResult extends ResultValue {
    constructor(private message: string | Buffer | Stream) {
        super('text/event-stream')
    }
    async sendValue(ctx: AssetServerContext) {
        ctx.contentType = this.contentType;
        ctx.setHeader(hdr.CACHE_CONTROL, "no-cache");
        ctx.setHeader(hdr.CONNECTION, "keep-alive");
        ctx.setHeader(hdr.X_ACCEL_BUFFERING, "no");
        ctx.body = this.message;
    }
}
