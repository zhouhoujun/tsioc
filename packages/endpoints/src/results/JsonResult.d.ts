import { ResultValue } from '@tsdi/core';
import { RestfulRequestContext } from '../RestfulRequestContext';
/**
 * controller method return result type of json.
 * context type 'application/json'
 *
 * @export
 * @class JsonResult
 */
export declare class JsonResult extends ResultValue {
    private data;
    constructor(data: object);
    sendValue(ctx: RestfulRequestContext): Promise<void>;
}
