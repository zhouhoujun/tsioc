import { ResultValue } from '@tsdi/core';
import { AssetContext } from '../AssetContext';


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
    async sendValue(ctx: AssetContext) {
        ctx.contentType = this.contentType;
        ctx.body = this.data || {}
    }
}
