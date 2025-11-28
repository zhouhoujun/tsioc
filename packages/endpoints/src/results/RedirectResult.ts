import { ResultValue } from '@tsdi/core';
import { NotSupportedException } from '@tsdi/common/transport';
import { AbstractRequestContext } from '../AbstractRequestContext';
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
    async sendValue(ctx: AbstractRequestContext) {
        if(!(ctx as RestfulRequestContext).redirect) throw new NotSupportedException();
        return (ctx as RestfulRequestContext).redirect(this.url, this.alt)
    }
}
