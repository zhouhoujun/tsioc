import { HttpContext } from '../context';
import { ResultValue } from './ResultValue';

/**
 * EventStream Result
 *
 * @export
 * @class EventStreamResult
 * @extends {ResultValue}
 */
export class EventStreamResult extends ResultValue {
    constructor(private message: string) {
        super('text/event-stream');
    }
    async sendValue(ctx: HttpContext) {
        await ctx.write(this.message);
    }
}