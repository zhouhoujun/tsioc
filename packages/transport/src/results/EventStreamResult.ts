import { ResultValue } from '@tsdi/core';
import { AssetServerContext } from '../asset.ctx';

/**
 * EventStream Result
 *
 * @export
 * @class EventStreamResult
 * @extends {ResultValue}
 */
export class EventStreamResult extends ResultValue {
    constructor(private message: string) {
        super('text/event-stream')
    }
    async sendValue(ctx: AssetServerContext) {
        ctx.contentType = this.contentType;
        await ctx.write(this.message)
    }
}