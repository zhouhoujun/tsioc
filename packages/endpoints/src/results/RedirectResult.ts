import { ResultValue } from '@tsdi/core';
import { NotSupportedExecption } from '@tsdi/common/transport';
import { RequestContext } from '../RequestContext';
import { RestfulRequestContext } from '../RestfulRequestContext';


/**
 * redirect url
 *
 * @export
 * @class RedirectResult
 * @extends {ResultValue}
 */
export class RedirectResult extends ResultValue {
    constructor(private url: string, private alt?: string) {
        super('text/html')
    }
    async sendValue(ctx: RequestContext) {
        if(!(ctx as RestfulRequestContext).redirect) throw new NotSupportedExecption();
        return (ctx as RestfulRequestContext).redirect(this.url, this.alt)
    }
}
