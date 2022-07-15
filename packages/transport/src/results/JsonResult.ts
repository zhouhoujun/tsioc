import { ResultValue } from '@tsdi/core';
import { AssetServerContext } from '../asset.ctx';


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
    async sendValue(ctx: AssetServerContext) {
        ctx.contentType = this.contentType;
        ctx.body = this.data || {}
    }
}
