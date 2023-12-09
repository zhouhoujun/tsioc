import { ResultValue } from '@tsdi/core';
import { ctype } from '@tsdi/common';
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
        super(ctype.APPL_JSON)
    }
    async sendValue(ctx: TransportContext) {
        ctx.contentType = this.contentType;
        ctx.body = this.data || {}
    }
}
