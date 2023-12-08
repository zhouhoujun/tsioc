import { ResultValue } from '@tsdi/core';
import { TransportContext } from '../TransportContext';


/**
 * controller method return result type of json.
 * context type 'application/json'
 *
 * @export
 * @class JsonResult
 */
export class JsonResult extends ResultValue {
    constructor(private data: object) {
        super('application/json')
    }
    async sendValue(ctx: TransportContext) {
        ctx.contentType = this.contentType;
        ctx.body = this.data || {}
    }
}
