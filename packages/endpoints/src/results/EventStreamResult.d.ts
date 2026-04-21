import { ResultValue } from '@tsdi/core';
import { IStream } from '@tsdi/common';
import { RestfulRequestContext } from '../RestfulRequestContext';
/**
 * EventStream Result
 *
 * @export
 * @class EventStreamResult
 * @extends {ResultValue}
 */
export declare class EventStreamResult extends ResultValue {
    private message;
    constructor(message: string | Buffer | IStream);
    sendValue(ctx: RestfulRequestContext): Promise<void>;
}
