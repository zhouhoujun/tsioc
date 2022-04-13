import { ResultValue } from '@tsdi/core';
import { WritableHttpResponse } from '../response';

/**
 * redirect url
 *
 * @export
 * @class RedirectResult
 * @extends {ResultValue}
 */
export class RedirectResult extends ResultValue {
    constructor(private url: string, private alt?: string) {
        super('text/html');
    }
    async sendValue(resp: WritableHttpResponse) {
        return resp.redirect(this.url, this.alt);
    }
}
