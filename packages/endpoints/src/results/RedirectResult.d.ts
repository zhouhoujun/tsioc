import { ResultValue } from '@tsdi/core';
import { RequestContext } from '@tsdi/common';
/**
 * redirect url
 *
 * @export
 * @class RedirectResult
 * @extends {ResultValue}
 */
export declare class RedirectResult extends ResultValue {
    private url;
    private referrer?;
    private alt?;
    constructor(url: string, referrer?: string | undefined, alt?: string | undefined);
    sendValue(ctx: RequestContext): Promise<import("@tsdi/common").Outgoing<any, any> | undefined>;
}
