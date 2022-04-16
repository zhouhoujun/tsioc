import { ResultValue } from '@tsdi/core';
import { HttpServerResponse } from '../response';

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
    async sendValue(resp: HttpServerResponse) {
        resp.contentType = this.contentType;
        await resp.write(this.message);
    }
}