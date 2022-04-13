import { ResultValue } from '@tsdi/core';
import { WritableHttpResponse } from '../response';

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
    async sendValue(resp: WritableHttpResponse) {
        resp.contentType = this.contentType;
        await resp.write(this.message);
    }
}