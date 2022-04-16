import { ResultValue } from '@tsdi/core';
import { HttpServerResponse } from '../response';


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
    async sendValue(resp: HttpServerResponse) {
        resp.contentType = this.contentType;
        resp.body = this.data || {};
    }
}
