import { ResultValue } from '@tsdi/core';
import { WritableHttpResponse } from '../response';


/**
 * controller method return result type of json.
 * context type 'application/json'
 *
 * @export
 * @class JsonResult
 */
export class JsonResult extends ResultValue {
    constructor(private data: object) {
        super('application/json');
    }
    async sendValue(resp: WritableHttpResponse) {
        resp.contentType = this.contentType;
        resp.body = this.data || {};
    }
}
